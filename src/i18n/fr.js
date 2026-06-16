// French command name → canonical token type (from KDE kturtle.mo)
export default {
  // Movement
  'avance': 'Forward', 'av': 'Forward',
  'recule': 'Backward', 're': 'Backward',
  'tournegauche': 'TurnLeft', 'tg': 'TurnLeft',
  'tournedroite': 'TurnRight', 'td': 'TurnRight',
  'direction': 'Direction', 'dir': 'Direction',
  'centre': 'Center',
  'va': 'Go',
  'vax': 'GoX', 'vx': 'GoX',
  'vay': 'GoY', 'vy': 'GoY',
  // Position query
  'positionx': 'GetX',
  'positiony': 'GetY',
  'obtenirdirection': 'GetDirection',
  // Pen
  'lèvecrayon': 'PenUp', 'lc': 'PenUp',
  'baissecrayon': 'PenDown', 'bc': 'PenDown',
  'largeurcrayon': 'PenWidth', 'lac': 'PenWidth',
  'couleurcrayon': 'PenColor', 'cc': 'PenColor',
  // Canvas
  'couleurcanevas': 'CanvasColor', 'cca': 'CanvasColor',
  'taillecanevas': 'CanvasSize', 'tc': 'CanvasSize',
  // Sprite
  'montre': 'SpriteShow', 'mo': 'SpriteShow',
  'cache': 'SpriteHide', 'ca': 'SpriteHide',
  // Cleanup
  'nettoietout': 'Clear', 'ntt': 'Clear',
  'initialise': 'Reset',
  // Text
  'écris': 'Print',
  'taillepolice': 'FontSize',
  // Math functions (return values)
  'hasard': 'Random', 'hsd': 'Random',
  'arrondi': 'Round',
  'racine': 'Sqrt',
  'mod': 'Mod',
  'pi': 'Pi',
  'sin': 'Sin',
  'cos': 'Cos',
  'tan': 'Tan',
  'arcsin': 'ArcSin',
  'arccos': 'ArcCos',
  'arctan': 'ArcTan',
  // Dialog
  'message': 'Message',
  'demande': 'Ask',
  // Control flow
  'si': 'If',
  'sinon': 'Else',
  'répète': 'Repeat',
  'tantque': 'While',
  'pour': 'For',
  'à': 'To',
  'pas': 'Step',
  'coupure': 'Break',
  'retourne': 'Return',
  'apprends': 'Learn',
  'sortie': 'Exit',
  'attends': 'Wait',
  'assertion': 'Assert',
  // Literals
  'vrai': 'True',
  'faux': 'False',
  // Logical operators
  'et': 'And',
  'ou': 'Or',
  'non': 'Not',
};
