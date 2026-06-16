import { N } from './parser.js';

export class RuntimeError extends Error {
  constructor(msg, line) {
    super(msg);
    this.line = line;
  }
}

class BreakSignal {}
class ReturnSignal { constructor(value) { this.value = value; } }
class ExitSignal {}

export class Executor {
  constructor(turtle, renderer, options = {}) {
    this.turtle = turtle;
    this.renderer = renderer;
    this.onStep = options.onStep ?? (() => {});   // called after each visual op
    this.onPrint = options.onPrint ?? (() => {});
    this.onMessage = options.onMessage ?? (msg => alert(msg));
    this.onAsk = options.onAsk ?? (msg => prompt(msg) ?? '');
    this.onResize = options.onResize ?? null;
    this.abortSignal = options.abortSignal ?? null;
    this.env = [{}];   // scope stack
    this.functions = {};
  }

  checkAbort() {
    if (this.abortSignal?.aborted) throw new ExitSignal();
  }

  // Variable scoping
  getVar(name) {
    for (let i = this.env.length - 1; i >= 0; i--) {
      if (name in this.env[i]) return this.env[i][name];
    }
    return 0; // undefined variables default to 0 (KTurtle behaviour)
  }

  setVar(name, value) {
    // Set in innermost scope that already has it, or current scope
    for (let i = this.env.length - 1; i >= 0; i--) {
      if (name in this.env[i]) { this.env[i][name] = value; return; }
    }
    this.env[this.env.length - 1][name] = value;
  }

  pushScope() { this.env.push({}); }
  popScope() { this.env.pop(); }

  async run(ast) {
    this.env = [{}];
    this.functions = {};
    try {
      await this.execBlock(ast.body);
    } catch (e) {
      if (e instanceof ExitSignal) return;
      throw e;
    }
  }

  async execBlock(stmts) {
    for (const stmt of stmts) {
      this.checkAbort();
      await this.execStmt(stmt);
    }
  }

  async execStmt(node) {
    this.checkAbort();
    switch (node.type) {
      case N.ASSIGN: {
        const val = await this.evalExpr(node.value);
        this.setVar(node.name, val);
        break;
      }
      case N.CMD:
        await this.execCmd(node);
        break;
      case N.IF: {
        const cond = await this.evalExpr(node.cond);
        if (isTruthy(cond)) {
          this.pushScope();
          try { await this.execBlock(node.then.body); }
          finally { this.popScope(); }
        } else if (node.else) {
          this.pushScope();
          try { await this.execBlock(node.else.body); }
          finally { this.popScope(); }
        }
        break;
      }
      case N.REPEAT: {
        const count = Math.round(await this.evalExpr(node.count));
        for (let i = 0; i < count; i++) {
          this.checkAbort();
          this.pushScope();
          try { await this.execBlock(node.body.body); }
          catch (e) { this.popScope(); if (e instanceof BreakSignal) break; throw e; }
          this.popScope();
        }
        break;
      }
      case N.WHILE: {
        while (isTruthy(await this.evalExpr(node.cond))) {
          this.checkAbort();
          this.pushScope();
          try { await this.execBlock(node.body.body); }
          catch (e) { this.popScope(); if (e instanceof BreakSignal) break; throw e; }
          this.popScope();
        }
        break;
      }
      case N.FOR: {
        const from = await this.evalExpr(node.from);
        const to = await this.evalExpr(node.to);
        const step = node.step ? await this.evalExpr(node.step) : (from <= to ? 1 : -1);
        for (let v = from; step > 0 ? v <= to : v >= to; v += step) {
          this.checkAbort();
          this.pushScope();
          this.env[this.env.length - 1][node.name] = v;
          try { await this.execBlock(node.body.body); }
          catch (e) { this.popScope(); if (e instanceof BreakSignal) break; throw e; }
          this.popScope();
        }
        break;
      }
      case N.LEARN:
        this.functions[node.name] = node;
        break;
      case N.CALL:
        await this.callFunction(node.name, node.args, node.line);
        break;
      case N.RETURN:
        throw new ReturnSignal(node.value ? await this.evalExpr(node.value) : null);
      case N.BREAK:
        throw new BreakSignal();
      case N.EXIT:
        throw new ExitSignal();
      case N.WAIT: {
        const secs = await this.evalExpr(node.value);
        await sleep(secs * 1000);
        break;
      }
      case N.ASSERT: {
        const val = await this.evalExpr(node.value);
        if (!isTruthy(val))
          throw new RuntimeError('Assertion failed', node.line);
        break;
      }
      default:
        throw new RuntimeError(`Unknown statement type: ${node.type}`, node.line);
    }
  }

