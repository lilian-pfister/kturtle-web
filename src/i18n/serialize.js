import { tokenize, T } from '../interpreter/lexer.js';
import { primaryNameIn, resolveIn, primaryName } from './index.js';

const NON_KEYWORD = new Set(Object.values(T));

export function serializeToKTurtle(code) {
  const tokens = tokenize(code, { lenient: true });

  // Build per-line start offsets (1-based line → absolute char index)
  const lineOffsets = [0];
  let off = 0;
  for (const line of code.split('\n')) {
    off += line.length + 1;
    lineOffsets.push(off);
  }

  const replacements = [];
  for (const tok of tokens) {
    const start = lineOffsets[tok.line - 1] + (tok.col - 1);

    if (tok.type === T.COMMA) {
      replacements.push({ start, end: start + 1, replacement: '@(,)' });
    } else if (!NON_KEYWORD.has(tok.type)) {
      const enName = primaryNameIn(tok.type, 'en');
      if (enName) {
        replacements.push({ start, end: start + tok.value.length, replacement: `@(${enName})` });
      }
    }
  }

  // Apply in reverse order so earlier offsets stay valid
  let result = code;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { start, end, replacement } = replacements[i];
    result = result.slice(0, start) + replacement + result.slice(end);
  }

  return 'kturtle-script-v1.0\n' + result;
}

export function deserializeFromKTurtle(content) {
  const lines = content.split('\n');
  if (lines[0].trim() !== 'kturtle-script-v1.0') return content;
  const code = lines.slice(1).join('\n');

  return code.replace(/@\(([^)]*)\)/g, (match, name) => {
    if (name === ',') return ',';
    const type = resolveIn(name, 'en');
    if (!type) return match; // unknown token, keep as-is
    return primaryName(type); // current language
  });
}
