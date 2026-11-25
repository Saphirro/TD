// ---------------------------------------------------------------------------
// Canvas renderer. World units are tiles; everything is vector-drawn.
// ---------------------------------------------------------------------------
import { COLS, ROWS, TURRETS, PORTS } from './data.js';

const TAU = Math.PI * 2;

function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function lerpColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = ((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t;
  const g = ((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t;
  const bl = (pa & 255) + ((pb & 255) - (pa & 255)) * t;
  return '#' + [r, g, bl].map(v => (v | 0).toString(16).padStart(2, '0')).join('');
}
function loadColor(x) { // 0..1 -> green..amber..red
  x = Math.max(0, Math.min(1, x));
  return x < 0.6 ? lerpColor('#3dff9a', '#ffc94a', x / 0.6) : lerpColor('#ffc94a', '#ff3b5c', (x - 0.6) / 0.4);
}
function poly(ctx, n, r, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) { const a = rot + i * TAU / n; i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath();
}
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
// does this program import the meter module? (read from the running code itself, cached per code string)
const meterCache = new Map();
function hasMeter(code) {
  if (!code) return false;
  let v = meterCache.get(code);
  if (v === undefined) {
    v = /^\s*(import\s[^\n#]*\bmeter\b|from\s+meter\s+import)/m.test(code);
    if (meterCache.size > 200) meterCache.clear();
    meterCache.set(code, v);
  }
  return v;
}

export class Renderer {
  constructor(canvas, game) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.g = game;
    this.t = 0;
    this.glows = new Map();
    this.ui = null;
    this.resize();
    game.on('map', () => this.buildBg());
  }

  resize() {
    const r = this.cv.parentElement.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = r.width; this.h = r.height;
    this.cv.width = Math.max(1, Math.round(r.width * this.dpr));
    this.cv.height = Math.max(1, Math.round(r.height * this.dpr));
    this.cv.style.width = r.width + 'px';
    this.cv.style.height = r.height + 'px';
    const pad = r.width < 700 ? 4 : 16;
    // portrait screens (phones held upright): turn the board a quarter turn so it fills the screen.
    // Enemies then come in at the top and run down to the CPU at the bottom.
    const fitFlat = Math.min((r.width - pad * 2) / COLS, (r.height - pad * 2) / ROWS);
    const fitRot = Math.min((r.width - pad * 2) / ROWS, (r.height - pad * 2) / COLS);
    // phones play in landscape (a "turn your phone" hint shows when upright), so never turn the board there
    const cl = document.body.classList;
    this.rot = !(cl.contains('phone') && !cl.contains('upright')) && fitRot > fitFlat * 1.15;
    this.T = Math.max(8, this.rot ? fitRot : fitFlat);
    const bw = (this.rot ? ROWS : COLS) * this.T, bh = (this.rot ? COLS : ROWS) * this.T;
    this.ox = (r.width - bw) / 2;      // top-left corner of the board on screen (CSS px)
    this.oy = (r.height - bh) / 2;
    this.buildBg();
  }

  // tile coords → screen CSS px, and back. Rotated: tile x runs down the screen, tile y runs right-to-left.
  toScreen(x, y) {
    return this.rot ? { x: this.ox + (ROWS - y) * this.T, y: this.oy + x * this.T } : { x: this.ox + x * this.T, y: this.oy + y * this.T };
  }
  toTile(px, py) {
    return this.rot ? { x: (py - this.oy) / this.T, y: ROWS - (px - this.ox) / this.T } : { x: (px - this.ox) / this.T, y: (py - this.oy) / this.T };
  }
  world(ctx = this.ctx) {
    const k = this.dpr * this.T;
    if (this.rot) ctx.setTransform(0, k, -k, 0, this.dpr * (this.ox + ROWS * this.T), this.dpr * this.oy);
    else ctx.setTransform(k, 0, 0, k, this.dpr * this.ox, this.dpr * this.oy);
  }

  glow(color) {
    let c = this.glows.get(color);
    if (!c) {
      c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, color); gr.addColorStop(0.25, color + 'aa'); gr.addColorStop(1, color + '00');
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      this.glows.set(color, c);
    }
    return c;
  }
  drawGlow(x, y, r, color, alpha = 1) {
    const ctx = this.ctx;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha;
    ctx.drawImage(this.glow(color), x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }
  text(str, x, y, size, color, opts = {}) {
    const c = this.ctx;
    c.save();
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.font = `${opts.weight || 700} ${Math.max(8, size * this.T)}px ${opts.font || 'Inter, system-ui, sans-serif'}`;
    c.textAlign = opts.align || 'center'; c.textBaseline = 'middle';
    // labels stay upright when the board is turned; "above the part" (−y) becomes "beside it" there,
    // so in rotated mode a small offset (dy) is moved back to screen-up
    let p;
    if (this.rot && opts.anchor) { const a = this.toScreen(opts.anchor[0], opts.anchor[1]); p = { x: a.x, y: a.y + (y - opts.anchor[1]) * this.T }; }
    else p = this.toScreen(x, y);
    if (opts.stroke) { c.lineWidth = 3; c.strokeStyle = opts.stroke; c.strokeText(str, p.x, p.y); }
    c.fillStyle = color;
    c.fillText(str, p.x, p.y);
    c.restore();
  }

  pathTrace(ctx) {
    ctx.beginPath();
    for (const P of this.g.map.paths) P.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  }

  // ---- static background ----------------------------------------------------
  buildBg() {
    const c = document.createElement('canvas');
    c.width = this.cv.width; c.height = this.cv.height;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(c.width / 2, c.height / 2, 0, c.width / 2, c.height / 2, Math.max(c.width, c.height) * 0.7);
    gr.addColorStop(0, '#08201a'); gr.addColorStop(1, '#030b09');
    x.fillStyle = gr; x.fillRect(0, 0, c.width, c.height);
    this.world(x);

    // board plate
    rrect(x, -0.12, -0.12, COLS + 0.24, ROWS + 0.24, 0.25);
    const pg = x.createLinearGradient(0, 0, COLS, ROWS);
    pg.addColorStop(0, '#0c2a20'); pg.addColorStop(1, '#0a2119');
    x.fillStyle = pg; x.fill();
    x.lineWidth = 0.04; x.strokeStyle = '#1f5541'; x.stroke();

    // decorative copper traces on tile edges (seeded, faint)
    const rnd = mulberry32(1337);
    const blocked = this.g.blocked;
    const free = (cx, cy) => { const c0 = Math.floor(cx), r0 = Math.floor(cy); return !(blocked[r0]?.[c0]) && !(blocked[r0 - 1]?.[c0 - 1]) && !(blocked[r0]?.[c0 - 1]) && !(blocked[r0 - 1]?.[c0]); };
    x.lineCap = 'round'; x.lineJoin = 'round';
    for (let i = 0; i < 46; i++) {
      let px = 1 + Math.floor(rnd() * (COLS - 1)), py = 1 + Math.floor(rnd() * (ROWS - 1));
      if (!free(px, py)) continue;
      x.beginPath(); x.moveTo(px, py);
      const steps = 2 + Math.floor(rnd() * 5);
      let dir = Math.floor(rnd() * 4);
      for (let s = 0; s < steps; s++) {
        const dx = [1, 0, -1, 0][dir], dy = [0, 1, 0, -1][dir];
        const nx = px + dx, ny = py + dy;
        if (nx < 1 || ny < 1 || nx >= COLS || ny >= ROWS || !free(nx, ny)) break;
        px = nx; py = ny; x.lineTo(px, py);
        if (rnd() < 0.4) dir = (dir + (rnd() < 0.5 ? 1 : 3)) % 4;
      }
      x.strokeStyle = 'rgba(64,160,120,0.13)'; x.lineWidth = 0.05; x.stroke();
      x.beginPath(); x.arc(px, py, 0.07, 0, TAU); x.fillStyle = 'rgba(200,170,90,0.18)'; x.fill();
    }
    // grid dots
    x.fillStyle = 'rgba(120,220,180,0.10)';
    for (let r = 0; r <= ROWS; r++) for (let cc = 0; cc <= COLS; cc++) { x.fillRect(cc - 0.02, r - 0.02, 0.04, 0.04); }

    // enemy bus (path): gold rails + dark channel
    x.lineJoin = 'round'; x.lineCap = 'butt';
    this.pathTrace(x); x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = 1.05; x.stroke();
    this.pathTrace(x); x.strokeStyle = '#b8913f'; x.lineWidth = 0.9; x.stroke();
    this.pathTrace(x); x.strokeStyle = '#06130f'; x.lineWidth = 0.78; x.stroke();
    this.pathTrace(x); x.strokeStyle = 'rgba(184,145,63,0.25)'; x.lineWidth = 0.6; x.setLineDash([0.04, 0.16]); x.stroke(); x.setLineDash([]);

    // spawn portal
    for (const P of this.g.map.paths) {
      const sp = P[0];
    x.fillStyle = 'rgba(255,60,90,0.25)';
      rrect(x, -0.12, sp[1] - 0.45, 0.18, 0.9, 0.06); x.fill();
    }
    this.bg = c;
  }

  // ---- frame ------------------------------------------------------------------
  draw(dt) {
    this.t += dt;
    const ctx = this.ctx, g = this.g;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.bg, 0, 0);
    this.world();

    // enemy path indicator: data flow along the bus + spawn glow (can be switched off in Settings / V key)
    if (this.ui?.showPathFlow !== false) {
      this.pathTrace(ctx);
      ctx.setLineDash([0.12, 0.88]); ctx.lineDashOffset = -this.t * 1.2;
      ctx.strokeStyle = g.phase === 'wave' ? 'rgba(255,90,120,0.45)' : 'rgba(94,225,255,0.3)';
      ctx.lineWidth = 0.08; ctx.lineCap = 'round'; ctx.stroke(); ctx.setLineDash([]);
      for (const P of g.map.paths) this.drawGlow(0, P[0][1], 0.9, '#ff3c5a', 0.35 + 0.15 * Math.sin(this.t * 3));
    }

    this.drawWires();
    this.drawCore();
    for (const e of g.ents.values()) {
      if (e.type === 'psu') this.drawPsu(e);
      else if (e.type === 'splitter') this.drawSplitter(e);
      else this.drawSocket(e);
      if (e.level > 1) {   // upgrade level: small gold stars along the top edge
        for (let i = 1; i < e.level; i++) { this.ctx.beginPath(); this.ctx.arc(e.x - 0.33 + (i - 1) * 0.16, e.y - 0.42, 0.055, 0, TAU); this.ctx.fillStyle = "#ffcf6a"; this.ctx.fill(); }
      }
    }
    this.drawOverlayUnder();
    for (const s of g.sockets()) if (s.turret) this.drawTurret(s, s.turret);
    for (const e of g.enemies) this.drawEnemy(e);
    this.drawShells();
    this.drawLasers();
    this.drawFx();
    for (const s of g.sockets()) this.drawBadges(s);
    this.drawOverlayOver();
  }

  // ---- wires --------------------------------------------------------------------
  // Wires dive under the enemy bus like a trace on a lower PCB layer. The wire TAPERS: it is drawn
  // in K+1 bands by distance from the bus centre line, each band a little thinner and fainter than
  // the one outside it (full wire far away → thin see-through trace over the bus). Each band is
  // drawn on a scratch layer, cut to its ring with bus-shaped strokes, then copied onto the board.
  drawWires() {
    const g = this.g, main = this.ctx;
    if (!g.wires.size) return;
    g.updatePeaks();
    const L = this.wireLayer ||= document.createElement('canvas');
    if (L.width !== this.cv.width || L.height !== this.cv.height) { L.width = this.cv.width; L.height = this.cv.height; }
    const x = L.getContext('2d');
    // only work on the part of the canvas the wires cover
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const w of g.wires.values()) for (const [px, py] of g.wirePoints(w)) { x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py); }
    // corners of that box on screen (works for the turned board too), in device pixels
    const cs = [[x0 - 0.5, y0 - 0.5], [x1 + 0.5, y1 + 0.5]].map(([a, b]) => this.toScreen(a, b));
    const sx0 = Math.min(cs[0].x, cs[1].x), sx1 = Math.max(cs[0].x, cs[1].x), sy0 = Math.min(cs[0].y, cs[1].y), sy1 = Math.max(cs[0].y, cs[1].y);
    const bx = Math.max(0, Math.floor(sx0 * this.dpr)), by = Math.max(0, Math.floor(sy0 * this.dpr));
    const bw = Math.min(L.width, Math.ceil(sx1 * this.dpr)) - bx, bh = Math.min(L.height, Math.ceil(sy1 * this.dpr)) - by;
    if (bw <= 0 || bh <= 0) return;

    const K = 8, OUT = 0.85, IN = 0.4;               // taper from 0.85 tiles off the bus centre down to 0.4 (rails sit at 0.45)
    const edge = j => OUT - (OUT - IN) * j / (K - 1); // ring edges e0 > e1 > … > e(K-1)
    const band = (op, halfW) => { x.globalCompositeOperation = op; this.pathTrace(x); x.lineWidth = halfW * 2; x.strokeStyle = '#000'; x.stroke(); };
    x.lineJoin = 'round'; x.lineCap = 'butt';
    for (let p = 0; p <= K; p++) {
      const t = p / K;                                 // 0 = full wire, 1 = thin trace
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.clearRect(bx, by, bw, bh);
      this.world(x);
      this.ctx = x;                                    // drawWire / drawGlow draw into this.ctx
      for (const w of g.wires.values()) this.drawWire(w, 1 - 0.6 * t, 1 - 0.6 * t, p === 0, x);
      this.ctx = main;
      if (p < K) band('destination-out', edge(p));             // remove the inner part …
      if (p > 0) band('destination-in', edge(p - 1) + 0.01);   // … and keep only up to the previous ring
      x.globalCompositeOperation = 'source-over';
      main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.drawImage(L, bx, by, bw, bh, bx, by, bw, bh); main.restore();
    }
  }

  // s = width scale (1 = normal), a = opacity, warn = may show the overload flash
  drawWire(w, s, a, warn, ctx) {
    const pts = this.g.wirePoints(w);
    const load = w.aS / w.maxA;
    const col = loadColor(load);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#050d0a'; ctx.lineWidth = 0.2 * s; ctx.stroke();
    // edge colour = worst case (everything behind this wire charging at once) vs the wire's limit:
    // green fine, yellow near the limit (75–100%), red would be overloaded. Visible even while paused.
    const pr = (w.peakW || 0) / (w.maxA * 12);
    ctx.strokeStyle = pr > 1.001 ? '#c23b4e' : pr >= 0.75 ? '#b8912a' : '#2e7d4f'; ctx.lineWidth = 0.13 * s; ctx.stroke();
    ctx.strokeStyle = col; ctx.globalAlpha = a * (0.35 + 0.5 * Math.min(1, load + 0.15)); ctx.lineWidth = 0.06 * Math.max(s, 0.6); ctx.stroke();
    ctx.globalAlpha = 1;
    const under = s < 1;
    // flowing electrons
    const segs = []; let total = 0;
    for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); segs.push(l); total += l; }
    if (w.aS > 0.05) {
      const spacing = 0.45;
      for (let d = (w.phase % spacing); d < total; d += spacing) {
        let rem = d, i = 0;
        while (i < segs.length && rem > segs[i]) { rem -= segs[i]; i++; }
        if (i >= segs.length) break;
        const k = segs[i] ? rem / segs[i] : 0;
        const px = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, py = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k;
        this.drawGlow(px, py, 0.12 * Math.sqrt(s), col, 0.9 * a);
      }
    }
    if (warn && !under && load > 0.97 && Math.sin(this.t * 12) > 0) {
      const m = pts[1];
      this.drawGlow(m[0], m[1], 0.35, '#ff3b5c', 0.8);
    }
  }

  // ---- CPU core -------------------------------------------------------------------
  drawCore() {
    const ctx = this.ctx, g = this.g;
    const C = g.map.core, cx = C.c + C.w / 2, cy = C.r + C.h / 2;
    const hp = g.core / g.coreMax;
    const col = hp > 0.5 ? '#5ee1ff' : hp > 0.25 ? '#ffc94a' : '#ff3b5c';
    this.drawGlow(cx, cy, 2.1, col, 0.18 + 0.06 * Math.sin(this.t * 2));
    ctx.save(); ctx.translate(cx, cy);
    // pins
    ctx.fillStyle = '#c9a24a';
    for (let i = 0; i < 9; i++) {
      const o = -1.0 + i * 0.25;
      ctx.fillRect(o - 0.04, -1.32, 0.08, 0.2); ctx.fillRect(o - 0.04, 1.12, 0.08, 0.2);
      ctx.fillRect(-1.32, o - 0.04, 0.2, 0.08); ctx.fillRect(1.12, o - 0.04, 0.2, 0.08);
    }
    rrect(ctx, -1.15, -1.15, 2.3, 2.3, 0.14);
    const gr = ctx.createLinearGradient(-1, -1, 1, 1); gr.addColorStop(0, '#26323c'); gr.addColorStop(1, '#10161c');
    ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = 0.04; ctx.strokeStyle = '#4b6176'; ctx.stroke();
    rrect(ctx, -0.7, -0.7, 1.4, 1.4, 0.08);
    const dg = ctx.createRadialGradient(0, 0, 0.1, 0, 0, 1); dg.addColorStop(0, col); dg.addColorStop(1, '#0b1a22');
    ctx.globalAlpha = 0.55 + 0.15 * Math.sin(this.t * 2.4); ctx.fillStyle = dg; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = col; ctx.lineWidth = 0.03; ctx.stroke();
    // die grid
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 0.015;
    for (let i = -0.5; i <= 0.5; i += 0.25) { ctx.beginPath(); ctx.moveTo(i, -0.7); ctx.lineTo(i, 0.7); ctx.moveTo(-0.7, i); ctx.lineTo(0.7, i); ctx.stroke(); }
    // integrity arc
    ctx.beginPath(); ctx.arc(0, 0, 1.45, -Math.PI / 2, -Math.PI / 2 + TAU * hp);
    ctx.strokeStyle = col; ctx.lineWidth = 0.07; ctx.lineCap = 'round'; ctx.stroke();
    ctx.restore();
    this.text('CPU', cx, cy - 0.12, 0.36, '#e8fbff', { font: 'Orbitron, Inter, sans-serif', weight: 800, anchor: [cx, cy] });
    this.text(`${g.core}/${g.coreMax}`, cx, cy + 0.28, 0.24, col, { weight: 700, anchor: [cx, cy] });
  }

  // ---- buildings -----------------------------------------------------------------
  drawPsu(e) {
    const ctx = this.ctx;
    const load = e.loadS / e.maxW;
    ctx.save(); ctx.translate(e.x, e.y);
    rrect(ctx, -0.44, -0.44, 0.88, 0.88, 0.1);
    const gr = ctx.createLinearGradient(0, -0.44, 0, 0.44); gr.addColorStop(0, '#24323f'); gr.addColorStop(1, '#121a22');
    // frame colour = worst case (all its sockets charging at once) vs 100 W, same colours as wires;
    // flashes red while it is overloaded right now
    const pr = (e.peakW || 0) / e.maxW;
    const peakCol = pr > 1.001 ? '#c23b4e' : pr >= 0.75 ? '#b8912a' : '#2e7d4f';
    ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = 0.05; ctx.strokeStyle = e.overload && Math.sin(this.t * 10) > 0 ? '#ff3b5c' : peakCol; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 0.3, 0, TAU); ctx.fillStyle = '#0a1016'; ctx.fill(); ctx.strokeStyle = '#2e4256'; ctx.lineWidth = 0.025; ctx.stroke();
    ctx.save(); ctx.rotate(e.fan);
    ctx.fillStyle = '#45627d';
    for (let i = 0; i < 5; i++) { ctx.rotate(TAU / 5); ctx.beginPath(); ctx.ellipse(0.13, 0, 0.13, 0.05, 0.5, 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.beginPath(); ctx.arc(0, 0, 0.06, 0, TAU); ctx.fillStyle = '#9cc2e3'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 0.36, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, load));
    ctx.strokeStyle = loadColor(load); ctx.lineWidth = 0.045; ctx.lineCap = 'round'; ctx.stroke();
    ctx.restore();
    this.drawGlow(e.x + 0.34, e.y - 0.34, 0.12, e.overload ? '#ff3b5c' : '#3dff9a', 0.9);
    this.text('PSU', e.x, e.y + 0.56, 0.2, '#9fb7cc', { weight: 700, anchor: [e.x, e.y] });
  }

  drawSplitter(e) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(e.x, e.y);
    poly(ctx, 6, 0.28, Math.PI / 6);
    ctx.fillStyle = '#18232d'; ctx.fill(); ctx.lineWidth = 0.04; ctx.strokeStyle = e.input ? '#e0a23a' : '#6b5a3a'; ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + i * TAU / 3;
      ctx.beginPath(); ctx.arc(Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0.04, 0, TAU);
      ctx.fillStyle = i < e.outputs.length ? '#ffcf6a' : '#3a3324'; ctx.fill();
    }
    ctx.restore();
    if (e.input) this.drawGlow(e.x, e.y, 0.2, '#e0a23a', 0.5);
  }

  drawSocket(s) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(s.x, s.y);
    rrect(ctx, -0.42, -0.42, 0.84, 0.84, 0.07);
    ctx.fillStyle = '#121a20'; ctx.fill();
    const warn = s.turret && s.offline && Math.sin(this.t * 8) > 0;
    ctx.lineWidth = 0.03; ctx.strokeStyle = warn ? '#ff3b5c' : '#3a4b5a'; ctx.stroke();
    ctx.fillStyle = '#b8913f';
    for (let i = 0; i < 5; i++) {
      const o = -0.28 + i * 0.14;
      ctx.fillRect(o - 0.025, -0.4, 0.05, 0.06); ctx.fillRect(o - 0.025, 0.34, 0.05, 0.06);
      ctx.fillRect(-0.4, o - 0.025, 0.06, 0.05); ctx.fillRect(0.34, o - 0.025, 0.06, 0.05);
    }
    rrect(ctx, -0.3, -0.3, 0.6, 0.6, 0.05); ctx.fillStyle = '#0b1115'; ctx.fill();
    // capacitor bar
    const k = s.energy / s.cap;
    ctx.fillStyle = '#05080a'; ctx.fillRect(-0.3, 0.24, 0.6, 0.05);
    ctx.fillStyle = s.offline ? '#ff5b5b' : k < 0.3 ? '#ffc94a' : '#5ee1ff';
    ctx.fillRect(-0.3, 0.24, 0.6 * k, 0.05);
    if (!s.turret) {
      ctx.strokeStyle = 'rgba(94,225,255,0.25)'; ctx.lineWidth = 0.03;
      ctx.beginPath(); ctx.moveTo(-0.1, 0); ctx.lineTo(0.1, 0); ctx.moveTo(0, -0.1); ctx.lineTo(0, 0.1); ctx.stroke();
    }
    ctx.restore();
  }

  // ---- turrets -------------------------------------------------------------------
  drawTurret(s, t) {
    const ctx = this.ctx, col = TURRETS[t.type].color;
    const alive = t.compiled && !s.offline;
    ctx.save(); ctx.translate(s.x, s.y);
    if (t.type === 'cannon') {
      ctx.beginPath(); ctx.arc(0, 0, 0.27, 0, TAU);
      const gr = ctx.createRadialGradient(-0.08, -0.08, 0.02, 0, 0, 0.3); gr.addColorStop(0, '#3a4d5e'); gr.addColorStop(1, '#141d25');
      ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = 0.025; ctx.strokeStyle = col + '88'; ctx.stroke();
      ctx.rotate(t.angle);
      const rk = t.recoil * 0.09;
      rrect(ctx, 0.02 - rk, -0.065, 0.44, 0.13, 0.03);
      const bg = ctx.createLinearGradient(0, -0.07, 0, 0.07); bg.addColorStop(0, '#c9d8e4'); bg.addColorStop(0.5, '#7f95a8'); bg.addColorStop(1, '#3d4d5b');
      ctx.fillStyle = bg; ctx.fill();
      ctx.fillStyle = '#2a3642'; ctx.fillRect(0.38 - rk, -0.08, 0.08, 0.16);
      rrect(ctx, -0.2, -0.16, 0.32, 0.32, 0.07); ctx.fillStyle = '#34485a'; ctx.fill(); ctx.strokeStyle = col; ctx.globalAlpha = 0.7; ctx.lineWidth = 0.02; ctx.stroke(); ctx.globalAlpha = 1;
      ctx.restore();
      if (alive) this.drawGlow(s.x - Math.cos(t.angle) * 0.05, s.y - Math.sin(t.angle) * 0.05, 0.12, col, 0.9);
      if (t.flash > 0) this.drawGlow(s.x + Math.cos(t.angle) * 0.52, s.y + Math.sin(t.angle) * 0.52, 0.32 * t.flash + 0.08, '#fff2b0', t.flash);
      return;
    }
    if (t.type === 'pulse') {
      poly(ctx, 8, 0.3, Math.PI / 8);
      ctx.fillStyle = '#25231a'; ctx.fill(); ctx.lineWidth = 0.025; ctx.strokeStyle = col + '99'; ctx.stroke();
      const charge = 1 - t.reload / TURRETS.pulse.reload;
      ctx.save(); ctx.rotate(this.t * (alive ? 1.5 : 0.2));
      ctx.setLineDash([0.08, 0.06]); ctx.beginPath(); ctx.arc(0, 0, 0.25, 0, TAU);
      ctx.strokeStyle = col; ctx.globalAlpha = 0.3 + 0.6 * charge; ctx.lineWidth = 0.03; ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.restore();
      ctx.beginPath(); ctx.arc(0, 0, 0.17, 0, TAU);
      const dg = ctx.createRadialGradient(-0.05, -0.05, 0.01, 0, 0, 0.17); dg.addColorStop(0, '#fff6c4'); dg.addColorStop(1, '#a87a10');
      ctx.fillStyle = dg; ctx.fill();
      ctx.restore();
      if (alive) this.drawGlow(s.x, s.y, 0.25 + 0.15 * charge + t.pulseT, col, 0.4 + 0.5 * charge);
      return;
    }
    // laser
    ctx.beginPath(); ctx.arc(0, 0, 0.27, 0, TAU);
    ctx.fillStyle = '#231822'; ctx.fill(); ctx.lineWidth = 0.025; ctx.strokeStyle = col + '88'; ctx.stroke();
    ctx.rotate(t.angle);
    ctx.beginPath(); ctx.moveTo(0.38, 0); ctx.lineTo(0.06, 0.15); ctx.lineTo(-0.17, 0.11); ctx.lineTo(-0.17, -0.11); ctx.lineTo(0.06, -0.15); ctx.closePath();
    const lg = ctx.createLinearGradient(-0.17, 0, 0.38, 0); lg.addColorStop(0, '#3b2238'); lg.addColorStop(1, '#6e3a63');
    ctx.fillStyle = lg; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 0.02; ctx.stroke();
    ctx.restore();
    const lx = s.x + Math.cos(t.angle) * 0.3, ly = s.y + Math.sin(t.angle) * 0.3;
    if (alive) this.drawGlow(lx, ly, t.laserOn ? 0.25 : 0.1, col, 1);
  }

  drawBadges(s) {
    const t = s.turret;
    if (!t) return;
    // energy meter (the running program imports `meter`), bottom-left of the tower, split in two:
    //   left : trend arrow  ▲ green gaining (or full) · = yellow about even · ▼ red draining
    //   right: worst case: power used with everything flat out vs power it gets when all sockets on
    //          its wires/PSU charge at once. Bar = use ÷ supply. green ≤ 100% · yellow ≤ 150% · red above
    if (t.compiled && hasMeter(t.code)) {
      const ctx = this.ctx, x0 = s.x - 0.47, y0 = s.y + 0.2, w = 0.44, h = 0.26, tr = s.trend || 0;
      const col = tr > 0 ? '#3dff9a' : tr < 0 ? '#ff5b5b' : '#ffc94a';
      rrect(ctx, x0, y0, w, h, 0.05); ctx.fillStyle = '#0b0f13'; ctx.fill();
      ctx.lineWidth = 0.022; ctx.strokeStyle = col; ctx.stroke();
      // divider
      ctx.fillStyle = '#2a3642'; ctx.fillRect(x0 + w / 2 - 0.005, y0 + 0.04, 0.01, h - 0.08);
      // left half: arrow
      const mx = x0 + w / 4, my = y0 + h / 2;
      ctx.fillStyle = col; ctx.beginPath();
      if (tr > 0) { ctx.moveTo(mx, my - 0.07); ctx.lineTo(mx + 0.07, my + 0.06); ctx.lineTo(mx - 0.07, my + 0.06); }
      else if (tr < 0) { ctx.moveTo(mx, my + 0.07); ctx.lineTo(mx + 0.07, my - 0.06); ctx.lineTo(mx - 0.07, my - 0.06); }
      else { ctx.rect(mx - 0.07, my - 0.05, 0.14, 0.03); ctx.rect(mx - 0.07, my + 0.02, 0.14, 0.03); }
      ctx.fill();
      // right half: worst-case bar (use ÷ supply)
      const wc = this.g.worstCase(s);
      const ratio = wc ? wc.ratio : Infinity, k = Math.max(0, Math.min(1, ratio));
      const bx = x0 + w / 2 + 0.05, bw = w / 2 - 0.1, by = y0 + 0.05, bh = h - 0.1;
      ctx.fillStyle = '#1a232c'; ctx.fillRect(bx, by, bw, bh);
      const over = ratio > 1.5;
      ctx.fillStyle = ratio <= 1.0 ? '#3dff9a' : !over ? '#ffc94a' : (Math.sin(this.t * 6) > -0.3 ? '#ff5b5b' : '#7a2430');
      ctx.fillRect(bx, by + bh * (1 - k), bw, bh * k);
    }
    let label = null, color = null;
    if (!t.compiled) { label = t.error ? '!' : '…'; color = '#ff5b5b'; }
    else if (s.offline) { label = '⚡'; color = '#ff5b5b'; }
    else if (t.runtimeError) { label = '!'; color = '#ff5b5b'; }
    else if (t.starvedUntil > this.g.time) { label = '⚡'; color = '#ffc94a'; }
    else if (t.over) { label = 'CPU'; color = '#ffc94a'; }
    else if (t.draft != null && t.draft !== t.code) { label = '✎'; color = '#9fb7cc'; }
    if (!label) return;
    const ctx = this.ctx, x = s.x + 0.32, y = s.y - 0.34;
    const bob = Math.sin(this.t * 5) * 0.03;
    ctx.beginPath(); ctx.arc(x, y + bob, label.length > 1 ? 0.2 : 0.15, 0, TAU);
    ctx.fillStyle = '#0b0f13'; ctx.fill(); ctx.lineWidth = 0.03; ctx.strokeStyle = color; ctx.stroke();
    this.text(label, x, y + bob + 0.01, label.length > 1 ? 0.13 : 0.2, color, { weight: 800 });
  }

  // ---- enemies --------------------------------------------------------------------
  drawEnemy(e) {
    const ctx = this.ctx, r = e.radius, a = e.anim;
    this.drawGlow(e.x, e.y, r * 2.6, e.def.color, 0.28);
    ctx.save(); ctx.translate(e.x, e.y);
    if (e.type === 'rootkit') this.drawRootkit(e);
    else {
      ctx.rotate(e.dir);
      if (e.type === 'bug') {
        ctx.strokeStyle = '#ff8fa3'; ctx.lineWidth = 0.025; ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) for (const sd of [-1, 1]) {
          const sw = Math.sin(a + i * 2 + (sd > 0 ? Math.PI : 0)) * 0.06;
          ctx.beginPath(); ctx.moveTo(i * 0.09, sd * 0.08); ctx.lineTo(i * 0.13 + sw, sd * 0.26); ctx.stroke();
        }
        ctx.beginPath(); ctx.ellipse(-0.03, 0, r, r * 0.68, 0, 0, TAU);
        const gr = ctx.createLinearGradient(0, -r, 0, r); gr.addColorStop(0, '#ff7088'); gr.addColorStop(1, '#a3123a');
        ctx.fillStyle = gr; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r * 0.6, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(r * 0.82, 0, r * 0.42, 0, TAU); ctx.fillStyle = '#ff8fa3'; ctx.fill();
        ctx.strokeStyle = '#ff8fa3'; ctx.lineWidth = 0.015;
        ctx.beginPath(); ctx.moveTo(r * 1.1, -0.05); ctx.lineTo(r * 1.6, -0.16 + Math.sin(a) * 0.03); ctx.moveTo(r * 1.1, 0.05); ctx.lineTo(r * 1.6, 0.16 - Math.sin(a) * 0.03); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * 1.0, -0.05, 0.03, 0, TAU); ctx.arc(r * 1.0, 0.05, 0.03, 0, TAU); ctx.fill();
      } else if (e.type === 'worm') {
        for (let i = 5; i >= 0; i--) {
          const x = -i * 0.12, y = Math.sin(a * 0.7 - i * 0.9) * 0.06, rr = 0.13 - i * 0.013;
          ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU);
          ctx.fillStyle = i % 2 ? '#3fcf3a' : '#7dff6a'; ctx.fill();
          ctx.strokeStyle = 'rgba(0,40,0,0.5)'; ctx.lineWidth = 0.015; ctx.stroke();
        }
        ctx.fillStyle = '#0b2a0b'; ctx.beginPath(); ctx.arc(0.06, -0.05, 0.025, 0, TAU); ctx.arc(0.06, 0.05, 0.025, 0, TAU); ctx.fill();
      } else if (e.type === 'mite') {
        ctx.translate(Math.sin(a * 3.1) * 0.02, Math.cos(a * 2.7) * 0.02);
        ctx.rotate(a * 0.5);
        ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 0.02;
        for (let i = 0; i < 8; i++) { const an = i * TAU / 8; ctx.beginPath(); ctx.moveTo(Math.cos(an) * r, Math.sin(an) * r); ctx.lineTo(Math.cos(an) * (r + 0.07), Math.sin(an) * (r + 0.07)); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.strokeStyle = '#9a7400'; ctx.stroke();
        ctx.fillStyle = '#5a3a00'; ctx.beginPath(); ctx.arc(0.05, 0, 0.03, 0, TAU); ctx.fill();
      } else if (e.type === 'forkbomb') {
        // three "child processes" orbit the core
        for (let i = 0; i < 3; i++) {
          const an = a * 0.8 + i * TAU / 3;
          ctx.beginPath(); ctx.arc(Math.cos(an) * r * 0.95, Math.sin(an) * r * 0.95, r * 0.32, 0, TAU);
          ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.strokeStyle = '#9a5a00'; ctx.lineWidth = 0.015; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, TAU);
        const gr = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0.01, 0, 0, r * 0.72);
        gr.addColorStop(0, '#ffc08a'); gr.addColorStop(1, '#c4460f');
        ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = '#ffb37a'; ctx.lineWidth = 0.02; ctx.stroke();
        ctx.strokeStyle = '#3a1200'; ctx.lineWidth = 0.03; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-r * 0.3, 0); ctx.lineTo(r * 0.3, 0); ctx.moveTo(0, 0); ctx.lineTo(r * 0.25, -r * 0.3); ctx.moveTo(0, 0); ctx.lineTo(r * 0.25, r * 0.3); ctx.stroke();
      } else if (e.type === 'beetle') {
        ctx.strokeStyle = '#2f435a'; ctx.lineWidth = 0.035; ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) for (const sd of [-1, 1]) {
          const sw = Math.sin(a * 0.8 + i * 2 + (sd > 0 ? Math.PI : 0)) * 0.05;
          ctx.beginPath(); ctx.moveTo(i * 0.12, sd * 0.12); ctx.lineTo(i * 0.16 + sw, sd * 0.36); ctx.stroke();
        }
        ctx.beginPath(); ctx.ellipse(r * 0.85, 0, 0.12, 0.1, 0, 0, TAU); ctx.fillStyle = '#26384b'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(-0.02, 0, r, r * 0.8, 0, 0, TAU);
        const gr = ctx.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, '#cfe3ff'); gr.addColorStop(0.4, '#7fa6cf'); gr.addColorStop(1, '#2d4864');
        ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = '#d9ebff'; ctx.lineWidth = 0.02; ctx.stroke();
        ctx.strokeStyle = 'rgba(10,25,40,0.7)'; ctx.lineWidth = 0.025;
        ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r * 0.75, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(-0.05, 0, r * 0.55, -1.2, 1.2); ctx.stroke();
      }
    }
    ctx.restore();
    if (e.flash > 0) this.drawGlow(e.x, e.y, r * 1.6, '#ffffff', e.flash * 5);
    // health
    if (e.hp < e.maxHp || e.shield > 0) {
      const w = Math.max(0.5, r * 2), y = e.y - r - 0.16;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(e.x - w / 2 - 0.02, y - 0.03, w + 0.04, 0.08);
      const k = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = loadColor(1 - k); ctx.fillRect(e.x - w / 2, y - 0.01, w * k, 0.04);
      if (e.shieldMax) { ctx.fillStyle = '#7ab8ff'; ctx.fillRect(e.x - w / 2, y - 0.07, w * e.shield / e.shieldMax, 0.035); }
    }
  }

  drawRootkit(e) {
    const ctx = this.ctx, r = e.radius;
    const sh = e.shieldMax ? e.shield / e.shieldMax : 0;
    if (sh > 0) {
      ctx.save(); ctx.rotate(this.t * 0.8);
      for (let k = 0; k < 6; k++) {
        const an = k * TAU / 6;
        ctx.save(); ctx.translate(Math.cos(an) * r * 1.25, Math.sin(an) * r * 1.25); ctx.rotate(an);
        poly(ctx, 6, 0.14); ctx.fillStyle = `rgba(196,139,255,${0.15 + 0.4 * sh})`; ctx.fill();
        ctx.strokeStyle = `rgba(220,180,255,${0.3 + 0.6 * sh})`; ctx.lineWidth = 0.02; ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.rotate(-this.t * 0.3);
    poly(ctx, 6, r); ctx.fillStyle = '#1e0d2a'; ctx.fill(); ctx.strokeStyle = '#b15cff'; ctx.lineWidth = 0.045; ctx.stroke();
    poly(ctx, 6, r * 0.62, Math.PI / 6);
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.62); gr.addColorStop(0, '#5a1f7a'); gr.addColorStop(1, '#2a0f3a');
    ctx.fillStyle = gr; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, TAU); ctx.fillStyle = '#ff2d55'; ctx.fill();
    this.drawGlow(0, 0, r * 0.6, '#ff2d55', 0.5 + 0.3 * Math.sin(this.t * 4));
  }

  // ---- projectiles / beams / fx ----------------------------------------------------
  drawShells() {
    const ctx = this.ctx;
    for (const s of this.g.shells) {
      ctx.strokeStyle = 'rgba(160,240,255,0.5)'; ctx.lineWidth = s.size; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.x - s.vx * 0.02, s.y - s.vy * 0.02); ctx.lineTo(s.x, s.y); ctx.stroke();
      this.drawGlow(s.x, s.y, s.size * 3.5, '#5ee1ff', 1);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size * 0.7, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill();
    }
  }

  drawLasers() {
    const ctx = this.ctx;
    for (const s of this.g.sockets()) {
      const t = s.turret;
      if (!t || t.type !== 'laser' || !t.laserOn) continue;
      const sx = s.x + Math.cos(t.angle) * 0.32, sy = s.y + Math.sin(t.angle) * 0.32;
      let ex, ey;
      if (t.laserHit) { ex = t.laserHit.x; ey = t.laserHit.y; }
      else { ex = s.x + Math.cos(t.angle) * t.cfg.range; ey = s.y + Math.sin(t.angle) * t.cfg.range; }
      const f = 0.8 + Math.random() * 0.4, w = 0.03 + t.cfg.power / 900;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,94,168,0.35)'; ctx.lineWidth = w * 4 * f;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,230,245,0.95)'; ctx.lineWidth = w * f; ctx.stroke();
      ctx.restore();
      this.drawGlow(ex, ey, 0.25 * f, '#ff5ea8', t.laserHit ? 1 : 0.4);
    }
  }

  drawFx() {
    const ctx = this.ctx;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of this.g.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
    for (const f of this.g.fx) {
      const k = f.t / f.life;
      if (f.type === 'ring') {
        ctx.beginPath(); ctx.arc(f.x, f.y, Math.max(0.01, f.r * (0.15 + 0.85 * Math.sqrt(k))), 0, TAU);
        ctx.strokeStyle = f.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 0.02 + 0.1 * (1 - k); ctx.stroke();
        ctx.fillStyle = f.color; ctx.globalAlpha = 0.12 * (1 - k); ctx.fill(); ctx.globalAlpha = 1;
      } else if (f.type === 'text') {
        ctx.globalAlpha = 1;
        this.text(f.text, f.x, f.y - k * 0.5, f.small ? 0.16 : 0.24, f.color, { stroke: 'rgba(0,0,0,0.8)', weight: 800, anchor: [f.x, f.y] });
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---- interaction overlays ----------------------------------------------------------
  drawOverlayUnder() {
    const ui = this.ui; if (!ui) return;
    const ctx = this.ctx, g = this.g;
    const sel = ui.selected && g.ents.get(ui.selected);
    const hov = ui.hoverTile && g.entAt(ui.hoverTile.c, ui.hoverTile.r);
    const showRange = (s, strong) => {
      if (!s?.turret) return;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.turret.cfg.range, 0, TAU);
      ctx.fillStyle = `rgba(94,225,255,${strong ? 0.07 : 0.04})`; ctx.fill();
      ctx.setLineDash([0.15, 0.1]); ctx.lineDashOffset = -this.t * 0.3;
      ctx.strokeStyle = `rgba(94,225,255,${strong ? 0.6 : 0.3})`; ctx.lineWidth = 0.025; ctx.stroke(); ctx.setLineDash([]);
    };
    if (sel) showRange(sel, true);
    if (hov && hov !== sel && ui.tool === 'select') showRange(hov, false);
  }

  drawOverlayOver() {
    const ui = this.ui; if (!ui) return;
    const ctx = this.ctx, g = this.g, tool = ui.tool, h = ui.hoverTile;
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 5);
    const outline = (e, color, a = 1) => {
      rrect(ctx, e.c + 0.04, e.r + 0.04, 0.92, 0.92, 0.1);
      ctx.strokeStyle = color; ctx.globalAlpha = a; ctx.lineWidth = 0.05; ctx.stroke(); ctx.globalAlpha = 1;
    };
    // lesson highlight: gold pulsing ring + arrow over the parts the current task is about
    for (const id of ui.focus?.ents || []) {
      const e = g.ents.get(id); if (!e) continue;
      const k = 0.5 + 0.5 * Math.sin(this.t * 4);
      ctx.beginPath(); ctx.arc(e.x, e.y, 0.62 + 0.06 * k, 0, TAU);
      ctx.strokeStyle = '#ffcf6a'; ctx.globalAlpha = 0.55 + 0.45 * k; ctx.lineWidth = 0.06; ctx.stroke(); ctx.globalAlpha = 1;
      const ay = e.y - 0.95 - 0.12 * k;
      ctx.beginPath(); ctx.moveTo(e.x - 0.16, ay - 0.16); ctx.lineTo(e.x + 0.16, ay - 0.16); ctx.lineTo(e.x, ay + 0.06); ctx.closePath();
      ctx.fillStyle = '#ffcf6a'; ctx.fill();
    }
    const sel = ui.selected && g.ents.get(ui.selected);
    if (sel) { ctx.setLineDash([0.12, 0.08]); ctx.lineDashOffset = -this.t * 0.4; outline(sel, '#e8fbff'); ctx.setLineDash([]); }
    const selW = ui.selWire && g.wires.get(ui.selWire);
    if (selW) {
      ctx.beginPath(); selW.route.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.setLineDash([0.14, 0.1]); ctx.lineDashOffset = -this.t * 0.6;
      ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 0.09; ctx.lineJoin = 'round'; ctx.stroke(); ctx.setLineDash([]);
      // how much this wire carries vs its limit, at the middle of its longest segment
      let best = 0, mx = 0, my = 0;
      for (let i = 0; i < selW.route.length - 1; i++) {
        const [x1, y1] = selW.route[i], [x2, y2] = selW.route[i + 1], l = Math.abs(x2 - x1) + Math.abs(y2 - y1);
        if (l > best) { best = l; mx = (x1 + x2) / 2; my = (y1 + y2) / 2; }
      }
      const W = selW.aS * 12, maxW = selW.maxA * 12, P = selW.peakW || 0;
      this.text(`${Math.round(W)} / ${maxW} W · peak ${Math.round(P)} W`, mx, my - 0.32, 0.26, P > maxW ? '#ff7a8f' : P >= maxW * 0.75 ? '#ffcf6a' : '#e8fbff', { stroke: '#031009', anchor: [mx, my] });
    }
    // hovering a wire with Select/Sell: preview what a tap would pick
    if (h && (tool === 'select' || tool === 'sell') && !g.entAt(h.c, h.r)) {
      const hw = g.wireAt(h.c + 0.5, h.r + 0.5, 0.5);
      if (hw && hw !== selW) {
        ctx.beginPath(); hw.route.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.strokeStyle = tool === 'sell' ? 'rgba(255,59,92,0.7)' : 'rgba(232,251,255,0.35)'; ctx.lineWidth = 0.09; ctx.stroke();
      }
    }

    if (['socket', 'splitter', 'psu'].includes(tool) && h) {
      const pv = g.buildPreview(tool, h.c, h.r);
      const ok = pv.ok, join = ok && !!pv.wire;   // gold = the part will be spliced into this wire
      rrect(ctx, h.c + 0.04, h.r + 0.04, 0.92, 0.92, 0.1);
      ctx.fillStyle = join ? 'rgba(255,207,106,0.15)' : ok ? 'rgba(61,255,154,0.12)' : 'rgba(255,59,92,0.15)'; ctx.fill();
      ctx.strokeStyle = join ? '#ffcf6a' : ok ? '#3dff9a' : '#ff3b5c'; ctx.lineWidth = 0.04; ctx.stroke();
      if (join) {
        // show where the new (paid) wire will run: from this tile on to the part the old wire fed
        const to = g.ents.get(pv.wire.to);
        ctx.beginPath(); ctx.moveTo(h.c + 0.5, h.r + 0.5); ctx.lineTo(to.x, h.r + 0.5); ctx.lineTo(to.x, to.y);
        ctx.setLineDash([0.12, 0.08]); ctx.lineDashOffset = -this.t; ctx.strokeStyle = '#ffcf6a'; ctx.lineWidth = 0.05; ctx.stroke(); ctx.setLineDash([]);
        const afford = g.credits >= pv.total;
        this.text(`joins wire · new wire +${pv.extra} = ${pv.total} cr`, h.c + 0.5, h.r - 0.2, 0.22, afford ? '#ffcf6a' : '#ff7a8f', { stroke: '#031009', anchor: [h.c + 0.5, h.r + 0.5] });
      }
    }
    if (['cannon', 'pulse', 'laser'].includes(tool)) {
      for (const s of g.sockets()) if (!s.turret) outline(s, TURRETS[tool].color, 0.3 + 0.6 * pulse);
      if (h) {
        const e = g.entAt(h.c, h.r);
        if (e?.type === 'socket' && !e.turret) {
          ctx.beginPath(); ctx.arc(e.x, e.y, 3, 0, TAU);
          ctx.strokeStyle = 'rgba(94,225,255,0.3)'; ctx.setLineDash([0.15, 0.1]); ctx.lineWidth = 0.025; ctx.stroke(); ctx.setLineDash([]);
        }
      }
    }
    if (tool === 'wire') {
      const from = ui.wireFrom && g.ents.get(ui.wireFrom);
      if (!from) {
        for (const e of g.ents.values()) if (PORTS[e.type] && e.outputs.length < PORTS[e.type]) outline(e, '#ffcf6a', 0.3 + 0.6 * pulse);
      } else {
        outline(from, '#ffcf6a');
        for (const e of g.ents.values()) if (e !== from && e.type !== 'psu' && !e.input) outline(e, '#3dff9a', 0.25 + 0.5 * pulse);
        if (h) {
          const tx = h.c + 0.5, ty = h.r + 0.5;
          ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(tx, from.y); ctx.lineTo(tx, ty);
          ctx.setLineDash([0.12, 0.08]); ctx.lineDashOffset = -this.t; ctx.strokeStyle = '#ffcf6a'; ctx.lineWidth = 0.06; ctx.stroke(); ctx.setLineDash([]);
          const tgt = g.entAt(h.c, h.r);
          if (tgt && tgt !== from && tgt.type !== 'psu' && !tgt.input) {
            const cost = g.wireCost(from, tgt);
            this.text(`wire ${cost} cr`, tx, ty - 0.6, 0.22, g.credits >= cost ? '#ffcf6a' : '#ff7a8f', { stroke: '#031009', anchor: [tx, ty] });
          }
        }
      }
    }
    if (tool === 'sell' && h) {
      const e = g.entAt(h.c, h.r);
      if (e) outline(e, '#ff3b5c', 0.6 + 0.4 * pulse);
    }
  }
}
