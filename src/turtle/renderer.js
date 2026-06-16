export class Renderer {
  constructor(drawCanvas, turtleCanvas) {
    this.dc = drawCanvas;
    this.tc = turtleCanvas;
    this.dctx = drawCanvas.getContext('2d');
    this.tctx = turtleCanvas.getContext('2d');
    this.turtleShape = 'arrow';

    // Offscreen canvas for high-res sprite rendering.
    // Sprite is drawn at SCALE× and blitted down to RADIUS*2 px on the turtle canvas.
    this._RADIUS = 22; // half-size of blit area in canvas pixels
    this._SCALE  = 4;
    const sz = this._RADIUS * 2 * this._SCALE;
    this._sprite = document.createElement('canvas');
    this._sprite.width  = sz;
    this._sprite.height = sz;
  }

  resize(w, h) {
    const img = this.dctx.getImageData(0, 0, this.dc.width, this.dc.height);
    this.dc.width = w; this.dc.height = h;
    this.tc.width = w; this.tc.height = h;
    try { this.dctx.putImageData(img, 0, 0); } catch (_) {}
  }

  clearCanvas(color) {
    this.dctx.fillStyle = color;
    this.dctx.fillRect(0, 0, this.dc.width, this.dc.height);
  }

  drawSegment(seg) {
    if (!seg) return;
    const ctx = this.dctx;
    ctx.beginPath();
    ctx.moveTo(seg.x1, seg.y1);
    ctx.lineTo(seg.x2, seg.y2);
    ctx.strokeStyle = `rgb(${seg.color.r},${seg.color.g},${seg.color.b})`;
    ctx.lineWidth = seg.width;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  printText(x, y, text, fontSize, colorStr) {
    const ctx = this.dctx;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = colorStr;
    ctx.fillText(String(text), x, y);
  }

  drawTurtle(state) {
    const ctx = this.tctx;
    ctx.clearRect(0, 0, this.tc.width, this.tc.height);
    if (!state.visible) return;

    const R  = this._RADIUS;
    const S  = this._SCALE;
    const sz = R * 2 * S;

    // Draw shape at S× resolution on the offscreen canvas
    const off = this._sprite.getContext('2d');
    off.clearRect(0, 0, sz, sz);
    off.save();
    off.translate(R * S, R * S);
    off.rotate(state.direction * Math.PI / 180);
    off.scale(S, S);
    switch (this.turtleShape) {
      case 'turtle': this._shapeTurtle(off); break;
      case 'circle': this._shapeCircle(off); break;
      case 'mouse':  this._shapeMouse(off);  break;
      default:       this._shapeArrow(off);  break;
    }
    off.restore();

    // Blit high-res sprite onto turtle canvas at correct position
    ctx.drawImage(
      this._sprite,
      0, 0, sz, sz,
      Math.round(state.x) - R, Math.round(state.y) - R,
      R * 2, R * 2
    );
  }

  _shapeArrow(ctx) {
    const s = 12;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.6, s * 0.7);
    ctx.lineTo(0, s * 0.3);
    ctx.lineTo(-s * 0.6, s * 0.7);
    ctx.closePath();
    ctx.fillStyle = '#2ecc71';
    ctx.fill();
    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  _shapeCircle(ctx) {
    const r = 9;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = '#2ecc71';
    ctx.fill();
    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Direction indicator line pointing forward (north)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -r + 1);
    ctx.strokeStyle = '#1a7a40';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  _shapeMouse(ctx) {
    const gray = '#b8b8b8';
    const dark = '#808080';
    const pink = '#f48fb1';

    // Thinner teardrop body
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.bezierCurveTo(3, -12, 8, -5, 8, 2);
    ctx.bezierCurveTo(8,  8,  4, 11, 0, 11);
    ctx.bezierCurveTo(-4, 11, -8,  8, -8, 2);
    ctx.bezierCurveTo(-8, -5, -3, -12, 0, -15);
    ctx.closePath();
    ctx.fillStyle = gray; ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.5; ctx.stroke();

    // Small ears inside the body at the head/body junction
    for (const ex of [-5, 5]) {
      ctx.beginPath();
      ctx.arc(ex, -4, 3, 0, Math.PI * 2);
      ctx.fillStyle = pink; ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 0.8; ctx.stroke();
    }

    // Eyes
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath(); ctx.arc(-2.5, -8, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 2.5, -8, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-1.9, -8.6, 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 3.1, -8.6, 0.6, 0, Math.PI * 2); ctx.fill();

    // Nose
    ctx.beginPath();
    ctx.arc(0, -14, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = pink; ctx.fill();
  }

  _shapeTurtle(ctx) {
    const green  = '#2ecc71';
    const shell  = '#27ae60';
    const dark   = '#1a7a40';

    // Front legs
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.translate(sx * 10, -4);
      ctx.rotate(sx * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, 3, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = green; ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }

    // Back legs
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.translate(sx * 9, 6);
      ctx.rotate(-sx * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, 3, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = green; ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }

    // Tail
    ctx.beginPath();
    ctx.ellipse(0, 12, 2, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = green; ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke();

    // Shell body
    ctx.beginPath();
    ctx.ellipse(0, 1, 9, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = shell; ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.5; ctx.stroke();

    // Shell pattern (clipped)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 1, 9, 10, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, -9);  ctx.lineTo(0, 11);   // vertical
    ctx.moveTo(-9, 1);  ctx.lineTo(9, 1);    // horizontal mid
    ctx.moveTo(-9, -4); ctx.lineTo(9, -4);   // upper
    ctx.moveTo(-9, 6);  ctx.lineTo(9, 6);    // lower
    ctx.stroke();
    ctx.restore();

    // Head
    ctx.beginPath();
    ctx.arc(0, -12, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = green; ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke();

    // Eyes
    ctx.fillStyle = '#1a2a1a';
    ctx.beginPath(); ctx.arc(-1.5, -13.5, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(1.5, -13.5, 1, 0, Math.PI * 2); ctx.fill();
  }
}
