import { T } from './lexer.js';
import { STMT_CMDS, EXPR_FUNCS, ARITY } from '../i18n/index.js';

export class ParseError extends Error {
  constructor(msg, token) {
    super(msg);
    this.line = token?.line;
    this.col = token?.col;
    this.token = token;
  }
}

// AST node types
export const N = {
  PROGRAM: 'PROGRAM', BLOCK: 'BLOCK',
  ASSIGN: 'ASSIGN', IF: 'IF', REPEAT: 'REPEAT',
  WHILE: 'WHILE', FOR: 'FOR', LEARN: 'LEARN',
  RETURN: 'RETURN', BREAK: 'BREAK', EXIT: 'EXIT',
  WAIT: 'WAIT', ASSERT: 'ASSERT',
  CMD: 'CMD',          // built-in statement command
  CALL: 'CALL',        // user-defined function call
  FUNC: 'FUNC',        // built-in expression function
  VAR: 'VAR', NUM: 'NUM', STR: 'STR', BOOL: 'BOOL',
  BINOP: 'BINOP', UNOP: 'UNOP',
};

export class Parser {
  constructor(tokens) {
    this.tokens = tokens.filter(t => t.type !== T.NEWLINE);
    this.pos = 0;
  }

  peek(offset = 0) { return this.tokens[this.pos + offset]; }
  advance() { return this.tokens[this.pos++]; }

  check(type) { return this.peek()?.type === type; }

  eat(type) {
    const tok = this.peek();
    if (tok?.type !== type) throw new ParseError(`Expected '${type}', got '${tok?.type}' ('${tok?.value}')`, tok);
    return this.advance();
  }

  atEnd() { return this.peek()?.type === T.EOF; }

  // Check if current token starts a statement (not an expression continuation)
  atStatementBoundary() {
    const t = this.peek();
    if (!t || t.type === T.EOF || t.type === T.RBRACE) return true;
    if (STMT_CMDS.has(t.type)) return true;
    if (['If', 'Repeat', 'While', 'For', 'Learn', 'Return', 'Break',
         'Exit', 'Wait', 'Assert'].includes(t.type)) return true;
    if (t.type === T.VARIABLE && this.peek(1)?.type === T.ASSIGN) return true;
    if (t.type === T.IDENTIFIER) return true; // user function call
    return false;
  }

  parse() {
    const stmts = this.parseStatements();
    return { type: N.PROGRAM, body: stmts };
  }

  parseStatements() {
    const stmts = [];
    while (!this.atEnd() && !this.check(T.RBRACE)) {
      stmts.push(this.parseStatement());
    }
    return stmts;
  }

  parseStatement() {
    const tok = this.peek();

    // Assignment: $var = expr
    if (tok.type === T.VARIABLE && this.peek(1)?.type === T.ASSIGN) {
      return this.parseAssignment();
    }

    // Control flow
    if (tok.type === 'If') return this.parseIf();
    if (tok.type === 'Repeat') return this.parseRepeat();
    if (tok.type === 'While') return this.parseWhile();
    if (tok.type === 'For') return this.parseFor();
    if (tok.type === 'Learn') return this.parseLearn();
    if (tok.type === 'Return') {
      const t = this.advance();
      const val = this.atStatementBoundary() ? null : this.parseExpr();
      return { type: N.RETURN, value: val, line: t.line };
    }
    if (tok.type === 'Break') {
      const t = this.advance();
      return { type: N.BREAK, line: t.line };
    }
    if (tok.type === 'Exit') {
      const t = this.advance();
      return { type: N.EXIT, line: t.line };
    }
    if (tok.type === 'Wait') {
      const t = this.advance();
      return { type: N.WAIT, value: this.parseExpr(), line: t.line };
    }
    if (tok.type === 'Assert') {
      const t = this.advance();
      return { type: N.ASSERT, value: this.parseExpr(), line: t.line };
    }

    // Built-in statement command
    if (STMT_CMDS.has(tok.type)) {
      return this.parseCmd();
    }

    // User-defined function call
    if (tok.type === T.IDENTIFIER) {
      return this.parseUserCall();
    }

    throw new ParseError(`Unexpected token '${tok.value ?? tok.type}'`, tok);
  }

