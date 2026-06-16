import './style.css';
import { setLanguage, getLanguage, availableLanguages } from './i18n/index.js';
import { tokenize, LexError } from './interpreter/lexer.js';
import { parse, ParseError } from './interpreter/parser.js';
import { Executor, RuntimeError } from './interpreter/executor.js';
import { TurtleState, DEFAULT_CANVAS_W, DEFAULT_CANVAS_H } from './turtle/state.js';
import { Renderer } from './turtle/renderer.js';
import { createEditor, setErrorLine, setCurrentLine, invalidateKeywordCache, setEditorTheme } from './editor/setup.js';
import { examples } from './examples/index.js';
import { translateCode } from './i18n/translate.js';
import { serializeToKTurtle, deserializeFromKTurtle } from './i18n/serialize.js';

// ── DOM refs ──
const btnRun   = document.getElementById('btn-run');
const btnStep  = document.getElementById('btn-step');
const btnStop  = document.getElementById('btn-stop');
const btnReset = document.getElementById('btn-reset');
const btnOpen  = document.getElementById('btn-open');
const btnSave  = document.getElementById('btn-save');
const selSpeed = document.getElementById('sel-speed');
const selLang  = document.getElementById('sel-lang');
const selTheme = document.getElementById('sel-theme');
const selShape = document.getElementById('sel-shape');
const selEx    = document.getElementById('sel-example');
const errPanel = document.getElementById('error-panel');
const edWrap   = document.getElementById('editor-wrap');
const edPane   = document.getElementById('editor-pane');
const divider  = document.getElementById('divider');
const canvasPane = document.getElementById('canvas-pane');
const canvasWrap = document.getElementById('canvas-wrap');
const drawCanvas   = document.getElementById('canvas-draw');
const turtleCanvas = document.getElementById('canvas-turtle');

// ── State ──
const turtle   = new TurtleState();
const renderer = new Renderer(drawCanvas, turtleCanvas);

let editor = null;
let abortCtrl = null;
let stepResolve = null;  // for step-by-step mode

// ── Speed settings (ms delay per visual step) ──
const SPEEDS = { full: 0, fullnh: 0, slow: 80, slower: 250, slowest: 600, step: -1 };

// ── Canvas zoom ──
function updateCanvasZoom() {
  const availW = canvasPane.clientWidth  - 20;
  const availH = canvasPane.clientHeight - 20;
  if (availW <= 0 || availH <= 0) return;
  const cw = drawCanvas.width;
  const ch = drawCanvas.height;
  const scale = Math.min(availW / cw, availH / ch);
  const displayW = Math.round(cw * scale);
  const displayH = Math.round(ch * scale);

  drawCanvas.style.width    = displayW + 'px';
  drawCanvas.style.height   = displayH + 'px';
  turtleCanvas.style.width  = displayW + 'px';
  turtleCanvas.style.height = displayH + 'px';
  turtleCanvas.style.left   = '0';
  turtleCanvas.style.top    = '0';
  canvasWrap.style.width    = displayW + 'px';
  canvasWrap.style.height   = displayH + 'px';
}

window.addEventListener('resize', updateCanvasZoom);

// ── Init canvas ──
function initCanvas() {
  drawCanvas.width    = DEFAULT_CANVAS_W;
  drawCanvas.height   = DEFAULT_CANVAS_H;
  turtleCanvas.width  = DEFAULT_CANVAS_W;
  turtleCanvas.height = DEFAULT_CANVAS_H;
  renderer.clearCanvas(turtle.canvasColorStr);
  renderer.drawTurtle(turtle);
  updateCanvasZoom();
}

// ── Editor init ──
function initEditor(code = '') {
  if (editor) editor.destroy();
  const isDark = selTheme.value === 'dark';
  document.body.className = isDark ? 'theme-dark' : 'theme-light';
  edWrap.className = isDark ? 'theme-dark' : 'theme-light';
  editor = createEditor(edWrap, code, isDark);
  window.kEditor = editor;
}

// ── Shape selector ──
selShape.addEventListener('change', () => {
  renderer.turtleShape = selShape.value;
  renderer.drawTurtle(turtle);
});

// ── Theme selector ──
selTheme.addEventListener('change', () => {
  const isDark = selTheme.value === 'dark';
  document.body.className = isDark ? 'theme-dark' : 'theme-light';
  edWrap.className = isDark ? 'theme-dark' : 'theme-light';
  if (editor) setEditorTheme(editor, isDark);
});

