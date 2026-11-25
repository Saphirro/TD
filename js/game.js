// ---------------------------------------------------------------------------
// Game simulation: grid, buildings, power network, turrets, enemies, waves.
// ---------------------------------------------------------------------------
import {
  COLS, ROWS, CODE_HZ, SELL_REFUND, WIRE_COST_PER_TILE, POWER, LIMITS, BUILDINGS, PORTS, UPGRADES, EXTRA_MODULES,
  TURRETS, ENEMIES, TEMPLATES, MAPS, DEFAULT_LIBRARY, findMap,
} from './data.js';

export const SAVE_VERSION = 1;

const DEG = Math.PI / 180;
const STEP = 1 / 60;
const angDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const fmt1 = n => (Math.round(n * 10) / 10).toString();
const defaultCfg =() => Object.fromEntries(Object.entries(LIMITS).map(([k, v]) => [k, v[2]]));

export class Game {
  constructor(py, mapId = MAPS[0].id) {
    this.py = py;
    this.listeners = {};
    this.setMap(mapId, false);
  }

  // switch map (also resets the game). Precomputes path geometry for every lane.
  setMap(mapId, emit = true) {
    this.map = findMap(mapId) || MAPS[0];
    this.paths = this.map.paths.map(pts => {
      const segs = [];
      let total = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
        const len = Math.hypot(x2 - x1, y2 - y1);
        segs.push({ x1, y1, x2, y2, len, start: total, dx: (x2 - x1) / len, dy: (y2 - y1) / len });
        total += len;
      }
      return { segs, len: total };
    });
    this.pathLen = Math.max(...this.paths.map(p => p.len));
    this.reset();
    if (emit) this.emit('map');
  }

  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  emit(ev, ...a) { (this.listeners[ev] || []).forEach(f => f(...a)); }

  reset(withStarter = true) {
    const M = this.map;
    this.nextId = 1;
    this.nextEnemyId = 1;
    this.time = 0;
    this.acc = 0;
    this.codeAcc = 0;
    const B = this.boost || {};   // Lab boosts of the current player (set by the UI before a map starts)
    this.credits = M.start.credits + (B.credits || 0);
    this.core = M.start.core + (B.core || 0);
    this.coreMax = M.start.core + (B.core || 0);
    this.library = { code: DEFAULT_LIBRARY, error: null, logs: [], logVersion: 0, draft: null };
    this.wave = 0;              // number of waves cleared
    this.phase = 'build';       // build | wave | lost | won
    this.ents = new Map();
    this.wires = new Map();
    this.enemies = [];
    this.shells = [];
    this.particles = [];
    this.fx = [];
    this.spawnQ = [];
    this.waveTime = 0;
    this.stats = { kills: 0, leaks: 0 };
    this.flags = {};   // one-off things the player did (e.g. looked at the PSU), for lesson tasks
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.blocked = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    for (const p of this.paths) for (const s of p.segs) {
      const n = Math.ceil(s.len * 2);
      for (let i = 0; i <= n; i++) {
        const x = s.x1 + (s.x2 - s.x1) * i / n, y = s.y1 + (s.y2 - s.y1) * i / n;
        const c = Math.floor(x), r = Math.floor(y);
        if (c >= 0 && c < COLS && r >= 0 && r < ROWS) this.blocked[r][c] = 'path';
      }
    }
    const C = M.core;
    for (let r = C.r; r < C.r + C.h; r++) for (let c = C.c; c < C.c + C.w; c++) this.blocked[r][c] = 'core';

    this.syncLibrary();
    if (this.py.ready) this.py.resetShared();   // mem notebook starts empty
    if (withStarter) M.starter(this);   // e.g. map 1: PSU -> socket -> cannon with unfinished code
    this.emit('change');
  }

  // ---- save / load (only between waves) ------------------------------------
  serialize() {
    const ents = [...this.ents.values()].map(e => ({
      id: e.id, type: e.type, c: e.c, r: e.r, spent: e.spent, level: e.level || 1,
      energy: e.type === 'socket' ? Math.round(e.energy) : undefined,
      turret: e.turret ? { type: e.turret.type, code: e.turret.code, draft: e.turret.draft } : undefined,
    }));
    const wires = [...this.wires.values()].map(w => ({ from: w.from, to: w.to, ri: w.ri, spent: w.spent || 0 }));
    return {
      v: SAVE_VERSION, map: this.map.id, wave: this.wave, credits: this.credits, core: this.core,
      stats: this.stats, ents, wires, library: { code: this.library.code, draft: this.library.draft },
      savedAt: Date.now(),
    };
  }

  load(d) {
    if (!d || d.v !== SAVE_VERSION) return false;
    if (d.map !== this.map.id) this.setMap(d.map, false);
    this.reset(false);
    Object.assign(this, { wave: d.wave, credits: d.credits, core: d.core, stats: d.stats || this.stats });
    this.library.code = d.library?.code ?? DEFAULT_LIBRARY;
    this.library.draft = d.library?.draft ?? null;
    const idMap = {};
    for (const e of d.ents) {
      const n = this.addEntity(e.type, e.c, e.r);
      n.spent = e.spent;
      this.applyLevel(n, e.level || 1);
      idMap[e.id] = n;
      if (n.type === 'socket') { n.energy = e.energy ?? 0; n.offline = n.energy < n.cap * POWER.brownoutResume; }
    }
    for (const w of d.wires) {
      const a = idMap[w.from], b = idMap[w.to];
      if (!a || !b) continue;
      const nw = this.addWire(a.id, b.id, { spent: w.spent || 0 });
      if (typeof nw === 'object' && w.ri < nw.routes.length) { nw.ri = w.ri; nw.route = nw.routes[w.ri]; }
    }
    this.syncLibrary();
    for (const e of d.ents) {
      if (!e.turret) continue;
      const t = this.addTurret(idMap[e.id], e.turret.type, e.turret.code);
      t.draft = e.turret.draft ?? null;
    }
    this.emit('change');
    return true;
  }

  // ---- queries ------------------------------------------------------------
  sockets() { return [...this.ents.values()].filter(e => e.type === 'socket'); }
  psus() { return [...this.ents.values()].filter(e => e.type === 'psu'); }
  entAt(c, r) { const id = this.grid[r]?.[c]; return id ? this.ents.get(id) : null; }
  enemyById(id) { return this.enemies.find(e => e.id === id); }
  canPlace(c, r) { return c >= 0 && r >= 0 && c < COLS && r < ROWS && !this.blocked[r][c] && !this.grid[r][c]; }
  nextWave() { return this.wave + 1; }
  // Lessons belong to waves. A "half" lesson (e.g. 3½) shares the wave of the lesson before it and
  // shows up once that lesson's tasks are done. this.lessonDone is the UI's set of finished tasks.
  lessonPlan() {
    const L = this.map.lessons;
    if (this._planFor !== L) {
      let wave = 0, n = 0;
      this._plan = L.map(l => { if (!l.half) { wave++; n++; } return { wave, label: l.half ? `${n}½` : `${n}` }; });
      this._planFor = L;
    }
    return this._plan;
  }
  lessonLabel(i = this.lessonIndex()) { return this.map.endless ? '∞' : this.lessonPlan()[i]?.label ?? String(i + 1); }
  lessonIndex() {
    const L = this.map.lessons, plan = this.lessonPlan(), done = this.lessonDone || new Set();
    const lastWave = plan[plan.length - 1].wave, w = Math.min(this.wave + 1, lastWave);
    const ids = plan.map((p, i) => (p.wave === w ? i : -1)).filter(i => i >= 0);
    for (const i of ids) {
      const open = L[i].tasks.some((t, k) => !done.has(`${i}:${k}`));   // the UI marks tasks done (with a toast) first
      if (open) return i;
    }
    return ids[ids.length - 1];
  }
  lesson() { return this.map.lessons[this.lessonIndex()]; }
  unlockWave(type) { return this.map.unlock[type] ?? 99; }
  isUnlocked(type) { return this.unlockWave(type) <= this.nextWave(); }
  totalPower() {
    let cap = 0, load = 0;
    for (const p of this.psus()) { cap += p.maxW; load += p.loadS || 0; }
    return { cap, load };
  }

  posAt(dist, lane = 0) {
    const P = this.paths[lane] || this.paths[0];
    const d = Math.max(0, Math.min(P.len, dist));
    for (const s of P.segs) {
      if (d <= s.start + s.len) {
        const t = d - s.start;
        return { x: s.x1 + s.dx * t, y: s.y1 + s.dy * t, dx: s.dx, dy: s.dy };
      }
    }
    const s = P.segs[P.segs.length - 1];
    return { x: s.x2, y: s.y2, dx: s.dx, dy: s.dy };
  }

  // ---- building -----------------------------------------------------------
  addEntity(type, c, r) {
    const e = { id: this.nextId++, type, c, r, x: c + 0.5, y: r + 0.5, input: null, outputs: [], spent: BUILDINGS[type].cost };
    if (type === 'psu') Object.assign(e, { level: 1, maxW: UPGRADES.psu[0].maxW, loadW: 0, loadS: 0, demandW: 0, overload: false, fan: 0 });
    if (type === 'socket') Object.assign(e, { energy: 0, inW: 0, inS: 0, turret: null, offline: true });
    if (UPGRADES[type]) this.applyLevel(e, 1);   // level 1 values: PSU maxW · socket chargeW, cap, slots, cpu
    this.ents.set(e.id, e);
    this.grid[r][c] = e.id;
    return e;
  }

  build(type, c, r) {
    const def = BUILDINGS[type];
    if (!this.canPlace(c, r)) return this.fail("Can't build there.");
    // a wire already runs over this tile: the new part gets spliced into it
    const pv = this.buildPreview(type, c, r);
    if (!pv.ok) return this.fail(pv.msg);
    if (this.credits < pv.total) return this.fail(pv.extra ? `Need ${pv.total} credits: ${def.name} ${def.cost} + new wire ${pv.extra}.` : `Need ${def.cost} credits for a ${def.name}.`);
    this.credits -= def.cost;
    const e = this.addEntity(type, c, r);
    if (pv.wire) this.splice(pv.wire, e);
    this.burst(e.x, e.y, '#5ee1ff', 10, 1.5);
    this.emit('sfx', 'build');
    this.emit('change');
    return e;
  }

  fail(msg) { this.emit('toast', msg, 'bad'); return null; }

  // ---- upgrades: PSU output, socket charging speed + capacitor --------------------------
  applyLevel(e, level) {
    const U = UPGRADES[e.type]; if (!U) return;
    e.level = Math.max(1, Math.min(U.length, level));
    Object.assign(e, U[e.level - 1]);
    delete e.cost;   // (the level table has a cost field; it isn't a property of the part)
    const B = this.boost || {};   // Lab boosts add on top of every level
    if (e.type === 'psu') e.maxW += B.psuW || 0;
    if (e.type === 'socket') { e.chargeW += B.chargeW || 0; e.slots += B.slots || 0; }
  }
  // what the next upgrade of this part would be, or why there is none
  upgradeInfo(e) {
    const U = UPGRADES[e?.type]; if (!U) return null;
    const next = U[(e.level || 1)];
    const at = this.map.unlock?.upgrades ?? 99;
    if (!next) return { max: true };
    return { next, cost: next.cost, locked: at > this.nextWave() ? at : 0 };
  }
  upgrade(e) {
    const u = this.upgradeInfo(e);
    if (!u) return this.fail('This part has no upgrades.');
    if (u.max) return this.fail('Already fully upgraded.');
    if (u.locked) return this.fail(`Upgrades unlock at wave ${u.locked}.`);
    if (this.credits < u.cost) return this.fail(`Need ${u.cost} credits for this upgrade.`);
    this.credits -= u.cost;
    e.spent += u.cost;
    this.applyLevel(e, e.level + 1);
    this.burst(e.x, e.y, '#ffcf6a', 16, 2);
    this.emit('sfx', 'upload');
    this.emit('change');
    return e;
  }

  // what building `type` on (c, r) would do. Building on a wire splices the part in:
  // the source side of the old wire becomes the new part's input (reused, free), and a NEW wire
  // (paid) runs from the new part on to the part the old wire fed, so the chain is not broken.
  buildPreview(type, c, r) {
    const def = BUILDINGS[type];
    if (!this.canPlace(c, r)) return { ok: false, msg: "Can't build there." };
    const through = this.wiresThrough(c, r);
    if (through.length > 1) return { ok: false, msg: 'Two wires cross here. Move one (tap it → Route ↻) or build on another tile.' };
    if (through.length && type === 'psu') return { ok: false, msg: 'A wire runs here, and a PSU can\'t sit on a wire. Move the wire (tap it → Route ↻) or build somewhere else.' };
    if (!through.length) return { ok: true, wire: null, extra: 0, total: def.cost };
    const w = through[0];
    const extra = this.wireCost({ x: c + 0.5, y: r + 0.5, c, r }, this.ents.get(w.to));
    return { ok: true, wire: w, extra, total: def.cost + extra };
  }

  // price of a new wire between two parts, by the length of its best route
  wireCost(a, b) {
    const p = this.routeOptions(a, b)[0];
    let len = 0;
    for (let i = 0; i < p.length - 1; i++) len += Math.abs(p[i + 1][0] - p[i][0]) + Math.abs(p[i + 1][1] - p[i][1]);
    return Math.max(1, Math.round(len)) * WIRE_COST_PER_TILE;
  }

  // wires whose route runs over the middle of tile (c, r)
  wiresThrough(c, r) {
    const x = c + 0.5, y = r + 0.5, out = [];
    for (const w of this.wires.values()) {
      const p = w.route;
      for (let i = 0; i < p.length - 1; i++) {
        const [x1, y1] = p[i], [x2, y2] = p[i + 1];
        const onX = x1 === x2 && Math.abs(x - x1) < 0.01 && y >= Math.min(y1, y2) && y <= Math.max(y1, y2);
        const onY = y1 === y2 && Math.abs(y - y1) < 0.01 && x >= Math.min(x1, x2) && x <= Math.max(x1, x2);
        if (onX || onY) { out.push(w); break; }
      }
    }
    return out;
  }

  // cut wire A→B and put part e in between: A→e→B
  splice(w, e) {
    const a = this.ents.get(w.from), b = this.ents.get(w.to);
    const spent = w.spent || 0;
    this.removeWire(w.id);
    const w1 = this.addWire(a.id, e.id, { spent });         // the old wire, now ending at the new part
    const w2 = this.addWire(e.id, b.id, { pay: true });     // new, paid wire on to the old target
    const name = x => x.type === 'socket' ? `Socket #${x.id}` : `${BUILDINGS[x.type].name} #${x.id}`;
    if (typeof w1 === 'object' && typeof w2 === 'object') {
      this.emit('toast', `Joined the wire: ${name(a)} → ${name(e)} → ${name(b)} (new wire −${w2.spent} credit${w2.spent === 1 ? '' : 's'}). Everything after ${name(a)} shares that first wire's ${POWER.wireA * POWER.volt} W.`, 'info');
    }
  }

  // opts.pay: charge the wire's price now; opts.spent: value carried over (saves, splices)
  addWire(fromId, toId, opts = {}) {
    const a = this.ents.get(fromId), b = this.ents.get(toId);
    if (!a || !b || a === b) return 'Pick two different parts.';
    if (!PORTS[a.type]) return 'Wires start from a PSU, a Splitter or a Socket.';
    if (b.type === 'psu') return 'A PSU is a source; it can\'t be powered by a wire.';
    if (a.outputs.length >= PORTS[a.type]) return `This ${BUILDINGS[a.type].name} has no free outputs (${PORTS[a.type]} max).`;
    if (b.input) return 'That part already has a power input.';
    // cycle check: walk up from a; must not reach b
    let cur = a;
    while (cur && cur.input) {
      const w = this.wires.get(cur.input);
      cur = this.ents.get(w.from);
      if (cur === b) return 'That would make a loop.';
    }
    let spent = opts.spent || 0;
    if (opts.pay) {
      spent = this.wireCost(a, b);
      if (this.credits < spent) return `Need ${spent} credits for this wire (${WIRE_COST_PER_TILE} per tile).`;
      this.credits -= spent;
    }
    const w = { id: this.nextId++, from: a.id, to: b.id, maxA: POWER.wireA + (this.boost?.wireA || 0), a: 0, aS: 0, phase: 0, ri: 0, spent };
    w.routes = this.routeOptions(a, b);
    w.route = w.routes[0];
    this.wires.set(w.id, w);
    a.outputs.push(w.id);
    b.input = w.id;
    this.emit('change');
    return w;
  }

  // take one part off the power network. A socket in the middle of a chain (A → s → B) is cut out
  // and A is wired straight to B, so the rest of the chain keeps its power. The part keeps whatever
  // is left in its capacitor and runs it down on its own.
  unplug(ent) {
    if (!ent?.input) return;
    const inW = this.wires.get(ent.input);
    if (ent.type === 'socket' && ent.outputs.length === 1) {
      const outW = this.wires.get(ent.outputs[0]);
      const up = inW.from, down = outW.to, spent = inW.spent || 0;
      this.removeWire(inW.id, false);       // its value moves to the bridging wire
      this.removeWire(outW.id, true);
      const nw = this.addWire(up, down, { spent });
      if (typeof nw === 'object') this.emit('toast', `Socket #${ent.id} unplugged. The chain stays connected: #${up} now feeds #${down} directly.`, 'info');
    } else {
      this.removeWire(ent.input, true);
    }
    this.emit('change');
  }

  removeWire(wid, refund = false) {
    const w = this.wires.get(wid);
    if (!w) return;
    if (refund) this.credits += Math.floor((w.spent || 0) * SELL_REFUND);
    const a = this.ents.get(w.from), b = this.ents.get(w.to);
    if (a) a.outputs = a.outputs.filter(x => x !== wid);
    if (b) b.input = null;
    this.wires.delete(wid);
    this.emit('change');
  }

  wirePoints(w) { return w.route; }

  // switch a wire to its next possible route (player-controlled)
  cycleRoute(w) {
    if (!w || w.routes.length < 2) return;
    w.ri = (w.ri + 1) % w.routes.length;
    w.route = w.routes[w.ri];
    this.emit('change');
  }

  // the wire whose route passes closest to (x, y), within `tol` tiles
  wireAt(x, y, tol = 0.3) {
    let best = null, bestD = tol;
    for (const w of this.wires.values()) {
      const p = w.route;
      for (let i = 0; i < p.length - 1; i++) {
        const [x1, y1] = p[i], [x2, y2] = p[i + 1];
        const L2 = (x2 - x1) ** 2 + (y2 - y1) ** 2 || 1;
        const k = Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / L2));
        const d = Math.hypot(x - (x1 + k * (x2 - x1)), y - (y1 + k * (y2 - y1)));
        if (d < bestD) { bestD = d; best = w; }
      }
    }
    return best;
  }

  // all sensible routes (L-shapes, then small detours), best first
  routeOptions(a, b) {
    const cost = (pts) => {
      let n = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
        const steps = Math.round(Math.abs(x2 - x1) + Math.abs(y2 - y1));
        for (let k = 1; k < steps; k++) {
          const e = this.entAt(Math.floor(x1 + (x2 - x1) * k / steps), Math.floor(y1 + (y2 - y1) * k / steps));
          if (e && e !== a && e !== b) n += 10;
        }
      }
      return n;
    };
    const A = [a.x, a.y], B = [b.x, b.y];
    const options = [[A, [b.x, a.y], B], [A, [a.x, b.y], B]];
    for (const d of [1, -1, 2, -2]) {
      options.push([A, [a.x, a.y + d], [b.x, a.y + d], B]);
      options.push([A, [a.x + d, a.y], [a.x + d, b.y], B]);
    }
    const seen = new Set(), list = [];
    for (const raw of options) {
      if (raw.some(([x, y]) => x < 0 || y < 0 || x > COLS || y > ROWS)) continue;
      // drop zero-length segments so aligned endpoints don't create duplicate routes
      let pts = raw.filter((p, i) => i === 0 || p[0] !== raw[i - 1][0] || p[1] !== raw[i - 1][1]);
      // drop middle points that sit on a straight line (incl. back-tracking stubs)
      pts = pts.filter((p, i) => i === 0 || i === pts.length - 1 ||
        !((pts[i - 1][0] === p[0] && p[0] === pts[i + 1][0]) || (pts[i - 1][1] === p[1] && p[1] === pts[i + 1][1])));
      const key = JSON.stringify(pts);
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({ pts, c: cost(pts) + (pts.length > 3 ? 1 : 0) + list.length * 0.01 });
    }
    return list.sort((p, q) => p.c - q.c).map(o => o.pts);
  }

  addTurret(sock, type, code) {
    const t = {
      type, socketId: sock.id, angle: -Math.PI / 2, aimId: null, aimPt: null,
      reload: 0, recoil: 0, flash: 0, code: code ?? TEMPLATES[type], draft: null,
      compiled: false, error: null, runtimeError: null, logs: [], cfg: defaultCfg(),
      laserId: null, laserUntil: 0, laserOn: false, laserHit: null, ops: 0, over: false,
      turning: false, pulseT: 0,
    };
    sock.turret = t;
    if (this.py.ready) this.compileTurret(sock, t.code);
    return t;
  }

  buildTurret(type, sock) {
    const def = TURRETS[type];
    if (!sock || sock.type !== 'socket') return this.fail('Turrets go on a Socket.');
    if (sock.turret) return this.fail('That socket already has a turret.');
    if (!this.isUnlocked(type)) return this.fail(`${def.name} unlocks at wave ${this.unlockWave(type)}.`);
    if (this.credits < def.cost) return this.fail(`Need ${def.cost} credits for a ${def.name}.`);
    this.credits -= def.cost;
    // start from a copy of the player's own newest working program of this type (not the full template,
    // which would skip lessons). Each turret keeps its own copy afterwards.
    const src = this.sockets().filter(s => s !== sock && s.turret?.type === type && s.turret.compiled && !s.turret.error)
      .sort((a, b) => (b.turret.uploadedAt || 0) - (a.turret.uploadedAt || 0) || b.id - a.id)[0];
    const t = this.addTurret(sock, type, src?.turret.code);
    t.copiedFrom = src ? src.id : null;
    this.burst(sock.x, sock.y, def.color, 14, 2);
    this.emit('sfx', 'build');
    this.emit('change');
    return t;
  }

  log(t, text, kind = 'out') {
    const last = t.logs[t.logs.length - 1];
    if (last && last.text === text && last.kind === kind) { last.n++; last.time = this.time; }
    else t.logs.push({ text, kind, n: 1, time: this.time });
    if (t.logs.length > 80) t.logs.splice(0, t.logs.length - 80);
    t.logVersion = (t.logVersion || 0) + 1;
  }

  // extra modules (power, meter, lib) each need a free slot on the socket; base modules are free
  extrasIn(src) {
    const used = [];
    src.split('\n').forEach((l, i) => {
      let m = l.match(/^\s*import\s+([^#\n]+)/);
      const names = m ? m[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]) : (m = l.match(/^\s*from\s+(\w+)\s+import/)) ? [m[1]] : [];
      for (const n of names) if (EXTRA_MODULES.includes(n) && !used.some(u => u.name === n)) used.push({ name: n, line: i + 1 });
    });
    return used;
  }
  slotCheck(sock, src) {
    const used = this.extrasIn(src), slots = sock.slots || 1;
    if (used.length <= slots) return null;
    return { ok: false, error: { line: used[slots].line,
      msg: `Module slots full: this socket has ${slots} slot${slots === 1 ? '' : 's'} for extra modules, but the program uses ${used.map(u => u.name).join(', ')}. Upgrade the socket (⬆) for more slots, or remove one of them from the import line.` } };
  }

  compileTurret(sock, src) {
    const t = sock.turret;
    if (!this.py.ready) return { ok: false, error: { msg: 'Python is still loading…', line: null } };
    const r = this.slotCheck(sock, src) || this.py.compile(sock.id, t.type, src);
    (r.out || []).forEach(l => this.log(t, l, 'out'));
    (r.warns || []).forEach(l => this.log(t, l, 'warn'));
    if (r.ok) {
      t.code = src;
      t.meter = /^\s*(import\s[^\n#]*\bmeter\b|from\s+meter\s+import)/m.test(src);   // shows the energy badge
      t.uploadedAt = this._uploadSeq = (this._uploadSeq || 0) + 1;
      t.compiled = true;
      t.error = null;
      t.runtimeError = null;
      t.cfg = r.cfg;
      this.log(t, 'Upload OK - program running.', 'sys');
    } else {
      t.error = r.error;
      this.log(t, (r.error.line ? `Line ${r.error.line}: ` : '') + r.error.msg, 'err');
      if (t.compiled) this.log(t, 'Upload failed - the previous program keeps running.', 'sys');
    }
    this.emit('change');
    return r;
  }

  onPythonReady() {
    this.syncLibrary();
    for (const s of this.sockets()) if (s.turret) this.compileTurret(s, s.turret.code);
  }

  // tell Python which library (if any) this map has
  syncLibrary() {
    if (!this.py.ready) return;
    if (!this.map.library) { this.py.setLibrary(null); return; }
    const r = this.py.setLibrary(this.library.code);
    this.library.error = r.ok ? null : r.error;
  }

  // upload new library code; turrets that import it are re-uploaded
  setLibrary(src) {
    const L = this.library;
    if (!this.py.ready) return { ok: false, error: { msg: 'Python is still loading…' } };
    const r = this.py.setLibrary(src);
    (r.out || []).forEach(l => this.log(L, l, 'out'));
    if (!r.ok) {
      L.error = r.error;
      this.log(L, (r.error.line ? `Line ${r.error.line}: ` : '') + r.error.msg, 'err');
      this.log(L, 'Upload failed - turrets keep using the previous library.', 'sys');
      this.emit('change');
      return r;
    }
    L.code = src; L.error = null; L.draft = null;
    this.log(L, `Library uploaded. Functions: ${r.functions.length ? r.functions.join(', ') : '(none yet)'}`, 'sys');
    for (const s of this.sockets()) {
      const t = s.turret;
      if (!t || !/\blib\b/.test(t.code)) continue;
      const cr = this.compileTurret(s, t.code);
      this.log(L, cr.ok ? `Socket #${s.id}: re-uploaded OK` : `Socket #${s.id}: ${cr.error.msg}`, cr.ok ? 'sys' : 'err');
    }
    this.emit('change');
    return r;
  }

  sell(ent) {
    if (ent.type === 'socket' && ent.turret) {
      const def = TURRETS[ent.turret.type];
      this.credits += Math.floor(def.cost * SELL_REFUND);
      this.py.remove(ent.id);
      ent.turret = null;
      this.burst(ent.x, ent.y, '#ffb347', 10, 1.5);
      this.emit('sfx', 'sell');
      this.emit('change');
      return;
    }
    // a part in the middle of a chain (1 in, 1 out): reconnect the two neighbours after selling it
    const up = ent.input && this.wires.get(ent.input)?.from;
    const down = ent.outputs.length === 1 && this.wires.get(ent.outputs[0])?.to;
    const inSpent = ent.input ? (this.wires.get(ent.input)?.spent || 0) : 0;
    if (ent.input) this.removeWire(ent.input, !(up && down));   // kept as the reconnecting wire, so no refund then
    [...ent.outputs].forEach(w => this.removeWire(w, true));
    if (up && down) this.addWire(up, down, { spent: inSpent });
    this.credits += Math.floor(ent.spent * SELL_REFUND);
    this.grid[ent.r][ent.c] = null;
    this.ents.delete(ent.id);
    if (up && down) {   // re-route now that the tile is free
      for (const w of this.wires.values()) if (w.from === up && w.to === down) { w.routes = this.routeOptions(this.ents.get(up), this.ents.get(down)); w.ri = 0; w.route = w.routes[0]; }
    }
    this.burst(ent.x, ent.y, '#ffb347', 10, 1.5);
    this.emit('sfx', 'sell');
    this.emit('change');
  }

  // ---- waves --------------------------------------------------------------
  startWave() {
    if (this.phase !== 'build') return;
    if (!this.py.ready) return this.fail('Python is still loading…');
    this.emit('beforeWave');   // the UI keeps a snapshot so the wave can be replayed
    const M = this.map, wi = this.wave;
    const groups = M.waves[wi];
    const hpMul = M.hpBase * (1 + M.hpGrowth * wi);
    let t = 1, groupStart = 1;
    this.spawnQ = [];
    for (const g of groups) {
      // "with": start together with the previous group (two lanes at once)
      t = (g.with ? groupStart : t) + (g.delay || 0);
      groupStart = t;
      for (let i = 0; i < g.n; i++) { this.spawnQ.push({ at: t, type: g.t, hpMul, lane: g.p || 0 }); t += g.gap; }
    }
    this.spawnQ.sort((a, b) => a.at - b.at);
    this.waveHpMul = hpMul;
    this.waveTime = 0;
    this.phase = 'wave';
    this.emit('toast', `Wave ${wi + 1} incoming!`, 'warn');
    this.emit('sfx', 'wave');
    this.emit('change');
  }

  // boss health multiplier: per map, and in endless mode +35 % every 10 waves
  bossMul(wave = this.wave) { return (this.map.bossMul || 1) * (this.map.endless ? 1 + 0.35 * Math.floor(wave / 10) : 1); }

  spawn(type, hpMul, lane = 0, dist = 0) {
    const d = ENEMIES[type];
    const mul = d.boss ? this.bossMul() : hpMul;   // bosses ignore wave growth; a map can make them weaker or stronger
    const p = this.posAt(dist, lane);
    const e = {
      id: this.nextEnemyId++, type, def: d, dist, lane, x: p.x, y: p.y, vx: 0, vy: 0, dir: Math.atan2(p.dy, p.dx),
      hp: d.hp * mul, maxHp: d.hp * mul, hp0: d.hp * mul, armor: d.armor, shield: d.shield || 0, shieldMax: d.shield || 0,
      speed: d.speed, radius: d.radius, lastHit: -9, flash: 0, anim: Math.random() * 10,
    };
    if (d.morph) { e.form = 0; e.morphT = d.morph.every + (e.id % 3) * 0.5; Object.assign(e, d.morph.forms[0]); }
    if (d.spawns) e.spawnT = d.spawns.every;
    this.enemies.push(e);
    return e;
  }

  damage(e, amount, bypassArmor = false) {
    if (e.hp <= 0) return 0;
    let a = amount;
    e.lastHit = this.time;
    if (e.shield > 0) { const s = Math.min(e.shield, a); e.shield -= s; a -= s; }
    if (a > 0 && !bypassArmor) a = Math.max(a - e.armor, 1);
    e.hp -= a;
    e.flash = 0.12;
    if (e.hp <= 0) this.kill(e);
    return a;
  }

  kill(e) {
    this.credits += e.def.reward;
    this.stats.kills++;
    this.emit('sfx', e.def.boss ? 'boss' : 'kill');
    this.burst(e.x, e.y, e.def.color, e.def.boss ? 60 : 16, e.def.boss ? 4 : 2.4);
    this.fx.push({ type: 'text', x: e.x, y: e.y - 0.3, text: `+${e.def.reward}`, t: 0, life: 1, color: '#ffd76a' });
    if (e.def.boss) this.fx.push({ type: 'ring', x: e.x, y: e.y, t: 0, life: 0.8, r: 3, color: e.def.color });
    if (e.def.splits) {
      const { type, n } = e.def.splits;
      for (let i = 0; i < n; i++) {
        const child = this.spawn(type, this.waveHpMul || 1, e.lane, Math.max(0, e.dist - 0.25 * i));
        child.anim += i;
      }
      this.fx.push({ type: 'ring', x: e.x, y: e.y, t: 0, life: 0.4, r: 0.9, color: e.def.color });
    }
  }

  // ---- simulation ---------------------------------------------------------
  advance(dt) {
    if (this.phase === 'lost' || this.phase === 'won') { this.updateFx(dt); return; }
    this.acc += dt;
    let n = 0;
    while (this.acc >= STEP && n < 12) { this.step(STEP); this.acc -= STEP; n++; }
    if (n === 12) this.acc = 0;
  }

  step(dt) {
    this.time += dt;
    // spawning
    if (this.phase === 'wave') {
      this.waveTime += dt;
      while (this.spawnQ.length && this.spawnQ[0].at <= this.waveTime) {
        const s = this.spawnQ.shift();
        this.spawn(s.type, s.hpMul, s.lane);
      }
    }
    // code ticks
    this.codeAcc += dt;
    if (this.codeAcc >= 1 / CODE_HZ) { this.codeAcc -= 1 / CODE_HZ; this.codeTick(); }

    this.powerStep(dt);
    for (const s of this.sockets()) if (s.turret) this.turretStep(s, s.turret, dt);
    // energy meter: net watts into the capacitor (charging − use), smoothed over ~2 s
    for (const s of this.sockets()) {
      const d = (s.energy - (s._e0 ?? s.energy)) / dt;
      s.netW = (s.netW ?? 0) + (d - (s.netW ?? 0)) * Math.min(1, dt / 2);
      s._e0 = s.energy;
      // 1 = gaining (or full), 0 = about even, -1 = draining
      s.trend = s.energy >= s.cap * 0.98 || s.netW > 0.5 ? 1 : s.netW < -0.5 ? -1 : 0;
    }
    this.enemyStep(dt);
    this.shellStep(dt);
    this.updateFx(dt);

    if (this.phase === 'wave' && !this.spawnQ.length && !this.enemies.length) this.endWave();
  }

  endWave() {
    this.wave++;
    const bonus = Math.round(this.map.bonus(this.wave) * (1 + (this.boost?.bonusPct || 0)));
    this.credits += bonus;
    if (this.wave >= this.map.waves.length) {
      this.phase = 'won';
      this.emit('won');
    } else {
      this.phase = 'build';
      this.emit('toast', `Wave ${this.wave} cleared! +${bonus} credits`, 'good');
      const unlocked = Object.keys(TURRETS).filter(k => this.unlockWave(k) === this.wave + 1 && this.wave > 0);
      unlocked.forEach(k => this.emit('toast', `New turret unlocked: ${TURRETS[k].name}`, 'good'));
      this.emit('waveEnd', this.wave);
    }
    this.emit('change');
  }

  powerStep(dt) {
    const V = POWER.volt, wireW = POWER.wireA * V;
    for (const s of this.sockets()) s.inW = 0;
    for (const w of this.wires.values()) { w.a = 0; w._d = 0; }
    // demand of a part = its own charging need + whatever its outputs want (each capped by its wire)
    const demand = (e) => {
      e._own = e.type === 'socket' ? Math.max(0, Math.min(e.chargeW, (e.cap - e.energy) / dt)) : 0;
      let sum = e._own;
      for (const wid of e.outputs) {
        const w = this.wires.get(wid);
        w._d = Math.min(demand(this.ents.get(w.to)), w.maxA * V);
        sum += w._d;
      }
      return (e._d = sum);
    };
    // share the power that arrives proportionally between own need and each output
    const alloc = (e, W) => {
      const tot = e._d;
      if (e.type === 'socket') {
        e.inW = tot > 0 ? W * e._own / tot : 0;
        e.energy = Math.min(e.cap, e.energy + e.inW * dt);
      }
      for (const wid of e.outputs) {
        const w = this.wires.get(wid);
        const share = tot > 0 ? W * w._d / tot : 0;
        w.a = share / V;
        alloc(this.ents.get(w.to), share);
      }
    };
    for (const p of this.psus()) {
      const d = demand(p);
      p.demandW = d;
      p.loadW = Math.min(p.maxW, d);
      p.overload = d > p.maxW + 0.5;
      alloc(p, p.loadW);
      p.loadS += (p.loadW - p.loadS) * Math.min(1, dt * 4);
      p.fan += dt * (2 + 14 * p.loadW / p.maxW);
    }
    for (const w of this.wires.values()) { w.aS += (w.a - w.aS) * Math.min(1, dt * 4); w.phase += dt * w.aS * 0.6; }
    for (const s of this.sockets()) {
      s.inS += (s.inW - s.inS) * Math.min(1, dt * 4);
      const t = s.turret;
      if (!t) continue;
      if (!s.offline && s.energy <= 0.01) {
        s.offline = true;
        this.stats.brownouts = (this.stats.brownouts || 0) + 1;
        this.log(t, 'BROWNOUT: capacitor empty, turret halted until 25% charge.', 'err');
        this.fx.push({ type: 'text', x: s.x, y: s.y - 0.5, text: 'BROWNOUT', t: 0, life: 1.2, color: '#ff5b5b' });
        this.emit('sfx', 'brownout');
      } else if (s.offline && s.energy >= s.cap * POWER.brownoutResume) {
        s.offline = false;
      }
    }
  }

  // worst case: every socket with a turret charging at full speed at the same time.
  // w.peakW / psu.peakW = what that wire / PSU would have to carry (not capped, so overloads show)
  updatePeaks() {
    const peak = e => {
      let sum = e.type === 'socket' ? (e.turret ? e.chargeW : POWER.idleW) : 0;
      for (const wid of e.outputs) { const w = this.wires.get(wid); w.peakW = peak(this.ents.get(w.to)); sum += w.peakW; }
      return sum;
    };
    for (const p of this.psus()) p.peakW = peak(p);
  }

  drain(s, j) { s.energy = Math.max(0, s.energy - j); }

  turretStep(s, t, dt) {
    t.recoil = Math.max(0, t.recoil - dt * 6);
    t.flash = Math.max(0, t.flash - dt * 8);
    t.pulseT = Math.max(0, t.pulseT - dt);
    t.reload = Math.max(0, t.reload - dt);
    t.turning = false;
    if (s.offline || !t.compiled) { t.laserOn = false; return; }
    const cfg = t.cfg;
    this.drain(s, (POWER.idleW + POWER.radarK * cfg.range * cfg.range) * dt);

    if (TURRETS[t.type].modules.includes('motor')) {
      let ta = null;
      if (t.aimId != null) {
        const e = this.enemyById(t.aimId);
        if (e) ta = Math.atan2(e.y - s.y, e.x - s.x); else t.aimId = null;
      } else if (t.aimPt) ta = Math.atan2(t.aimPt.y - s.y, t.aimPt.x - s.x);
      if (ta != null) {
        const diff = angDiff(ta, t.angle);
        const maxStep = cfg.speed * DEG * dt;
        if (Math.abs(diff) > 1e-4) {
          const st = Math.max(-maxStep, Math.min(maxStep, diff));
          t.angle += st;
          t.turning = true;
          this.drain(s, cfg.speed * POWER.motorK * dt * Math.abs(st) / maxStep);
        }
      }
    }

    if (t.type === 'field') {
      // Slow field: costs slow x fieldWPerPct watts while switched on
      t.fieldActive = false;
      if (t.fieldOn) {
        const need = cfg.slow * POWER.fieldWPerPct * dt;
        if (s.energy >= need) { this.drain(s, need); t.fieldActive = true; }
        else this.starve(t, cfg.slow * POWER.fieldWPerPct);
      }
    }

    if (t.type === 'laser') {
      t.laserOn = false; t.laserHit = null;
      if (t.laserId != null && this.time < t.laserUntil) {
        const need = cfg.power * dt;
        if (s.energy >= need) {
          this.drain(s, need);
          t.laserOn = true;
          const e = this.enemyById(t.laserId);
          if (e && Math.hypot(e.x - s.x, e.y - s.y) <= cfg.range + e.radius) {
            const want = Math.atan2(e.y - s.y, e.x - s.x);
            if (Math.abs(angDiff(want, t.angle)) <= 8 * DEG) {
              t.laserHit = e;
              this.emit('sfx', 'laser');
              this.damage(e, cfg.power * POWER.laserDpsPerW * dt, true);
              if (Math.random() < 0.5) this.spark(e.x, e.y, TURRETS.laser.color);
            }
          }
        } else if (!(t.starvedUntil > this.time)) this.starve(t, cfg.power);
      }
    }
  }

  codeTick() {
    if (!this.py.ready) return;
    const turrets = {};
    for (const s of this.sockets()) {
      const t = s.turret;
      if (!t || !t.compiled || s.offline) continue;
      turrets[s.id] = {
        x: s.x, y: s.y, angle: +(t.angle / DEG).toFixed(2), energy: +s.energy.toFixed(2),
        capacity: s.cap, reload: +t.reload.toFixed(3), cpu: s.cpu, net: +(s.netW || 0).toFixed(2), trend: s.trend || 0,
      };
    }
    if (!Object.keys(turrets).length) return;
    const enemies = this.enemies.map(e => ({
      id: e.id, kind: e.type, x: +e.x.toFixed(3), y: +e.y.toFixed(3), hp: +e.hp.toFixed(1), max_hp: e.maxHp,
      armor: e.armor, shield: +e.shield.toFixed(1), speed: e.speed, progress: +(e.dist / this.paths[e.lane].len).toFixed(4),
      vx: +e.vx.toFixed(3), vy: +e.vy.toFixed(3),
    }));
    let res;
    try { res = this.py.tick({ time: this.time, enemies, turrets }); }
    catch (err) { console.error(err); return; }
    for (const [id, r] of Object.entries(res)) {
      const s = this.ents.get(+id);
      if (s?.turret) this.applyResult(s, s.turret, r);
    }
  }

  applyResult(s, t, r) {
    t.ops = r.ops;
    t.over = r.over;
    if (r.cfg) t.cfg = r.cfg;
    this.drain(s, r.ops * POWER.cpuJPerOp);
    r.out.forEach(l => this.log(t, l, 'out'));
    r.warns.forEach(l => this.log(t, l, 'warn'));
    if (r.over) this.log(t, `CPU overrun: update() used more than ${s.cpu} lines this tick and was cut short.`, 'warn');
    if (r.cmds.starved) this.starve(t, r.cmds.starved);
    if (r.error) {
      t.runtimeError = r.error;
      this.log(t, (r.error.line ? `Line ${r.error.line}: ` : '') + r.error.msg, 'err');
    } else t.runtimeError = null;
    const c = r.cmds;
    if ('aim' in c) { t.aimId = c.aim; t.aimPt = null; }
    if ('aim_at' in c) { t.aimPt = { x: c.aim_at[0], y: c.aim_at[1] }; t.aimId = null; }
    if (c.fire && t.type === 'cannon') this.fireCannon(s, t);
    if (c.pulse && t.type === 'pulse') this.firePulse(s, t);
    if (c.arc != null && t.type === 'arc') this.fireArc(s, t, c.arc);
    if ('field' in c && t.type === 'field') t.fieldOn = !!c.field;
    if ('laser' in c && t.type === 'laser') {
      if (c.laser == null) t.laserId = null;
      else { t.laserId = c.laser; t.laserUntil = this.time + 0.16; }
    }
  }

  // the program asked to fire but the capacitor can't cover the energy cost
  starve(t, needJ) {
    t.starvedUntil = this.time + 0.6;
    const what = t.type === 'laser' ? `the beam needs ${fmt1(needJ)} W` : `a ${t.type === 'pulse' ? 'pulse' : 'shot'} needs ${fmt1(needJ)} J`;
    this.log(t, `LOW POWER: ${what} but the capacitor is too low. Waiting to recharge.`, 'warn');
  }

  fireCannon(s, t) {
    const cost = t.cfg.damage * POWER.shotJPerDmg;
    if (t.reload > 0 || s.energy < cost) return;
    this.drain(s, cost);
    t.reload = TURRETS.cannon.reload;
    t.recoil = 1; t.flash = 1;
    this.emit('sfx', 'shoot');
    const sp = TURRETS.cannon.shellSpeed;
    const cx = Math.cos(t.angle), cy = Math.sin(t.angle);
    this.shells.push({
      x: s.x + cx * 0.45, y: s.y + cy * 0.45, vx: cx * sp, vy: cy * sp,
      dmg: t.cfg.damage, life: (t.cfg.range + 0.6) / sp, size: 0.05 + Math.min(0.08, t.cfg.damage / 600),
    });
  }

  // Arc: lightning hits the target (must be in radar range), then jumps to the nearest enemy not hit yet
  // within POWER.arcJump tiles, up to `jumps` times; each jump does arcFalloff of the previous damage
  fireArc(s, t, targetId) {
    const c = t.cfg, cost = c.damage * (1 + c.jumps) * POWER.arcJPerDmg;
    if (t.reload > 0 || s.energy < cost) return;
    let e = this.enemyById(targetId);
    if (!e || Math.hypot(e.x - s.x, e.y - s.y) > c.range + e.radius) return;
    this.drain(s, cost);
    t.reload = TURRETS.arc.reload;
    const hit = new Set(), pts = [[s.x, s.y]];
    let dmg = c.damage;
    for (let j = 0; e && j <= c.jumps; j++) {
      hit.add(e.id); pts.push([e.x, e.y]);
      this.damage(e, dmg);
      dmg *= POWER.arcFalloff;
      const from = e;
      e = null; let best = POWER.arcJump;
      for (const o of this.enemies) {
        if (hit.has(o.id) || o.hp <= 0) continue;
        const d = Math.hypot(o.x - from.x, o.y - from.y);
        if (d <= best) { best = d; e = o; }
      }
    }
    this.fx.push({ type: 'arc', pts, t: 0, life: 0.25, color: TURRETS.arc.color });
    this.emit('sfx', 'laser');
  }

  firePulse(s, t) {
    const r = t.cfg.range;
    const cost = t.cfg.strength * (POWER.pulseBase + POWER.pulseRangeK * r * r);
    if (t.reload > 0 || s.energy < cost) return;
    this.drain(s, cost);
    t.reload = TURRETS.pulse.reload;
    t.pulseT = 0.5;
    this.emit('sfx', 'pulse');
    this.fx.push({ type: 'ring', x: s.x, y: s.y, t: 0, life: 0.45, r, color: TURRETS.pulse.color });
    let hits = 0;
    for (const e of [...this.enemies]) {
      if (Math.hypot(e.x - s.x, e.y - s.y) <= r + e.radius) { this.damage(e, t.cfg.strength); hits++; }
    }
    // a pulse is meant for groups: hitting 0 or 1 enemy sends a power SURGE back through the network,
    // draining energy from every other socket on the same PSU (teaches: check how many are in range first)
    if (hits <= 1) this.surge(s, POWER.pulseSurgeJ, hits);
  }

  // drain energy from the other sockets that share s's power source
  surge(s, joules, hits = 1) {
    let root = s;
    while (root.input) { const w = this.wires.get(root.input); if (!w) break; root = this.ents.get(w.from); }
    const hit = [];
    const walk = e => { for (const wid of e.outputs) { const n = this.ents.get(this.wires.get(wid).to); if (n.type === 'socket' && n !== s) hit.push(n); walk(n); } };
    walk(root);
    this.stats.surges = (this.stats.surges || 0) + 1;
    for (const n of hit) { this.drain(n, joules); this.spark(n.x, n.y, '#ffcf4a', 4); }
    this.fx.push({ type: 'text', x: s.x, y: s.y - 0.6, text: 'SURGE', t: 0, life: 1, color: '#ffcf4a', small: true });
    if (s.turret) this.log(s.turret, `SURGE: the pulse hit ${hits ? 'only one enemy' : 'no enemy'} and drained ${joules} J from ${hit.length} other socket${hit.length === 1 ? '' : 's'} on this PSU. Fire only when several enemies are in range.`, 'warn');
  }

  enemyStep(dt) {
    // active slow fields (on, powered) and how much they slow
    const fields = this.sockets().filter(s => s.turret?.type === 'field' && s.turret.fieldActive && !s.offline)
      .map(s => ({ x: s.x, y: s.y, r: s.turret.cfg.range, k: 1 - s.turret.cfg.slow / 100 }));
    for (const e of this.enemies) {
      let mul = 1;
      for (const f of fields) if (Math.hypot(e.x - f.x, e.y - f.y) <= f.r + e.radius) mul = Math.min(mul, f.k);
      e.slowed = mul < 1;
      // memory leaks (and the Stack overflow boss) grow while they are alive
      if (e.def.grows && e.maxHp < e.hp0 * (e.def.growCap || 3)) {   // grows up to growCap x its starting health
        const k = 1 + e.def.grows * dt;
        e.maxHp *= k; e.hp *= k;
        e.radius = Math.min(e.def.radius * 1.7, e.radius * (1 + e.def.grows * dt * 0.25));
      }
      // polymorphic virus: switches between its forms (armor + speed) every few seconds
      if (e.def.morph && (e.morphT -= dt) <= 0) {
        e.form = (e.form + 1) % e.def.morph.forms.length;
        Object.assign(e, e.def.morph.forms[e.form]);
        e.morphT = e.def.morph.every;
        this.fx.push({ type: 'ring', x: e.x, y: e.y, t: 0, life: 0.3, r: 0.5, color: e.def.color });
      }
      // the final boss calls in helpers while it walks
      if (e.def.spawns && (e.spawnT -= dt) <= 0) {
        e.spawnT = e.def.spawns.every;
        this.spawn(e.def.spawns.type, this.waveHpMul || 1, e.lane, Math.max(0, e.dist - 0.4));
        this.fx.push({ type: 'ring', x: e.x, y: e.y, t: 0, life: 0.5, r: 1, color: e.def.color });
      }
      e.dist += e.speed * mul * dt;
      e.flash = Math.max(0, e.flash - dt);
      e.anim += dt * e.speed * 6;
      if (e.shieldMax && this.time - e.lastHit > 2) e.shield = Math.min(e.shieldMax, e.shield + e.def.shieldRegen * dt);
      if (e.dist >= this.paths[e.lane].len) {
        e.leaked = true;
        this.core = Math.max(0, this.core - e.def.dmg);
        this.stats.leaks++;
        this.fx.push({ type: 'ring', x: e.x, y: e.y, t: 0, life: 0.5, r: 1.2, color: '#ff3355' });
        this.emit('leak');
        continue;
      }
      const p = this.posAt(e.dist, e.lane);
      e.x = p.x; e.y = p.y; e.vx = p.dx * e.speed * mul; e.vy = p.dy * e.speed * mul;   // real velocity (slowed too)
      const want = Math.atan2(p.dy, p.dx);
      e.dir += angDiff(want, e.dir) * Math.min(1, dt * 10);
    }
    this.enemies = this.enemies.filter(e => e.hp > 0 && !e.leaked);
    if (this.core <= 0 && this.phase !== 'lost') {
      this.phase = 'lost';
      this.emit('lost');
      this.emit('change');
    }
  }

  shellStep(dt) {
    for (const sh of this.shells) {
      const sub = 3;
      for (let i = 0; i < sub && sh.life > 0; i++) {
        sh.x += sh.vx * dt / sub; sh.y += sh.vy * dt / sub;
        sh.life -= dt / sub;
        for (const e of this.enemies) {
          if (e.hp > 0 && Math.hypot(e.x - sh.x, e.y - sh.y) < e.radius + 0.2) {
            const dealt = this.damage(e, sh.dmg);
            this.spark(sh.x, sh.y, '#bff6ff', 6);
            if (dealt < sh.dmg * 0.5 && e.armor) this.fx.push({ type: 'text', x: e.x, y: e.y - 0.35, text: 'ARMOR', t: 0, life: 0.6, color: '#9ec3ff', small: true });
            sh.life = -1;
            break;
          }
        }
      }
    }
    this.shells = this.shells.filter(s => s.life > 0);
  }

  // ---- effects ------------------------------------------------------------
  burst(x, y, color, n = 12, speed = 2) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random());
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.4 + Math.random() * 0.5, max: 0.9, color, size: 0.03 + Math.random() * 0.05 });
    }
  }
  spark(x, y, color, n = 3) { this.burst(x, y, color, n, 2.5); }

  updateFx(dt) {
    for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt; }
    this.particles = this.particles.filter(p => p.life > 0);
    if (this.particles.length > 900) this.particles.splice(0, this.particles.length - 900);
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter(f => f.t < f.life);
  }

  // worst case for one tower: everything it has running flat out (estimate().peak) vs the power it would
  // still get when every socket on its wires/PSU charges at once. ratio > 1 = it can't keep that up.
  worstCase(s) {
    const est = this.estimate(s);
    if (!est) return null;
    let supply = s.input ? s.chargeW : 0;
    let cur = s;
    while (cur && cur.input) {
      const w = this.wires.get(cur.input);
      if (!w) break;
      if (w.peakW > 0) supply *= Math.min(1, (w.maxA * POWER.volt) / w.peakW);   // wire over its limit → everyone gets a share
      cur = this.ents.get(w.from);
    }
    if (cur?.type === 'psu' && cur.peakW > 0) supply *= Math.min(1, cur.maxW / cur.peakW);
    return { use: est.peak, supply, ratio: supply > 0 ? est.peak / supply : Infinity };
  }

  // ---- power estimates for the editor's Power tab -----------------------------
  estimate(s) {
    const t = s.turret; if (!t) return null;
    const c = t.cfg, mods = TURRETS[t.type].modules;
    const rows = [['Socket electronics', POWER.idleW, 'W', 'always']];
    rows.push(['Radar', POWER.radarK * c.range * c.range, 'W', `0.3 × ${c.range}²`]);
    if (mods.includes('motor')) rows.push(['Motor (while turning)', POWER.motorK * c.speed, 'W', `0.04 × ${c.speed}°/s`]);
    if (t.meter) rows.push(['Energy meter', 0, 'W', 'free']);
    rows.push(['CPU (last tick)', t.ops * POWER.cpuJPerOp * CODE_HZ, 'W', `${t.ops} lines × 2 mJ × 10/s`]);
    if (t.type === 'cannon') {
      const j = c.damage * POWER.shotJPerDmg;
      rows.push(['Shot', j, 'J', `${POWER.shotJPerDmg} × ${c.damage} damage`]);
      rows.push(['Firing nonstop', j / TURRETS.cannon.reload, 'W', `${j.toFixed(1)} J / 0.7 s`]);
    }
    if (t.type === 'pulse') {
      const j = c.strength * (POWER.pulseBase + POWER.pulseRangeK * c.range * c.range);
      rows.push(['Pulse', j, 'J', `${c.strength} × (2 + 0.5 × ${c.range}²)`]);
      rows.push(['Pulsing nonstop', j / TURRETS.pulse.reload, 'W', `${j.toFixed(1)} J / 1.4 s`]);
    }
    if (t.type === 'laser') rows.push(['Laser (while firing)', c.power, 'W', `${(c.power * POWER.laserDpsPerW).toFixed(1)} dmg/s`]);
    if (t.type === 'field') rows.push(['Slow field (while on)', c.slow * POWER.fieldWPerPct, 'W', `${c.slow}% slower × ${POWER.fieldWPerPct}`]);
    if (t.type === 'arc') { const j = c.damage * (1 + c.jumps) * POWER.arcJPerDmg; rows.push(['Arc shot', j, 'J', `${c.damage} x (1 + ${c.jumps}) x 0.9`]); rows.push(['Firing nonstop', j / TURRETS.arc.reload, 'W', `${j.toFixed(1)} J / 1 s`]); }
    const peak = rows.filter(r => r[2] === 'W').reduce((a, r) => a + r[1], 0);
    return { rows, peak };
  }
}