  parseAssignment() {
    const varTok = this.advance(); // $var
    this.eat(T.ASSIGN);
    const value = this.parseExpr();
    return { type: N.ASSIGN, name: varTok.value, value, line: varTok.line };
  }

  parseIf() {
    const tok = this.advance(); // 'If'
    const cond = this.parseExpr();
    const then = this.parseBlock();
    let els = null;
    if (this.peek()?.type === 'Else') {
      this.advance();
      els = this.parseBlock();
    }
    return { type: N.IF, cond, then, else: els, line: tok.line };
  }

  parseRepeat() {
    const tok = this.advance();
    const count = this.parseExpr();
    const body = this.parseBlock();
    return { type: N.REPEAT, count, body, line: tok.line };
  }

  parseWhile() {
    const tok = this.advance();
    const cond = this.parseExpr();
    const body = this.parseBlock();
    return { type: N.WHILE, cond, body, line: tok.line };
  }

  parseFor() {
    const tok = this.advance();
    const varTok = this.eat(T.VARIABLE);
    this.eat(T.ASSIGN);
    const from = this.parseExpr();
    this.eat('To');
    const to = this.parseExpr();
    let step = null;
    if (this.peek()?.type === 'Step') {
      this.advance();
      step = this.parseExpr();
    }
    const body = this.parseBlock();
    return { type: N.FOR, name: varTok.value, from, to, step, body, line: tok.line };
  }

  parseLearn() {
    const tok = this.advance();
    const nameTok = this.peek();
    if (nameTok.type !== T.IDENTIFIER)
      throw new ParseError('Expected function name after learn', nameTok);
    this.advance();
    let params = [];
    if (this.check(T.LPAREN)) {
      // Extension syntax: learn name($p1, $p2) { }
      this.advance();
      if (!this.check(T.RPAREN)) {
        params.push(this.eat(T.VARIABLE).value);
        while (this.check(T.COMMA)) {
          this.advance();
          params.push(this.eat(T.VARIABLE).value);
        }
      }
      this.eat(T.RPAREN);
    } else {
      // KTurtle-compatible syntax: learn name $p1, $p2 { }
      if (this.check(T.VARIABLE)) {
        params.push(this.advance().value);
        while (this.check(T.COMMA)) {
          this.advance();
          params.push(this.eat(T.VARIABLE).value);
        }
      }
    }
    const body = this.parseBlock();
    return { type: N.LEARN, name: nameTok.value, params, body, line: tok.line };
  }

  parseCmd() {
    const tok = this.advance();
    const arity = ARITY[tok.type] ?? 0;
    const args = [];
    for (let i = 0; i < arity; i++) {
      if (i > 0 && this.check(T.COMMA)) this.advance(); // optional comma
      args.push(this.parseExpr());
    }
    return { type: N.CMD, cmd: tok.type, args, line: tok.line };
  }

  parseUserCall() {
    const tok = this.advance();
    let args = [];
    if (this.check(T.LPAREN)) {
      // Extension syntax: name(arg1, arg2)
      this.advance();
      if (!this.check(T.RPAREN)) {
        args.push(this.parseExpr());
        while (this.check(T.COMMA)) {
          this.advance();
          args.push(this.parseExpr());
        }
      }
      this.eat(T.RPAREN);
    } else {
      // KTurtle-compatible syntax: name arg1, arg2
      // Parse expressions until we hit a statement boundary
      while (!this.atStatementBoundary() && !this.atEnd()) {
        args.push(this.parseExpr());
        if (this.check(T.COMMA)) this.advance();
      }
    }
    return { type: N.CALL, name: tok.value, args, line: tok.line };
  }

  parseBlock() {
    this.eat(T.LBRACE);
    const stmts = this.parseStatements();
    this.eat(T.RBRACE);
    return { type: N.BLOCK, body: stmts };
  }

  // Expression parsing (recursive descent with precedence)
  parseExpr() { return this.parseOr(); }

