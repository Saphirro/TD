// ---------------------------------------------------------------------------
// Balance harness. In the browser console (game page open):
//   const S = await import('./tools/sim.js');
//   await S.report();                 // runs the standard bot strategies
//   await S.run({ spend: 0.5 })       // one custom run
// Bots always pick the best-coverage tile, so they are stronger than a new
// player. Targets: "greedy" wins with some damage, "frugal" loses late,
// "naive" (beginner code) struggles around waves 6-8.
// ---------------------------------------------------------------------------
import { TEMPLATES, BUILDINGS, TURRETS } from '../js/data.js';

const NAIVE = {
  cannon: TEMPLATES.cannon.replace(/    if motor\.aimed\(target\):\n        cannon\.fire\(\)/, '    cannon.fire()'),
};

// A player who applies each lesson when it appears (wave index is 0-based).
const LEARNER_PULSE = `import radar, pulse

def setup():
    radar.range = 2
    pulse.strength = 8

def update():
    enemies = radar.scan()
    count = 0
    for e in enemies:
        count = count + 1
    if count >= 3:
        pulse.fire()
`;
const learnerCode = (w, type) => {
  if (type === 'cannon') return w >= 4 ? TEMPLATES.cannon.replace('cannon.damage = 10', 'cannon.damage = 20') : TEMPLATES.cannon;
  if (type === 'pulse') return LEARNER_PULSE;
  return TEMPLATES[type];
};

