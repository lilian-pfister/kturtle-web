import en from './en.js';
import fr from './fr.js';

const languages = { en, fr };

// Commands that are expression functions (return a value)
export const EXPR_FUNCS = new Set([
  'GetX', 'GetY', 'GetDirection',
  'Random', 'Round', 'Sqrt', 'Mod', 'Pi',
  'Sin', 'Cos', 'Tan', 'ArcSin', 'ArcCos', 'ArcTan',
]);

// Commands that are statements (no return value)
export const STMT_CMDS = new Set([
  'Forward', 'Backward', 'TurnLeft', 'TurnRight', 'Direction',
  'Center', 'Go', 'GoX', 'GoY',
  'PenUp', 'PenDown', 'PenWidth', 'PenColor',
  'CanvasColor', 'CanvasSize',
  'SpriteShow', 'SpriteHide',
  'Clear', 'Reset',
  'Print', 'FontSize',
  'Message', 'Ask',
  'Wait', 'Assert',
]);

// Number of arguments each command/function expects
export const ARITY = {
  Forward: 1, Backward: 1, TurnLeft: 1, TurnRight: 1, Direction: 1,
  Center: 0, Go: 2, GoX: 1, GoY: 1,
  PenUp: 0, PenDown: 0, PenWidth: 1, PenColor: 3,
  CanvasColor: 3, CanvasSize: 2,
  SpriteShow: 0, SpriteHide: 0,
  Clear: 0, Reset: 0,
  Print: 1, FontSize: 1,
  Random: 2, Round: 1, Sqrt: 1, Mod: 2, Pi: 0,
  Sin: 1, Cos: 1, Tan: 1, ArcSin: 1, ArcCos: 1, ArcTan: 1,
  GetX: 0, GetY: 0, GetDirection: 0,
  Message: 1, Ask: 1,
  Wait: 1, Assert: 1,
};

let currentLang = 'en';
let currentMap = en;

// Build reverse map: canonical type → primary locale name (for display)
function buildReverseMap(map) {
  const rev = {};
  for (const [look, type] of Object.entries(map)) {
    if (!rev[type]) rev[type] = look; // first entry = primary name
  }
  return rev;
}

let reverseMap = buildReverseMap(en);

export function setLanguage(lang) {
  if (!languages[lang]) throw new Error(`Unknown language: ${lang}`);
  currentLang = lang;
  currentMap = languages[lang];
  reverseMap = buildReverseMap(currentMap);
}

export function getLanguage() { return currentLang; }

// Resolve a word to its canonical type, or null if unknown
export function resolve(word) {
  return currentMap[word.toLowerCase()] ?? null;
}

// Get all words (names + aliases) for a given canonical type in current language
export function wordsFor(type) {
  return Object.entries(currentMap)
    .filter(([, t]) => t === type)
    .map(([w]) => w);
}

// Primary display name for a canonical type
export function primaryName(type) {
  return reverseMap[type] ?? type.toLowerCase();
}

// All keyword words in current language (for syntax highlighting)
export function allKeywords() {
  return Object.keys(currentMap);
}

export function availableLanguages() {
  return Object.keys(languages);
}

// Resolve a word in a specific language (without changing current language)
export function resolveIn(word, lang) {
  return languages[lang]?.[word.toLowerCase()] ?? null;
}

// Primary display name for a canonical type in a specific language (for translation)
export function primaryNameIn(type, lang) {
  const map = languages[lang];
  if (!map) return null;
  for (const [word, t] of Object.entries(map)) {
    if (t === type) return word;
  }
  return null;
}