  parseOr() {
    let left = this.parseAnd();
    while (this.peek()?.type === 'Or') {
      const op = this.advance();
      left = { type: N.BINOP, op: 'or', left, right: this.parseAnd(), line: op.line };
    }
    return left;
  }

  parseAnd() {
    let left = this.parseNot();
    while (this.peek()?.type === 'And') {
      const op = this.advance();
      left = { type: N.BINOP, op: 'and', left, right: this.parseNot(), line: op.line };
    }
    return left;
  }

  parseNot() {
    if (this.peek()?.type === 'Not') {
      const op = this.advance();
      return { type: N.UNOP, op: 'not', operand: this.parseNot(), line: op.line };
    }
    return this.parseCompare();
  }

  parseCompare() {
    let left = this.parseAdd();
    const cmpOps = { [T.EQ]: '==', [T.NEQ]: '!=', [T.LT]: '<', [T.GT]: '>',
                     [T.LTE]: '<=', [T.GTE]: '>=' };
    const tokType = this.peek()?.type;
    if (cmpOps[tokType]) {
      const op = this.advance();
      left = { type: N.BINOP, op: cmpOps[tokType], left, right: this.parseAdd(), line: op.line };
    }
    return left;
  }

  parseAdd() {
    let left = this.parseMul();
    while (this.peek()?.type === T.ADD || this.peek()?.type === T.SUB) {
      const op = this.advance();
      left = { type: N.BINOP, op: op.type === T.ADD ? '+' : '-', left, right: this.parseMul(), line: op.line };
    }
    return left;
  }

  parseMul() {
    let left = this.parsePow();
    while (this.peek()?.type === T.MUL || this.peek()?.type === T.DIV) {
      const op = this.advance();
      left = { type: N.BINOP, op: op.type === T.MUL ? '*' : '/', left, right: this.parsePow(), line: op.line };
    }
    return left;
  }

  parsePow() {
    let base = this.parseUnary();
    if (this.peek()?.type === T.POW) {
      const op = this.advance();
      base = { type: N.BINOP, op: '^', left: base, right: this.parsePow(), line: op.line };
    }
    return base;
  }

  parseUnary() {
    if (this.peek()?.type === T.SUB) {
      const op = this.advance();
      return { type: N.UNOP, op: '-', operand: this.parseUnary(), line: op.line };
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    const tok = this.peek();
    if (!tok) throw new ParseError('Unexpected end of input', tok);

    // Parenthesised expression
    if (tok.type === T.LPAREN) {
      this.advance();
      const expr = this.parseExpr();
      this.eat(T.RPAREN);
      return expr;
    }

    // Literals
    if (tok.type === T.NUMBER) {
      this.advance();
      return { type: N.NUM, value: tok.value, line: tok.line };
    }
    if (tok.type === T.STRING) {
      this.advance();
      return { type: N.STR, value: tok.value, line: tok.line };
    }
    if (tok.type === 'True') {
      this.advance();
      return { type: N.BOOL, value: true, line: tok.line };
    }
    if (tok.type === 'False') {
      this.advance();
      return { type: N.BOOL, value: false, line: tok.line };
    }

    // Variable
    if (tok.type === T.VARIABLE) {
      this.advance();
      return { type: N.VAR, name: tok.value, line: tok.line };
    }

    // Built-in expression function (Pi, Sin, GetX, Random, ...)
    if (EXPR_FUNCS.has(tok.type)) {
      return this.parseBuiltinFunc();
    }

    throw new ParseError(`Unexpected '${tok.value ?? tok.type}' in expression`, tok);
  }

  parseBuiltinFunc() {
    const tok = this.advance();
    const arity = ARITY[tok.type] ?? 0;
    const args = [];
    // Functions with args use parentheses or bare args
    const hasParen = this.check(T.LPAREN);
    if (hasParen) this.advance();
    for (let i = 0; i < arity; i++) {
      if (i > 0) {
        if (this.check(T.COMMA)) this.advance();
      }
      args.push(this.parseExpr());
    }
    if (hasParen) this.eat(T.RPAREN);
    return { type: N.FUNC, func: tok.type, args, line: tok.line };
  }
}

export function parse(tokens) {
  return new Parser(tokens).parse();
}
