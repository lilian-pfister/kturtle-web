import { EditorView, Decoration, ViewPlugin, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { EditorState, StateEffect, StateField, RangeSetBuilder, Compartment } from '@codemirror/state';
import { defaultKeymap, historyKeymap, history, indentWithTab } from '@codemirror/commands';
import { StreamLanguage, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { allKeywords, STMT_CMDS, EXPR_FUNCS } from '../i18n/index.js';

// Syntax highlight styles — one per theme
const darkHighlight = HighlightStyle.define([
  { tag: t.keyword,           color: '#89b4fa', fontWeight: 'bold' },
  { tag: t.standard(t.name), color: '#cba6f7', fontWeight: 'bold' },
  { tag: t.number,            color: '#fab387' },
  { tag: t.string,            color: '#a6e3a1' },
  { tag: t.variableName,      color: '#89dceb' },
  { tag: t.comment,           color: '#6c7086', fontStyle: 'italic' },
  { tag: t.operator,          color: '#f38ba8' },
]);

const lightHighlight = HighlightStyle.define([
  { tag: t.keyword,           color: '#0057ae', fontWeight: 'bold' },
  { tag: t.standard(t.name), color: '#644a9b', fontWeight: 'bold' },
  { tag: t.number,            color: '#b08000' },
  { tag: t.string,            color: '#bf0303' },
  { tag: t.variableName,      color: '#0095a8' },
  { tag: t.comment,           color: '#898887', fontStyle: 'italic' },
  { tag: t.operator,          color: '#ca60ca' },
]);

export const themeCompartment = new Compartment();

function makeThemeExts(isDark) {
  return [
    EditorView.theme({
      '&': { height: '100%', fontSize: '14px' },
      '.cm-scroller': { fontFamily: 'monospace', overflow: 'auto' },
      '.cm-error-line':   { backgroundColor: isDark ? '#3e1a1a !important' : '#ffd0d0 !important' },
      '.cm-current-line': { backgroundColor: isDark ? '#1a3050 !important' : '#d0e8ff !important' },
      '.cm-lineNumbers .cm-gutterElement': { minWidth: '30px' },
      '.cm-content': { caretColor: isDark ? '#cdd6f4' : '#1e1e2e' },
    }),
    syntaxHighlighting(isDark ? darkHighlight : lightHighlight),
  ];
}

export function setEditorTheme(view, isDark) {
  view.dispatch({ effects: themeCompartment.reconfigure(makeThemeExts(isDark)) });
}

// Rebuild the stream language tokenizer when language changes
let _keywords = null;

function getStreamLang() {
  return StreamLanguage.define({
    startState: () => ({ inString: false }),
    token(stream, state) {
      if (state.inString) {
        stream.eatWhile(c => c !== '"' && c !== '\\');
        if (stream.peek() === '\\') { stream.next(); stream.next(); return 'string'; }
        if (stream.peek() === '"') { stream.next(); state.inString = false; }
        return 'string';
      }
      if (stream.eatSpace()) return null;
      if (stream.match(/^#.*/)) return 'comment';
      if (stream.peek() === '"') { stream.next(); state.inString = true; return 'string'; }
      if (stream.peek() === '$') {
        stream.next();
        stream.eatWhile(/\w/);
        return 'variableName';
      }
      if (stream.match(/^\d+(\.\d+)?/)) return 'number';
      if (stream.match(/^[+\-*\/^=!<>]+/)) return 'operator';
      if (stream.match(/^[\p{L}_][\p{L}0-9_]*/u)) {
        const word = stream.current().toLowerCase();
        if (!_keywords) _keywords = new Set(allKeywords());
        if (_keywords.has(word)) return 'keyword';
        return 'builtin';
      }
      stream.next();
      return null;
    },
    languageData: { commentTokens: { line: '#' } },
  });
}

// Effects to set error line and current (step) line
export const setErrorLine = StateEffect.define();
export const setCurrentLine = StateEffect.define();

const errorLineField = StateField.define({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setErrorLine)) {
        if (e.value === null) return Decoration.none;
        const line = tr.state.doc.line(e.value);
        return Decoration.set([
          Decoration.line({ class: 'cm-error-line' }).range(line.from),
        ]);
      }
    }
    return deco;
  },
  provide: f => EditorView.decorations.from(f),
});

const currentLineField = StateField.define({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setCurrentLine)) {
        if (e.value === null) return Decoration.none;
        try {
          const line = tr.state.doc.line(e.value);
          return Decoration.set([
            Decoration.line({ class: 'cm-current-line' }).range(line.from),
          ]);
        } catch (_) { return Decoration.none; }
      }
    }
    return deco;
  },
  provide: f => EditorView.decorations.from(f),
});

export function createEditor(container, initialCode = '', isDark = true) {
  _keywords = null; // reset cache so it picks up new language on next token

  const view = new EditorView({
    state: EditorState.create({
      doc: initialCode,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        lineNumbers(),
        getStreamLang(),
        errorLineField,
        currentLineField,
        highlightActiveLine(),
        themeCompartment.of(makeThemeExts(isDark)),
      ],
    }),
    parent: container,
  });

  return view;
}

export function invalidateKeywordCache() {
  _keywords = null;
}
