export const DEFAULT_CANVAS_W = 600;
export const DEFAULT_CANVAS_H = 600;

export class TurtleState {
  constructor(canvasW = DEFAULT_CANVAS_W, canvasH = DEFAULT_CANVAS_H) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.reset();
  }

  reset() {
    this.canvasW = DEFAULT_CANVAS_W;
    this.canvasH = DEFAULT_CANVAS_H;
    this.x = this.canvasW / 2;
    this.y = this.canvasH / 2;
    this.direction = 0;      // degrees, 0 = up, clockwise
    this.penDown = true;
    this.penColor = { r: 0, g: 0, b: 0 };
    this.penWidth = 1;
    this.canvasColor = { r: 255, g: 255, b: 255 };
    this.visible = true;
    this.fontSize = 12;
  }

  // Returns a line segment to draw (or null if pen up), and updates position
  moveForward(dist) {
    const rad = (this.direction - 90) * Math.PI / 180;
    const nx = this.x + dist * Math.cos(rad);
    const ny = this.y + dist * Math.sin(rad);
    const seg = this.penDown
      ? { x1: this.x, y1: this.y, x2: nx, y2: ny,
          color: this.penColor, width: this.penWidth }
      : null;
    this.x = nx;
    this.y = ny;
    return seg;
  }

  moveBackward(dist) { return this.moveForward(-dist); }
  turnLeft(deg) { this.direction = ((this.direction - deg) % 360 + 360) % 360; }
  turnRight(deg) { this.direction = (this.direction + deg) % 360; }
  setDirection(deg) { this.direction = ((deg % 360) + 360) % 360; }

  goTo(x, y) { this.x = x; this.y = y; }
  goToCenter() { this.goTo(this.canvasW / 2, this.canvasH / 2); }
  goX(x) { this.goTo(x, this.y); }
  goY(y) { this.goTo(this.x, y); }

  setPenColor(r, g, b) { this.penColor = { r, g, b }; }
  setCanvasColor(r, g, b) { this.canvasColor = { r, g, b }; }
  setPenWidth(w) { this.penWidth = Math.max(0, w); }
  setFontSize(s) { this.fontSize = Math.max(1, s); }

  colorStr(c) { return `rgb(${c.r},${c.g},${c.b})`; }
  get penColorStr() { return this.colorStr(this.penColor); }
  get canvasColorStr() { return this.colorStr(this.canvasColor); }
}
