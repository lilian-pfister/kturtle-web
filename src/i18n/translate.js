import { tokenize, T } from '../interpreter/lexer.js';
import { setLanguage, getLanguage, primaryNameIn } from './index.js';

// Token types that are NOT translatable keywords
const NON_KEYWORD = new Set(Object.values(T));

export function translateCode(code, toLang, fromLang = null) {
  // If fromLang is specified, temporarily switch so the tokenizer recognises
  // the source keywords (e.g. translating English examples when UI is in French)
  let prev = null;
  if (fromLang && fromLang !== getLanguage()) {
    prev = getLanguage();
    setLanguage(fromLang);
  }
  const tokens = tokenize(code, { lenient: true });
  if (prev) setLanguage(prev);

  // Build per-line start offsets so (line, col) → absolute char index
  const lineOffsets = [0];
  let off = 0;
  for (const line of code.split('\n')) {
    off += line.length + 1;
    lineOffsets.push(off);
  }

  // Collect replacements for every keyword token
  const replacements = [];
  for (const tok of tokens) {
    if (NON_KEYWORD.has(tok.type)) continue;
    const target = primaryNameIn(tok.type, toLang);
    if (!target || target === tok.value) continue;
    const start = lineOffsets[tok.line - 1] + (tok.col - 1);
    replacements.push({ start, end: start + tok.value.length, target });
  }

  // Apply in reverse order so earlier offsets stay valid
  let result = code;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { start, end, target } = replacements[i];
    result = result.slice(0, start) + target + result.slice(end);
  }
  return result;
}
