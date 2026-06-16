# KTurtle Web

A browser-based equivalent of [KTurtle](https://apps.kde.org/kturtle/), built as a **single self-contained HTML file** — no server, no install, just open `index.html` in any modern browser.

Live version: https://kturtle.famillepfister.fr

## Features

- Full TurtleScript interpreter (variables, functions, loops, recursion)
- EN / FR language support with live translation
- Light / dark theme
- Resizable editor / canvas split with zoom-to-fit
- Turtle shape selector (arrow, turtle, circle, mouse)
- Open / Save As `.turtle` files (KTurtle-compatible format)
- 7 built-in examples

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Opens a local dev server at `http://localhost:5173` with hot reload.

## Build

```bash
npm run build
```

Produces a single `dist/index.html` (~325 KB, ~105 KB gzipped). This file is fully self-contained and can be distributed or hosted as-is.

## Project structure

```
src/
  i18n/
    en.js, fr.js        command name maps
    index.js            language registry
    translate.js        code translation between languages
    serialize.js        .turtle file format read/write
  interpreter/
    lexer.js            tokenizer
    parser.js           recursive-descent AST builder
    executor.js         async interpreter with step/speed/abort callbacks
  turtle/
    state.js            TurtleState — position, pen, canvas size
    renderer.js         Canvas 2D renderer with retained drawing history
  editor/
    setup.js            CodeMirror 6 editor with syntax highlighting
  examples/
    index.js            built-in examples (English source, translated on load)
  main.js               application wiring
  style.css             CSS custom properties for light/dark theme
index.html              entry point
```

## Adding a language

1. Copy `src/i18n/en.js` to `src/i18n/xx.js` and translate the keyword arrays.
2. Import and register it in `src/i18n/index.js`.
3. Add the language option to the `<select id="sel-lang">` in `index.html`.

## Adding an example

Add an entry to the array in `src/examples/index.js`:

```js
{
  name: { en: 'My example', fr: 'Mon exemple' },
  code: `# Write the TurtleScript code here in English keywords
forward 100
turnright 90
`,
}
```

The code must use English keywords — it is translated automatically when the UI language changes.
