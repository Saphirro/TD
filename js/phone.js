// ---------------------------------------------------------------------------
// Phone mode (touch screens): landscape layout, ring menus instead of a toolbar,
// a one-line coach bubble for the tutorial, and code chips so you rarely type.
// Desktop is untouched: everything here only runs while <body> has class "phone".
// ---------------------------------------------------------------------------
import { BUILDINGS, TURRETS, PORTS } from './data.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nameOf = e => (e.type === 'socket' ? (e.turret ? `${TURRETS[e.turret.type].name} #${e.id}` : `Socket #${e.id}`) : `${BUILDINGS[e.type].name} #${e.id}`);

// code chips: building blocks (words and symbols), not finished lines. Only the tiny commands
// every turret needs (like cannon.fire()) are whole. [label, text inserted] or just the text.
const CHIPS = {
  common: [['if', 'if '], ['for', 'for '], ['in', ' in '], ['def', 'def '], ['return', 'return '], ':', '(', ')', '.', ',',
    ['=', ' = '], ['==', ' == '], ['<=', ' <= '], ['>=', ' >= '], ['<', ' < '], ['>', ' > '], ['and', ' and '], ['not', 'not '],
    'True', 'False', 'target', 'enemies', 'len', 'print', ['+', ' + ']],
  cannon: ['cannon.fire()', 'motor', 'cannon', 'radar', 'aim', 'aimed', 'distance', 'damage'],
  pulse: ['pulse.fire()', 'pulse', 'radar', 'count', 'e', 'strength'],
  laser: ['laser.stop()', 'laser', 'motor', 'radar', 'aimed', 'fire', 'power'],
};

