import { resolve } from '../i18n/index.js';

export const T = {
  NUMBER: 'NUMBER', STRING: 'STRING', VARIABLE: 'VARIABLE',
  LBRACE: 'LBRACE', RBRACE: 'RBRACE',
  LPAREN: 'LPAREN', RPAREN: 'RPAREN',
  COMMA: 'COMMA',
  ASSIGN: 'ASSIGN',       // = (assignment, not ==)
  EQ: 'EQ',               // ==
  NEQ: 'NEQ',             // !=
  LT: 'LT', GT: 'GT', LTE: 'LTE', GTE: 'GTE',
  ADD: 'ADD', SUB: 'SUB', MUL: 'MUL', DIV: 'DIV', POW: 'POW',
  NEWLINE: 'NEWLINE',
  EOF: 'EOF',
  IDENTIFIER: 'IDENTIFIER', // user-defined function name
  // Canonical command/keyword types (e.g. 'Forward', 'If', 'Repeat', ...)
  // are used directly as token types when resolved from i18n table
};

export class Token {
  constructor(type, value, line, col) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.col = col;
  }
}

export class LexError extends Error {
  constructor(msg, line, col) {
    super(msg);
    this.line = line;
    this.col = col;
  }
}

export function tokenize(source, { lenient = false } = {}) {
  const tokens = [];
  let pos = 0, line = 1, col = 1;

  function peek(offset = 0) { return source[pos + offset] ?? ''; }
  function advance() {
    const ch = source[pos++];
    if (ch === '\n') { line++; col = 1; } else { col++; }
    return ch;
  }
  function addTok(type, value, l = line, c = col) {
    tokens.push(new Token(type, value, l, c));
  }

  while (pos < source.length) {
    const ch = peek();
    const tokLine = line, tokCol = col;

    // Skip spaces/tabs
    if (ch === ' ' || ch === '\t' || ch === '\r') { advance(); continue; }

    // Newline
    if (ch === '\n') { advance(); addTok(T.NEWLINE, '\n', tokLine, tokCol); continue; }

    // Comment
    if (ch === '#') {
      while (pos < source.length && peek() !== '\n') advance();
      continue;
    }

    // String
    if (ch === '"') {
      advance();
      let s = '';
      while (pos < source.length && peek() !== '"') {
        if (peek() === '\\' && peek(1) === '"') { advance(); s += '"'; advance(); }
        else s += advance();
      }
      if (peek() !== '"') {
        if (!lenient) throw new LexError('Unterminated string', tokLine, tokCol);
        continue; // skip malformed string, carry on
      }
      advance();
      addTok(T.STRING, s, tokLine, tokCol);
      continue;
    }

    // Variable
    if (ch === '$') {
      advance();
      let name = '';
      while (/[a-zA-Z0-9_]/.test(peek())) name += advance();
      if (!name) {
        if (!lenient) throw new LexError('Expected variable name after $', tokLine, tokCol);
        continue; // skip lone $
      }
      addTok(T.VARIABLE, name, tokLine, tokCol);
      continue;
    }

    // Number
    if (/[0-9]/.test(ch) || (ch === '-' && /[0-9]/.test(peek(1)) && tokens.length === 0)) {
      let n = '';
      if (ch === '-') n += advance();
      while (/[0-9]/.test(peek())) n += advance();
      if (peek() === '.' && /[0-9]/.test(peek(1))) {
        n += advance();
        while (/[0-9]/.test(peek())) n += advance();
      }
      addTok(T.NUMBER, parseFloat(n), tokLine, tokCol);
      continue;
    }

    // Identifier / keyword — support Unicode letters (for French accented commands)
    if (/[\p{L}_]/u.test(ch)) {
      let word = '';
      while (/[\p{L}0-9_]/u.test(peek())) word += advance();
      const canonical = resolve(word);
      if (canonical) {
        addTok(canonical, word, tokLine, tokCol);
      } else {
        addTok(T.IDENTIFIER, word, tokLine, tokCol);
      }
      continue;
    }

    // Operators and punctuation
    advance();
    switch (ch) {
      case '{': addTok(T.LBRACE, ch, tokLine, tokCol); break;
      case '}': addTok(T.RBRACE, ch, tokLine, tokCol); break;
      case '(': addTok(T.LPAREN, ch, tokLine, tokCol); break;
      case ')': addTok(T.RPAREN, ch, tokLine, tokCol); break;
      case ',': addTok(T.COMMA, ch, tokLine, tokCol); break;
      case '+': addTok(T.ADD, ch, tokLine, tokCol); break;
      case '*': addTok(T.MUL, ch, tokLine, tokCol); break;
      case '/': addTok(T.DIV, ch, tokLine, tokCol); break;
      case '^': addTok(T.POW, ch, tokLine, tokCol); break;
      case '-': addTok(T.SUB, ch, tokLine, tokCol); break;
      case '=':
        if (peek() === '=') { advance(); addTok(T.EQ, '==', tokLine, tokCol); }
        else addTok(T.ASSIGN, '=', tokLine, tokCol);
        break;
      case '!':
        if (peek() === '=') { advance(); addTok(T.NEQ, '!=', tokLine, tokCol); }
        else if (!lenient) throw new LexError(`Unexpected character '!'`, tokLine, tokCol);
        break;
      case '<':
        if (peek() === '=') { advance(); addTok(T.LTE, '<=', tokLine, tokCol); }
        else addTok(T.LT, '<', tokLine, tokCol);
        break;
      case '>':
        if (peek() === '=') { advance(); addTok(T.GTE, '>=', tokLine, tokCol); }
        else addTok(T.GT, '>', tokLine, tokCol);
        break;
      default:
        if (!lenient) throw new LexError(`Unexpected character '${ch}'`, tokLine, tokCol);
    }
  }

  addTok(T.EOF, null, line, col);
  return tokens;
}