  async execCmd(node) {
    const t = this.turtle;
    const r = this.renderer;
    const args = [];
    for (const a of node.args) args.push(await this.evalExpr(a));

    switch (node.cmd) {
      case 'Forward': { const seg = t.moveForward(args[0]); r.drawSegment(seg); break; }
      case 'Backward': { const seg = t.moveBackward(args[0]); r.drawSegment(seg); break; }
      case 'TurnLeft': t.turnLeft(args[0]); break;
      case 'TurnRight': t.turnRight(args[0]); break;
      case 'Direction': t.setDirection(args[0]); break;
      case 'Center': t.goToCenter(); break;
      case 'Go': t.goTo(args[0], args[1]); break;
      case 'GoX': t.goX(args[0]); break;
      case 'GoY': t.goY(args[0]); break;
      case 'PenUp': t.penDown = false; break;
      case 'PenDown': t.penDown = true; break;
      case 'PenWidth': t.setPenWidth(args[0]); break;
      case 'PenColor': t.setPenColor(args[0], args[1], args[2]); break;
      case 'CanvasColor': t.setCanvasColor(args[0], args[1], args[2]);
                          r.clearCanvas(t.canvasColorStr); break;
      case 'CanvasSize':
        t.canvasW = args[0]; t.canvasH = args[1];
        r.resize(args[0], args[1]);
        r.clearCanvas(t.canvasColorStr);
        if (this.onResize) this.onResize(args[0], args[1]);
        break;
      case 'SpriteShow': t.visible = true; break;
      case 'SpriteHide': t.visible = false; break;
      case 'Clear': r.clearCanvas(t.canvasColorStr); break;
      case 'Reset':
        t.reset();
        r.resize(t.canvasW, t.canvasH);
        r.clearCanvas(t.canvasColorStr);
        if (this.onResize) this.onResize();
        break;
      case 'Print':
        r.printText(t.x, t.y, args[0], t.fontSize, t.penColorStr);
        break;
      case 'FontSize': t.setFontSize(args[0]); break;
      case 'Message': this.onMessage(String(args[0])); break;
      case 'Ask': {
        const ans = await this.onAsk(String(args[0]));
        // result goes nowhere as a statement; for expression context use Ask
        break;
      }
      default:
        throw new RuntimeError(`Unknown command: ${node.cmd}`, node.line);
    }

    r.drawTurtle(t);
    await this.onStep(node.line);
  }

  async callFunction(name, argExprs, line) {
    const fn = this.functions[name];
    if (!fn) throw new RuntimeError(`Unknown function: ${name}`, line);
    const args = [];
    for (const a of argExprs) args.push(await this.evalExpr(a));
    this.pushScope();
    for (let i = 0; i < fn.params.length; i++) {
      this.env[this.env.length - 1][fn.params[i]] = args[i] ?? 0;
    }
    let result = null;
    try {
      await this.execBlock(fn.body.body);
    } catch (e) {
      if (e instanceof ReturnSignal) result = e.value;
      else { this.popScope(); throw e; }
    }
    this.popScope();
    return result;
  }

  async evalExpr(node) {
    switch (node.type) {
      case N.NUM: return node.value;
      case N.STR: return node.value;
      case N.BOOL: return node.value;
      case N.VAR: return this.getVar(node.name);
      case N.BINOP: {
        const l = await this.evalExpr(node.left);
        const r = await this.evalExpr(node.right);
        switch (node.op) {
          case '+': return typeof l === 'string' || typeof r === 'string'
            ? String(l) + String(r) : l + r;
          case '-': return l - r;
          case '*': return l * r;
          case '/': if (r === 0) throw new RuntimeError('Division by zero', node.line);
                    return l / r;
          case '^': return Math.pow(l, r);
          case '==': return l === r;
          case '!=': return l !== r;
          case '<': return l < r;
          case '>': return l > r;
          case '<=': return l <= r;
          case '>=': return l >= r;
          case 'and': return isTruthy(l) && isTruthy(r);
          case 'or': return isTruthy(l) || isTruthy(r);
        }
        break;
      }
      case N.UNOP:
        if (node.op === '-') return -(await this.evalExpr(node.operand));
        if (node.op === 'not') return !isTruthy(await this.evalExpr(node.operand));
        break;
      case N.FUNC:
        return await this.evalFunc(node);
      case N.CALL:
        return await this.callFunction(node.name, node.args, node.line) ?? 0;
      default:
        throw new RuntimeError(`Unknown expression type: ${node.type}`, node.line);
    }
  }

  async evalFunc(node) {
    const args = [];
    for (const a of node.args) args.push(await this.evalExpr(a));
    const t = this.turtle;
    switch (node.func) {
      case 'GetX': return t.x;
      case 'GetY': return t.y;
      case 'GetDirection': return t.direction;
      case 'Pi': return Math.PI;
      case 'Random': return Math.floor(Math.random() * (args[1] - args[0] + 1)) + args[0];
      case 'Round': return Math.round(args[0]);
      case 'Sqrt': if (args[0] < 0) throw new RuntimeError("Can't sqrt a negative number", node.line);
                   return Math.sqrt(args[0]);
      case 'Mod': return args[0] % args[1];
      case 'Sin': return Math.sin(args[0] * Math.PI / 180);
      case 'Cos': return Math.cos(args[0] * Math.PI / 180);
      case 'Tan': return Math.tan(args[0] * Math.PI / 180);
      case 'ArcSin': return Math.asin(args[0]) * 180 / Math.PI;
      case 'ArcCos': return Math.acos(args[0]) * 180 / Math.PI;
      case 'ArcTan': return Math.atan(args[0]) * 180 / Math.PI;
      case 'Ask': return await this.onAsk(String(args[0]));
      default:
        throw new RuntimeError(`Unknown function: ${node.func}`, node.line);
    }
  }
}

function isTruthy(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v !== '';
  return !!v;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