export function installPhone(ui) {
  const g = ui.g, r = ui.r, body = document.body;
  const isPhone = () => body.classList.contains('phone');

  // ---- device detection --------------------------------------------------------------
  // layout choice: 'auto' (detect), 'phone' or 'desktop', set with the 📱 button or in Settings.
  // In-app browsers (Messenger etc.) report touch and sizes unreliably, so auto checks several signals.
  const getLayout = () => { try { return localStorage.getItem('cd.layout') || 'auto'; } catch { return 'auto'; } };
  const detect = () => {
    const forced = /[?&]phone=1/.test(location.search) ? 'phone' : getLayout();   // ?phone=1 forces it (testing)
    const touch = window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(any-pointer: coarse)').matches
      || navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
    const small = Math.min(window.innerWidth, window.innerHeight) <= 600 || Math.min(screen.width, screen.height) <= 600;
    const on = forced === 'phone' || (forced === 'auto' && touch && small);
    const was = isPhone();
    body.classList.toggle('phone', on);
    body.classList.toggle('portrait', on && window.innerHeight > window.innerWidth);
    body.classList.toggle('can-phone', touch || window.innerWidth <= 860 || forced !== 'auto');   // show the 📱 button
    const b = document.getElementById('btn-layout');
    if (b) { b.textContent = on ? '🖥' : '📱'; b.title = on ? 'Switch to the desktop layout' : 'Switch to the phone layout'; }
    if (was !== isPhone()) { closeRing(); setMode(null); r.resize(); }
  };
  ui.setLayout = v => { try { localStorage.setItem('cd.layout', v); } catch { /* ignore */ } detect(); r.resize(); };
  ui.getLayout = getLayout;

  // ---- "turn your phone" hint -----------------------------------------------------------
  const rot = document.createElement('div');
  rot.id = 'rotate-hint';
  rot.innerHTML = `<div class="rot-ic">📱↻</div><b>Turn your phone sideways</b><span>The board fits much better in landscape.</span><button class="ghost" id="rot-skip">Play upright anyway</button><button class="link" id="rot-desktop">Use the desktop layout</button>`;
  document.body.appendChild(rot);
  $('#rot-skip').addEventListener('click', () => { body.classList.add('upright'); r.resize(); });
  $('#rot-desktop').addEventListener('click', () => ui.setLayout('desktop'));

  // ---- ring menu ------------------------------------------------------------------------
  const stage = $('#stage');
  const ring = document.createElement('div');
  ring.id = 'ring'; ring.hidden = true;
  stage.appendChild(ring);
  let ringFor = null;
  function closeRing() { ring.hidden = true; ringFor = null; }
  ui.closeRing = closeRing;

  function openRing(items, x, y, key) {
    ringFor = key;
    const n = items.length, R = n <= 3 ? 58 : 66;
    ring.innerHTML = items.map((it, i) => {
      const a = -Math.PI / 2 + (i - (n - 1) / 2) * (Math.PI * 2 / Math.max(n, 6));
      return `<button class="ring-btn ${it.cls || ''} ${it.disabled ? 'off' : ''}" data-i="${i}" ${it.tool ? `data-tool="${it.tool}"` : ''} style="left:${Math.cos(a) * R}px;top:${Math.sin(a) * R}px">
        <span class="ri">${it.icon}</span><span class="rl">${esc(it.label)}</span>${it.cost != null ? `<span class="rc">${it.cost}</span>` : ''}</button>`;
    }).join('') + '<span class="ring-dot"></span>';
    const rect = stage.getBoundingClientRect();
    ring.style.left = `${Math.max(R + 34, Math.min(rect.width - R - 34, x))}px`;
    ring.style.top = `${Math.max(R + 30, Math.min(rect.height - R - 30, y))}px`;
    ring.hidden = false;
    ring.onclick = e => {
      const b = e.target.closest('.ring-btn'); if (!b) return;
      const it = items[+b.dataset.i];
      if (it.disabled) { if (it.why) ui.toast(it.why, 'bad'); return; }
      closeRing();
      it.fn();
    };
    markRingFocus();
  }

  // lesson highlight → glowing ring buttons
  function markRingFocus() {
    const f = ui.focus;
    const entId = ringFor?.startsWith('e') ? +ringFor.slice(1) : null;
    for (const b of ring.querySelectorAll('.ring-btn')) {
      const t = b.dataset.tool;
      const on = !!(f && t && (f.tools.includes(t) || (t === 'power' && f.tools.includes('wire'))
        || (t === 'code' && f.code && (!f.ents.length || f.ents.includes(entId)))));   // the task is about this turret's code
      b.classList.toggle('focus', on);
    }
  }

  // ---- wiring modes (tap the other end) ------------------------------------------------
  let mode = null;   // { kind: 'from', id } (tap what to power) | { kind: 'to', id } (tap where power comes from)
  const setMode = m => { mode = m; ui.wireFrom = m?.kind === 'from' ? m.id : null; ui.tool = m ? 'wire' : 'select'; ui.refreshToolbar(); updateCoach(true); };
  ui.cancelPhoneMode = () => setMode(null);

  function wireTap(ent) {
    if (!ent) { setMode(null); return; }
    if (mode.kind === 'from') {
      if (ent.id === mode.id) { setMode(null); return; }
      const res = g.addWire(mode.id, ent.id, { pay: true });
      if (typeof res === 'string') ui.toast(res, 'bad');
      else { ui.toast(`Connected! Wire −${res.spent} credit${res.spent === 1 ? '' : 's'}.`, 'good'); setMode(null); }
    } else {
      if (!PORTS[ent.type]) { ui.toast('Tap a PSU, a Splitter or a powered Socket.', 'bad'); return; }
      const res = g.addWire(ent.id, mode.id, { pay: true });
      if (typeof res === 'string') ui.toast(res, 'bad');
      else { ui.toast(`Powered! Wire −${res.spent} credit${res.spent === 1 ? '' : 's'}.`, 'good'); setMode(null); }
    }
  }

  // ---- what a tap does on a phone ---------------------------------------------------------
  const desktopTap = ui.tap.bind(ui);
  ui.tap = (c, rr) => {
    if (!isPhone()) return desktopTap(c, rr);
    ui.el.info.classList.remove('show-phone');   // any tap on the board closes the info card
    const ent = g.entAt(c, rr);
    if (mode) { wireTap(ent); return; }
    const s = r.toScreen(c + 0.5, rr + 0.5);
    if (ent) { ui.select(ent.id); openRing(entItems(ent), s.x, s.y, `e${ent.id}`); return; }
    const w = g.wireAt(c + 0.5, rr + 0.5, 0.5);
    if (w && !g.canPlace(c, rr)) { ui.selectWire(w.id); openRing(wireItems(w), s.x, s.y, `w${w.id}`); return; }
    if (ringFor) { closeRing(); ui.select(null); return; }
    ui.select(null);
    if (!g.canPlace(c, rr)) return;
    openRing(buildItems(c, rr), s.x, s.y, `t${c},${rr}`);
  };

  function buildItems(c, rr) {
    return ['socket', 'psu', 'splitter'].map(type => {
      const pv = g.buildPreview(type, c, rr), cost = pv.ok ? pv.total : BUILDINGS[type].cost;
      return {
        icon: { socket: '▣', psu: '⚙', splitter: '⑂' }[type], label: BUILDINGS[type].name, cost, cls: `t-${type}`,
        disabled: !pv.ok || g.credits < cost, why: !pv.ok ? pv.msg : `Need ${cost} credits.`,
        tool: type,
        fn: () => {
          const e = g.build(type, c, rr);
          if (e && type === 'socket') {   // straight on to the next step
            const s = r.toScreen(e.x, e.y);
            setTimeout(() => { ui.select(e.id); openRing(entItems(e), s.x, s.y, `e${e.id}`); }, 60);
          }
        },
      };
    });
  }

  function entItems(e) {
    const items = [];
    if (e.type === 'socket' && !e.turret) {
      for (const [k, d] of Object.entries(TURRETS)) {
        const locked = !g.isUnlocked(k);
        items.push({ icon: { cannon: '◎', pulse: '◉', laser: '✷' }[k], label: d.name, cost: locked ? `W${g.unlockWave(k)}` : d.cost, tool: k,
          disabled: locked || g.credits < d.cost, why: locked ? `${d.name} unlocks at wave ${g.unlockWave(k)}.` : `Need ${d.cost} credits.`,
          fn: () => { const t = g.buildTurret(k, e); if (t) { ui.select(e.id); ui.copyNote(t); } } });
      }
    }
    if (e.type === 'socket' && e.turret) items.push({ icon: '✎', label: 'Code', cls: 'primary', tool: 'code', fn: () => ui.openEditor(e.id) });
    if (e.type === 'socket' && !e.input) items.push({ icon: '🔌', label: 'Power', tool: 'power', fn: () => setMode({ kind: 'to', id: e.id }) });
    if (PORTS[e.type] && e.outputs.length < PORTS[e.type] && (e.type === 'psu' || e.input)) items.push({ icon: '➜', label: 'Wire out', tool: 'wire', fn: () => setMode({ kind: 'from', id: e.id }) });
    const u = g.upgradeInfo(e);
    if (u && !u.max) items.push({ icon: '⬆', label: u.locked ? `W${u.locked}` : 'Upgrade', cost: u.locked ? null : u.cost, tool: 'upgrade',
      disabled: !!u.locked || g.credits < u.cost, why: u.locked ? `Upgrades unlock at wave ${u.locked}.` : `Need ${u.cost} credits.`,
      fn: () => { g.upgrade(e); ui.renderInfo(); } });
    items.push({ icon: 'ℹ', label: 'Info', fn: () => { ui.select(e.id); ui.el.info.classList.add('show-phone'); } });
    if (e.input) items.push({ icon: '⏏', label: 'Unplug', fn: () => { g.unplug(e); ui.renderInfo(); } });
    items.push({ icon: '✕', label: e.turret ? 'Sell turret' : 'Sell', cls: 'danger', fn: () => { g.sell(e); if (!g.ents.has(e.id)) ui.select(null); else ui.renderInfo(); } });
    return items;
  }

  function wireItems(w) {
    return [
      { icon: '↻', label: 'Route', fn: () => { ui.reroute(w); } },
      { icon: 'ℹ', label: 'Info', fn: () => { ui.selectWire(w.id); ui.el.info.classList.add('show-phone'); } },
      { icon: '✕', label: 'Remove', cls: 'danger', fn: () => { g.removeWire(w.id, true); ui.selectWire(null); } },
    ];
  }

  // ---- coach bubble: one line about what to do now ---------------------------------------
  const coach = document.createElement('div');
  coach.id = 'coach';
  document.getElementById('speed').after(coach);   // lives in the top bar, right of the speed buttons (also opens the lesson)
  let coachKey = '';
  function updateCoach(force) {
    if (!isPhone()) { coach.hidden = true; return; }
    let html, cancel = false;
    if (mode?.kind === 'from') { html = `Tap the part to power from <b>${esc(nameOf(g.ents.get(mode.id)))}</b>.`; cancel = true; }
    else if (mode?.kind === 'to') { html = 'Tap a <b>PSU</b>, <b>Splitter</b> or powered <b>Socket</b> to power it from.'; cancel = true; }
    else {
      const idx = g.lessonIndex(), L = g.map.lessons[idx];
      const i = L.tasks.findIndex((t, k) => !ui.lessonDone.has(`${idx}:${k}`) && !(t.check && t.check(g)));
      html = i >= 0 ? `<span class="cl">Lesson ${g.lessonLabel(idx)}</span> ${L.tasks[i].text}`
        : g.phase === 'build' ? `<span class="cl">Lesson ${g.lessonLabel(idx)}</span> Done! Press <b>Start wave</b> when you are ready.` : '';
    }
    const key = html + cancel;
    if (!force && key === coachKey) return;
    coachKey = key;
    coach.innerHTML = html ? `<span class="ct">${html}</span>${cancel ? '<button class="ghost" data-cancel>Cancel</button>' : '<span class="more">Lesson ›</span>'}` : '';
    coach.hidden = !html || ui.editorFor != null;
  }
  coach.addEventListener('click', e => {
    if (e.target.closest('[data-cancel]')) { setMode(null); return; }
    if (!mode) { $('#lesson-go').textContent = 'Continue'; ui.el.side.classList.add('open'); }
  });

  // ---- code chips in the editor ---------------------------------------------------------
  const bar = $('#chipbar');
  function renderChips() {
    const T = ui.edTarget();
    const type = T && !T.lib ? T.t.type : null;
    const chips = [...(CHIPS[type] || []), ...CHIPS.common];
    bar.innerHTML = '<button class="chip-k" data-k="kbd" title="Show the keyboard">⌨</button><button class="chip-k" data-k="tab">⇥</button><button class="chip-k" data-k="nl">↵</button><button class="chip-k" data-k="bs">⌫</button>'
      + chips.map(c => { const [label, text] = Array.isArray(c) ? c : [c, c]; return `<button class="chip-c" data-c="${esc(text)}">${esc(label)}</button>`; }).join('');
  }
  bar.addEventListener('pointerdown', e => e.preventDefault());   // keep the cursor where it is
  bar.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.k === 'kbd') { ui.cm.setKeyboard(true); return; }
    if (b.dataset.k === 'tab') ui.cm.insert('    ');
    else if (b.dataset.k === 'nl') ui.cm.command('newlineAndIndent');
    else if (b.dataset.k === 'bs') ui.cm.command('delCharBefore');
    else ui.cm.insert(b.dataset.c);
  });

  // ---- hooks into the normal UI ---------------------------------------------------------
  const _openEditor = ui.openEditor.bind(ui);
  ui.openEditor = id => {
    closeRing(); setMode(null);
    _openEditor(id);
    if (isPhone()) { renderChips(); ui.cm.setKeyboard(false); }
  };
  const _frame = ui.frame.bind(ui);
  let t = 0;
  ui.frame = dt => {
    _frame(dt);
    t += dt;
    if (t > 0.3) { t = 0; updateCoach(); if (!ring.hidden) markRingFocus(); }
  };

  g.on('map', () => { closeRing(); setMode(null); });


  window.addEventListener('resize', detect);
  window.addEventListener('orientationchange', () => setTimeout(detect, 200));
  detect();
  updateCoach(true);
}