// ── Divider drag ──
divider.addEventListener('mousedown', (e) => {
  e.preventDefault();
  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'col-resize';
  divider.classList.add('dragging');
  const startX = e.clientX;
  const startW = edPane.offsetWidth;

  function onMove(e) {
    const newW = Math.max(180, Math.min(startW + e.clientX - startX, window.innerWidth - 200));
    edPane.style.width = newW + 'px';
    updateCanvasZoom();
  }

  function onUp() {
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    divider.classList.remove('dragging');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
});

// ── Language selector ──
function populateLangSelect() {
  selLang.innerHTML = '';
  for (const lang of availableLanguages()) {
    const opt = document.createElement('option');
    opt.value = lang;
    opt.textContent = lang.toUpperCase();
    selLang.appendChild(opt);
  }
  selLang.value = getLanguage();
}

selLang.addEventListener('change', () => {
  const toLang = selLang.value;
  const code = editor?.state.doc.toString() ?? '';
  const translated = translateCode(code, toLang);
  setLanguage(toLang);
  invalidateKeywordCache();
  initEditor(translated);
  populateExamples();
});

// ── Examples ──
function populateExamples() {
  selEx.innerHTML = '<option value="">— Examples —</option>';
  const lang = getLanguage();
  examples.forEach((ex, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = ex.name[lang] ?? ex.name.en;
    selEx.appendChild(opt);
  });
}

selEx.addEventListener('change', () => {
  const idx = selEx.value;
  if (idx === '') return;
  initEditor(translateCode(examples[idx].code, getLanguage(), 'en'));
  selEx.value = '';
});

// ── Run / Step / Stop ──
function getCode() { return editor?.state.doc.toString() ?? ''; }

function showError(msg, line = null) {
  errPanel.className = 'has-error';
  errPanel.textContent = line ? `Line ${line}: ${msg}` : msg;
  if (line && editor) {
    editor.dispatch({ effects: [setErrorLine.of(line), setCurrentLine.of(null)] });
  }
}

function showOk(msg) {
  errPanel.className = 'ok';
  errPanel.textContent = msg;
}

function showIdle(msg = 'Ready.') {
  errPanel.className = 'idle';
  errPanel.textContent = msg;
  if (editor) editor.dispatch({ effects: [setErrorLine.of(null), setCurrentLine.of(null)] });
}

function setRunning(running) {
  btnRun.disabled  = running;
  btnStop.disabled = !running;
}

async function run(stepMode = false) {
  const code = getCode();
  let tokens, ast;
  try {
    tokens = tokenize(code);
    ast = parse(tokens);
  } catch (e) {
    showError(e.message, e.line);
    return;
  }

  showIdle('Running…');
  if (editor) editor.dispatch({ effects: [setErrorLine.of(null), setCurrentLine.of(null)] });
  setRunning(true);

  abortCtrl = new AbortController();
  let lastYield = performance.now();

  const exec = new Executor(turtle, renderer, {
    abortSignal: abortCtrl.signal,
    onResize: updateCanvasZoom,
    onStep: async (line) => {
      const mode = selSpeed.value;
      const speed = SPEEDS[mode] ?? 0;

      if (mode !== 'fullnh' && editor)
        editor.dispatch({ effects: setCurrentLine.of(line) });

      if (mode === 'step') {
        await new Promise(resolve => { stepResolve = resolve; });
        stepResolve = null;
      } else if (speed > 0) {
        await new Promise(resolve => setTimeout(resolve, speed));
      } else {
        // Full speed: yield to the browser every ~16 ms so repaints are visible
        const now = performance.now();
        if (now - lastYield >= 16) {
          lastYield = now;
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    },
    onMessage: (msg) => {
      // Non-blocking: show in error panel
      errPanel.className = 'ok';
      errPanel.textContent = msg;
    },
    onAsk: (msg) => {
      return new Promise(resolve => {
        const ans = window.prompt(msg) ?? '';
        resolve(ans);
      });
    },
  });

  try {
    await exec.run(ast);
    showOk('Done.');
  } catch (e) {
    if (!abortCtrl.signal.aborted) {
      showError(e.message, e.line);
      if (e.line && editor) editor.dispatch({ effects: setErrorLine.of(e.line) });
    } else {
      showIdle('Stopped.');
    }
  } finally {
    setRunning(false);
    abortCtrl = null;
    stepResolve = null;
    if (editor) editor.dispatch({ effects: setCurrentLine.of(null) });
    renderer.drawTurtle(turtle);
  }
}

btnOpen.addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.turtle';
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    const content = await file.text();
    initEditor(deserializeFromKTurtle(content));
  });
  input.click();
});

btnSave.addEventListener('mousedown', () => {
  try {
    const content = serializeToKTurtle(getCode());
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    if (btnSave._blobUrl) URL.revokeObjectURL(btnSave._blobUrl);
    btnSave._blobUrl = URL.createObjectURL(blob);
    btnSave.href = btnSave._blobUrl;
  } catch (e) {
    showError('Save failed: ' + e.message);
  }
});

btnRun.addEventListener('click', () => run(false));

btnReset.addEventListener('click', () => {
  turtle.reset();
  renderer.resize(turtle.canvasW, turtle.canvasH);
  renderer.clearCanvas(turtle.canvasColorStr);
  renderer.drawTurtle(turtle);
  updateCanvasZoom();
  showIdle('Ready.');
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'F5') {
    e.preventDefault();
    if (!abortCtrl) run(false);
  }
});

btnStep.addEventListener('click', () => {
  if (abortCtrl) {
    // Already running in step mode — advance one step
    if (stepResolve) stepResolve();
  } else {
    // Start execution in step mode
    selSpeed.value = 'step';
    run(true);
  }
});

btnStop.addEventListener('click', () => {
  if (abortCtrl) {
    abortCtrl.abort();
    if (stepResolve) { stepResolve(); stepResolve = null; }
  }
});

// ── Bootstrap ──
setLanguage('fr');
populateLangSelect();
populateExamples();
initCanvas();
initEditor(translateCode(examples[0].code, getLanguage(), 'en'));
showIdle();