export async function run(opts = {}) {
  const { game: g, ui } = window.__cd;
  ui.noSave = true;
  ui.audio.quiet = true;
  ui.forceBoost = opts.boost || {};   // bots play with no Lab boosts unless told otherwise
  if (opts.map && g.map.id !== opts.map) g.setMap(opts.map);
  ui.restart();
  ui.userPaused = true;
  const code = opts.code || {};
  const sockets = () => g.sockets();
  const coverage = (c, r, R) => { let n = 0; g.paths.forEach((P, lane) => { for (let d = 0; d < P.len; d += 0.25) { const p = g.posAt(d, lane); if (Math.hypot(p.x - c - 0.5, p.y - r - 0.5) <= R) n++; } }); return n * 0.25; };
  const spots = R => { const out = []; for (let r = 0; r < g.grid.length; r++) for (let c = 0; c < g.grid[0].length; c++) if (g.canPlace(c, r)) out.push({ c, r, cov: coverage(c, r, R) }); return out.sort((a, b) => b.cov - a.cov); };
  const freePort = () => g.psus().find(p => p.outputs.length < 4);

  if (g.ents.get(2)?.turret) g.compileTurret(g.ents.get(2), code.cannon || TEMPLATES.cannon);
  const log = [];
  for (let w = 0; w < g.map.waves.length; w++) {
    const budget = Math.floor(g.credits * (opts.spend ?? 1));
    const start = g.credits;
    for (let guard = 0; guard < 20; guard++) {
      const turrets = sockets().filter(s => s.turret);
      const n = turrets.length;
      let type = 'cannon';
      if (g.isUnlocked('pulse') && turrets.filter(s => s.turret.type === 'pulse').length < Math.ceil(n / 4)) type = 'pulse';
      if (g.isUnlocked('laser') && turrets.filter(s => s.turret.type === 'laser').length < Math.ceil(n / 4)) type = 'laser';
      const capW = g.psus().reduce((a, p) => a + p.maxW, 0);
      const needPsu = !freePort() || (opts.wattsPerTower && n * opts.wattsPerTower >= capW);
      const sp = spots(type === 'pulse' ? 2 : 3)[0];
      if (!sp) break;
      // a new PSU goes on a useless tile (covers no path) as close as possible to the new tower
      const psuSpot = needPsu ? spots(1).filter(o => o.cov === 0 && !g.wiresThrough(o.c, o.r).length && !(o.c === sp.c && o.r === sp.r))
        .sort((a, b) => (Math.abs(a.c - sp.c) + Math.abs(a.r - sp.r)) - (Math.abs(b.c - sp.c) + Math.abs(b.r - sp.r)))[0] : null;
      const src = psuSpot || freePort();
      const wireEst = Math.max(1, Math.abs(src.c - sp.c) + Math.abs(src.r - sp.r));
      const cost = BUILDINGS.socket.cost + TURRETS[type].cost + (needPsu ? BUILDINGS.psu.cost : 0) + wireEst;
      if (cost > budget - (start - g.credits)) break;
      if (psuSpot) g.build('psu', psuSpot.c, psuSpot.r);
      // a wire runs over the best tile: move it to a route that avoids the tile (Route ↻), like a player would
      for (const w of g.wiresThrough(sp.c, sp.r)) {
        for (let k = 0; k < w.routes.length; k++) {
          g.cycleRoute(w);
          if (!g.wiresThrough(sp.c, sp.r).includes(w)) break;
        }
      }
      const s = g.build('socket', sp.c, sp.r);
      if (!s.input) {   // built on a wire → already spliced into it. Otherwise wire from the nearest PSU with a free port
        const near = g.psus().filter(p => p.outputs.length < 4).sort((a, b) => (Math.abs(a.c - s.c) + Math.abs(a.r - s.r)) - (Math.abs(b.c - s.c) + Math.abs(b.r - s.r)))[0];
        g.addWire(near.id, s.id, { pay: true });
      }
      g.buildTurret(type, s);
      g.compileTurret(s, code[type] || TEMPLATES[type]);
    }
    // smart spending: money left over this wave goes into upgrades (overloaded PSUs first, then turret sockets)
    if (opts.upgrades) {
      for (let k = 0; k < 12; k++) {
        const left = budget - (start - g.credits);
        g.updatePeaks();
        const cands = g.psus().filter(p => p.peakW > p.maxW);   // only fix overloaded PSUs (cheaper than a new one)
        const c = cands.map(e => ({ e, u: g.upgradeInfo(e) })).filter(x => x.u && !x.u.max && !x.u.locked && x.u.cost <= left).sort((a, b) => a.u.cost - b.u.cost)[0];
        if (!c) break;
        g.upgrade(c.e);
      }
    }
    if (opts.codeAt) {
      for (const s of sockets()) {
        if (!s.turret) continue;
        const src = opts.codeAt(w, s.turret.type);
        if (src !== s.turret.code) g.compileTurret(s, src);
      }
    }
    opts.beforeWave?.(g, w);
    const core0 = g.core;
    let ticks = 0, brown = 0, samples = 0, overload = 0, minCap = 1, starved = 0;
    g.startWave();
    while (g.phase === 'wave' && ticks < 60 * 600) {
      g.step(1 / 60); ticks++;
      if (ticks % 30 === 0) {
        samples++;
        brown += sockets().filter(s => s.turret && s.offline).length;
        if (g.psus().some(p => p.overload)) overload++;
        for (const s of sockets()) if (s.turret) { minCap = Math.min(minCap, s.energy / s.cap); if (s.turret.starvedUntil > g.time) starved++; }
      }
    }
    log.push({
      wave: w + 1, towers: sockets().filter(s => s.turret).map(s => s.turret.type[0]).join(''),
      psus: g.psus().length, leaks: core0 - g.core, core: g.core, credits: g.credits,
      brownoutPct: Math.round(100 * brown / Math.max(1, samples * sockets().length)),
      overloadPct: Math.round(100 * overload / Math.max(1, samples)), minCapPct: Math.round(minCap * 100), lowPowerPct: Math.round(100 * starved / Math.max(1, samples * sockets().length)), secs: Math.round(ticks / 60),
    });
    if (g.phase !== 'build') break;
  }
  document.getElementById('modal').hidden = true;
  return { result: g.phase, cleared: g.wave, log };
}

export async function report(map, boost) {   // boost: Lab boosts to test with, e.g. labBoost({ core: 1, budget: 1 })
  const out = {};
  out.learner = await run({ map, boost, spend: 1, codeAt: learnerCode, wattsPerTower: 30 });
  out.learnerHalf = await run({ map, boost, spend: 0.6, codeAt: learnerCode, wattsPerTower: 30 });
  out.templatesOnly = await run({ map, boost, spend: 1 });
  out.naive = await run({ map, boost, spend: 0.8, code: NAIVE });
  const lines = [];
  for (const [k, r] of Object.entries(out)) {
    lines.push(`${k.toUpperCase()}: ${r.result} (cleared ${r.cleared})`);
    for (const l of r.log) lines.push(`  w${l.wave} core ${l.core} (-${l.leaks}) cr ${l.credits} ${l.towers} psu ${l.psus} brown ${l.brownoutPct}% overload ${l.overloadPct}% minCap ${l.minCapPct}% lowPwr ${l.lowPowerPct}% ${l.secs}s`);
  }
  window.__cd.ui.forceBoost = undefined;
  window.__cd.ui.restart();
  return lines.join('\n');
}
