// ---------------------------------------------------------------------------
// DOM user interface: HUD, toolbar, info card, code editor, lessons, modals.
// ---------------------------------------------------------------------------
import { Sfx } from './audio.js';
import { BUILDINGS, TURRETS, DOCS, TEMPLATES, POWER, ENEMIES, PORTS, MAPS, DEFAULT_LIBRARY, SELL_REFUND, WIRE_COST_PER_TILE, UPGRADES, LAB, labBoost } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d);

const SVG = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ICONS = {
  select: SVG('<path d="M5 3l13 8-6 1.5L9 19z"/>'),
  socket: SVG('<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>'),
  wire: SVG('<path d="M4 6h8v12h8"/><circle cx="4" cy="6" r="1.8"/><circle cx="20" cy="18" r="1.8"/>'),
  splitter: SVG('<path d="M3 12h7M10 12l6-6h5M10 12h11M10 12l6 6h5"/>'),
  psu: SVG('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="12" r="5"/><path d="M12 7v10M7 12h10"/>'),
  cannon: SVG('<circle cx="9" cy="14" r="5"/><path d="M12 11l8-6M13 13l8-5"/>'),
  pulse: SVG('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5" stroke-dasharray="3 2"/><circle cx="12" cy="12" r="10" opacity=".5"/>'),
  laser: SVG('<path d="M4 18l5-5"/><path d="M9 13l3-6 3 3-6 3z"/><path d="M14 9l7-7" stroke-width="2.5"/>'),
  field: SVG('<path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10"/><circle cx="12" cy="12" r="3"/>'),
  arc: SVG('<path d="M13 2L5 13h6l-2 9 9-12h-6l1-8z"/>'),
  sell: SVG('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
};
const TOOLS = [
  { id: 'select', label: 'Select', key: '1' },
  { id: 'socket', label: 'Socket', key: '2', cost: BUILDINGS.socket.cost },
  { id: 'wire', label: 'Wire', key: '3', cost: 0 },
  { id: 'splitter', label: 'Splitter', key: '4', cost: BUILDINGS.splitter.cost },
  { id: 'psu', label: 'PSU', key: '5', cost: BUILDINGS.psu.cost },
  { id: 'cannon', label: 'Cannon', key: '6', cost: TURRETS.cannon.cost, turret: true },
  { id: 'pulse', label: 'Pulse', key: '7', cost: TURRETS.pulse.cost, turret: true },
  { id: 'laser', label: 'Laser', key: '8', cost: TURRETS.laser.cost, turret: true },
  { id: 'field', label: 'Slow field', key: '0', cost: TURRETS.field.cost, turret: true },
  { id: 'arc', label: 'Arc', key: 'a', cost: TURRETS.arc.cost, turret: true },
  { id: 'sell', label: 'Sell', key: '9' },
];
const TOOL_TIPS = {
  select: 'Tap things to inspect them. Double-tap a turret to edit its code.',
  socket: BUILDINGS.socket.desc + ' Tap an empty tile.',
  wire: 'Tap a PSU, Splitter or powered Socket, then the part to power. 1 credit per tile, max 60 W. Edge colour: green OK, yellow near the limit, red overloaded if everything charges at once.',
  splitter: BUILDINGS.splitter.desc + ' Tap an empty tile.',
  psu: BUILDINGS.psu.desc + ' Tap an empty tile.',
  cannon: TURRETS.cannon.desc + ' Tap a socket.',
  pulse: TURRETS.pulse.desc + ' Tap a socket.',
  laser: TURRETS.laser.desc + ' Tap a socket.',
  field: TURRETS.field.desc + ' Tap a socket.',
  arc: TURRETS.arc.desc + ' Tap a socket.',
  sell: 'Tap a part to sell it for 60% of its cost.',
};

function hintFor(msg) {
  let m;
  if ((m = msg.match(/NameError: name '(\w+)'/))) {
    const n = m[1];
    if (['radar', 'motor', 'cannon', 'laser', 'pulse', 'power'].includes(n)) return `Add ${n} to the import line at the top, e.g. import radar, ${n}`;
    return `Python doesn't know "${n}". Check the spelling, or create it before using it.`;
  }
  if (/IndentationError|unindent|expected an indented block|unexpected indent/.test(msg)) return 'Indentation problem: lines inside def / if / for need 4 more spaces than the line that owns them.';
  if (/expected ':'/.test(msg)) return 'Lines that start with def, if, elif, else, for or while must end with a colon :';
  if (/was never closed|unmatched|EOF/.test(msg)) return 'A bracket ( [ { or a quote is not closed.';
  if (/NoneType/.test(msg)) return 'Something was None (nothing). Maybe there were no enemies. Check with an if first.';
  if (/index out of range/.test(msg)) return 'The list is shorter than you expect. Check len(enemies) > 0 before using enemies[0].';
  if (/has no attribute|has no setting/.test(msg)) return 'That name does not exist on this module. See the Docs tab.';
  if (/positional argument/.test(msg)) return 'Wrong number of values in a function call. See the Docs tab.';
  if (/BROWNOUT/.test(msg)) return 'Use less energy (lower settings) or give this socket more supply.';
  if (/SURGE/.test(msg)) return 'Count the enemies in range first (len(enemies) or a for loop) and only call pulse.fire() when there are 2 or more.';
  if (/LOW POWER/.test(msg)) return 'Lower the damage / strength / power setting, save shots for big targets (power.percent), or give this socket its own wire or another PSU.';
  if (/CPU overrun/.test(msg)) return 'Your loop runs too many lines. Break out early, or loop over fewer enemies.';
  return null;
}

function makeEditor(host, onChange) {
  if (window.CodeMirror) {
    const cm = window.CodeMirror(host, {
      mode: 'python', lineNumbers: true, indentUnit: 4, tabSize: 4, indentWithTabs: false,
      matchBrackets: true, lineWrapping: false, viewportMargin: Infinity,
      extraKeys: {
        Tab: c => (c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection('    ')),
        'Shift-Tab': c => c.indentSelection('subtract'),
      },
    });
    let quiet = false;
    // the empty line right under a "# TODO" comment is where beginners should type: mark it
    // (gold box + "write your code here"), until something is written on it
    let writeLine = null;
    const markWrite = () => {
      if (writeLine != null && writeLine < cm.lineCount()) cm.removeLineClass(writeLine, 'wrap', 'cm-write-line');
      writeLine = null;
      const lines = cm.getValue().split('\n');
      const i = lines.findIndex(l => /#\s*TODO/.test(l));
      if (i >= 0 && i + 1 < lines.length && !lines[i + 1].trim()) { writeLine = i + 1; cm.addLineClass(writeLine, 'wrap', 'cm-write-line'); }
    };
    cm.on('change', () => { markWrite(); if (!quiet) onChange(cm.getValue()); });
    let marked = null;
    return {
      get: () => cm.getValue(),
      set: v => { cm.setValue(v); cm.clearHistory(); markWrite(); },
      refresh: () => cm.refresh(),
      mark: line => {
        if (marked != null) cm.removeLineClass(marked, 'background', 'cm-err-line');
        marked = null;
        if (line) { marked = line - 1; cm.addLineClass(marked, 'background', 'cm-err-line'); cm.scrollIntoView({ line: marked, ch: 0 }, 60); }
      },
      focus: () => cm.focus(),
      // put the cursor on the first "TODO" line so beginners find what to edit
      gotoTodo: () => {
        const lines = cm.getValue().split('\n');
        const i = lines.findIndex(l => l.includes('TODO'));
        if (i < 0) return;
        cm.addLineClass(i, 'background', 'cm-todo-line');
        markWrite();
        if (writeLine != null) {
          // put the cursor on the write line, already indented like the TODO line (so the code lands inside the function)
          const indent = lines[i].match(/^\s*/)[0];
          const cur = cm.getLine(writeLine);
          if (cur.length < indent.length) { quiet = true; cm.replaceRange(indent, { line: writeLine, ch: 0 }, { line: writeLine, ch: cur.length }); quiet = false; }
          cm.setCursor({ line: writeLine, ch: cm.getLine(writeLine).length });
        } else cm.setCursor({ line: i, ch: lines[i].length });
        cm.scrollIntoView({ line: i, ch: 0 }, 80);
        if (window.matchMedia('(pointer: fine)').matches) cm.focus();
      },
      // phone: code chips insert at the cursor; the on-screen keyboard only opens when asked for
      insert: text => { const ro = cm.getOption('readOnly'); cm.setOption('readOnly', false); cm.replaceSelection(text); cm.setOption('readOnly', ro); },
      command: name => { const ro = cm.getOption('readOnly'); cm.setOption('readOnly', false); cm.execCommand(name); cm.setOption('readOnly', ro); },
      setKeyboard: on => { cm.setOption('readOnly', !on); if (on) cm.focus(); },
      // hint lines shown faintly in the code (the player still types them): [{ line, above, text, change }]
      ghosts: list => {
        for (const w of cm._ghostW || []) w.clear();
        cm._ghostW = list.map(gh => {
          const el = document.createElement('div');
          el.className = `cm-ghost${gh.change ? ' change' : ''}`;
          el.innerHTML = `<pre></pre><span class="gl">${gh.change ? '← change the line above to this' : '← <span class="pc">click</span><span class="tap">tap</span> here, then type this line'}</span>`;
          el.querySelector('pre').textContent = gh.text;
          // a hint line is only a picture (CodeMirror ignores clicks on it), so clicking it makes a real,
          // indented line at that spot (or reuses an empty one there) and puts the cursor on it
          const pick = e => {
            e.preventDefault(); e.stopPropagation();
            const indent = gh.text.match(/^\s*/)[0], blank = i => i >= 0 && i < cm.lineCount() && !cm.getLine(i).trim();
            let at;
            if (gh.change) at = gh.line;
            else if (gh.above) {
              if (blank(gh.line - 1)) at = gh.line - 1;
              else { cm.replaceRange(indent + '\n', { line: gh.line, ch: 0 }); at = gh.line; }
            } else if (blank(gh.line + 1)) at = gh.line + 1;
            else { cm.replaceRange('\n', { line: gh.line, ch: cm.getLine(gh.line).length }); at = gh.line + 1; }
            if (!gh.change && cm.getLine(at).length < indent.length) cm.replaceRange(indent, { line: at, ch: 0 }, { line: at, ch: cm.getLine(at).length });
            cm.setCursor({ line: at, ch: cm.getLine(at).length });
            if (!cm.getOption('readOnly')) cm.focus();   // phone: the keyboard stays closed until asked for; code chips insert here
          };
          let t0 = null;
          el.addEventListener('mousedown', pick);
          el.addEventListener('touchstart', e => { t0 = e.touches[0]; }, { passive: true });
          el.addEventListener('touchend', e => { const t = e.changedTouches[0]; if (t0 && Math.hypot(t.clientX - t0.clientX, t.clientY - t0.clientY) < 10) pick(e); t0 = null; });   // a tap, not a scroll
          return cm.addLineWidget(gh.line, el, { above: !!gh.above });
        });
      },
      // mark the lines the current lesson task is about (gold bar), or clear with null
      focusLines: re => {
        const lines = cm.getValue().split('\n');
        const want = re ? lines.map((l, i) => (re.test(l) ? i : -1)).filter(i => i >= 0) : [];
        const key = want.join(',');
        if (key === cm._focusKey) return;
        for (const i of cm._focusLines || []) if (i < cm.lineCount()) cm.removeLineClass(i, 'background', 'cm-focus-line');
        for (const i of want) cm.addLineClass(i, 'background', 'cm-focus-line');
        cm._focusLines = want; cm._focusKey = key;
      },
    };
  }
  // fallback: plain textarea
  const ta = document.createElement('textarea');
  ta.className = 'fallback-editor'; ta.spellcheck = false;
  host.appendChild(ta);
  ta.addEventListener('input', () => onChange(ta.value));
  ta.addEventListener('keydown', e => {
    if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText('    ', s, ta.selectionEnd, 'end'); onChange(ta.value); }
  });
  return { get: () => ta.value, set: v => { ta.value = v; }, refresh() {}, mark() {}, focus: () => ta.focus(), gotoTodo() {}, focusLines() {}, ghosts() {},
    insert: t => { ta.setRangeText(t, ta.selectionStart, ta.selectionEnd, 'end'); onChange(ta.value); },
    command: n => { if (n === 'newlineAndIndent') { ta.setRangeText('\n', ta.selectionStart, ta.selectionEnd, 'end'); } else if (n === 'delCharBefore' && ta.selectionStart > 0) { ta.setRangeText('', ta.selectionStart - 1, ta.selectionEnd, 'end'); } onChange(ta.value); },
    setKeyboard: on => { ta.readOnly = !on; if (on) ta.focus(); } };
}

export class UI {
  constructor(game, renderer, py) {
    this.g = game; this.r = renderer; this.py = py;
    this.tool = 'select';
    this.selected = null;
    this.hoverTile = null;
    this.wireFrom = null;
    this.speed = 1;
    this.userPaused = false;
    this.editorFor = null;
    this.tab = 'code';
    // finished lesson tasks; the game reads the same set to know when a half-lesson (3½) is due
    Object.defineProperty(this, 'lessonDone', { get: () => this._lessonDone, set: v => { this._lessonDone = v; this.g.lessonDone = v; } });
    this.lessonDone = new Set();
    this.liveT = 0; this.checkT = 0;
    this.audio = new Sfx();
    this.sfx = name => this.audio.play(name);
    game.on('sfx', name => this.sfx(name));
    game.on('leak', () => this.sfx('leak'));
    try { this.planMode = localStorage.getItem('cd.mode') !== 'live'; } catch { this.planMode = true; }
    try { this.showPathFlow = localStorage.getItem('cd.pathflow') !== '0'; } catch { this.showPathFlow = true; }

    this.el = {
      side: $('#side'), guide: $('#guide'), editor: $('#editor'), info: $('#info'), toasts: $('#toasts'),
      boot: $('#boot'), banner: $('#banner'), tools: $('#tools'), modal: $('#modal'),
      credits: $('#st-credits b'), core: $('#st-core b'), coreBar: $('#st-core .bar i'), wave: $('#st-wave b'),
      power: $('#st-power b'), waveBtn: $('#btn-wave'), speed: $('#speed'), console: $('#console'),
      status: $('#ed-status'), copy: $('#ed-copy'), tooltip: $('#tooltip'), tip: $('#tip'),
    };
    this.buildToolbar();
    this.bindHud();
    this.bindCanvas();
    this.bindEditor();
    this.bindEditorDrag();
    this.bindKeys();
    game.on('change', () => {
      this.refreshToolbar(); this.renderInfo();
      if (this.editorFor != null && !this.edTarget()) this.closeEditor();
      if (this.g.phase === 'build') this.autosave();
    });
    game.on('toast', (m, k) => this.toast(m, k));
    game.on('waveEnd', () => { this.renderGuide(); this.flashGuide(); this.autosave(); this.sfx('clear'); });
    game.on('beforeWave', () => { this.waveSnap = { ...this.g.serialize(), lessonDone: [...this.lessonDone] }; });
    game.on('map', () => { this.waveSnap = null; });   // a new or restarted map has nothing to replay
    game.on('lost', () => { this.sfx('lost'); this.clearSave(); this.endModal(false); });
    game.on('won', () => { this.sfx('won'); if (!this.g.map.endless) this.recordWin(); this.clearSave(); this.endModal(true); });
    game.on('map', () => { this.closeEditor(); this.select(null); this.lessonDone.clear(); this.setTool('select'); this.renderGuide(); });
    this.renderGuide();
    this.refreshToolbar();
    if (window.innerWidth > 860) this.el.side.classList.add('open');
    requestAnimationFrame(() => { this.r.resize(); setTimeout(() => this.el.side.classList.remove('no-anim'), 300); });
  }

  // Plan mode pauses while the editor is open, until the player presses ▶ / a speed / Start wave
  get planPaused() { return this.planMode && this.editorFor != null && !this.editRun; }
  get paused() { return this.userPaused || this.planPaused; }

  // ---- toolbar ---------------------------------------------------------------
  buildToolbar() {
    this.el.tools.innerHTML = TOOLS.map(t => `
      <button class="tool" data-tool="${t.id}" title="${esc(t.label)} (${t.key})">
        <span class="ic">${ICONS[t.id]}</span><span class="lb">${t.label}</span>
        ${t.cost ? `<span class="cost">${t.cost}</span>` : '<span class="cost key">' + t.key + '</span>'}
        <span class="lock"></span>
      </button>`).join('') + `
      <button class="tool lib-btn" data-lib title="Shared library (L)">
        <span class="ic">📚</span><span class="lb">Library</span><span class="cost key">L</span><span class="lock"></span>
      </button>`;
    this.el.tools.addEventListener('click', e => {
      const b = e.target.closest('.tool'); if (!b) return;
      if (b.dataset.lib != null) { this.openEditor('lib'); return; }
      this.setTool(b.dataset.tool);
    });
  }

  refreshToolbar() {
    const libBtn = this.el.tools.querySelector('.lib-btn');
    libBtn.hidden = !this.g.map.library;
    document.body.classList.toggle('has-lib', !!this.g.map.library);
    libBtn.classList.toggle('on', this.editorFor === 'lib');
    libBtn.classList.toggle('warn', !!this.g.library.error);
    for (const b of this.el.tools.querySelectorAll('.tool[data-tool]')) {
      const t = TOOLS.find(x => x.id === b.dataset.tool);
      b.classList.toggle('on', this.tool === t.id);
      const locked = !!t.turret && !this.g.isUnlocked(t.id);
      b.classList.toggle('locked', locked);
      if (b.hidden !== locked) b.hidden = locked;   // not unlocked yet: the button only appears in the wave its lesson introduces it
      b.querySelector('.lock').textContent = locked ? `W${this.g.unlockWave(t.id)}` : '';
      b.classList.toggle('poor', !!t.cost && this.g.credits < t.cost);
    }
  }

  setTool(id) {
    if (TURRETS[id] && !this.g.isUnlocked(id)) { this.toast(`${TURRETS[id].name} unlocks at wave ${this.g.unlockWave(id)}.`, 'bad'); return; }
    this.tool = id;
    this.wireFrom = null;
    this.refreshToolbar();
    this.showTip(TOOL_TIPS[id]);
  }

  showTip(text) {
    const tt = this.el.tooltip;
    tt.textContent = text; tt.classList.add('show');
    clearTimeout(this._tipT);
    this._tipT = setTimeout(() => tt.classList.remove('show'), 3200);
  }

  // ---- HUD -----------------------------------------------------------------------
  bindHud() {
    this.el.waveBtn.addEventListener('click', () => { this.g.startWave(); this.editRun = true; });
    this.el.speed.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.speed === 'pause') {
        if (this.planPaused) { this.editRun = true; this.userPaused = false; }   // ▶ out of the Plan-mode pause
        else this.userPaused = !this.userPaused;
      } else { this.speed = +b.dataset.speed; this.userPaused = false; this.editRun = true; }
    });
    // the "Paused while editing" banner is a button too
    this.el.banner.addEventListener('click', () => { if (this.planPaused) this.editRun = true; else this.userPaused = false; });
    document.getElementById('ed-paused').addEventListener('click', () => { this.editRun = true; this.userPaused = false; });
    const phone = () => window.innerWidth <= 860;
    // phone + editor open: show/hide the lesson under the code (split half/half)
    this.toggleSplit = () => {
      document.body.classList.toggle('ed-split');
      try { localStorage.setItem('cd.split', document.body.classList.contains('ed-split') ? '1' : '0'); } catch { /* ignore */ }
      this.updateTip();
      setTimeout(() => this.cm.refresh(), 50);
    };
    try { if (localStorage.getItem('cd.split') === '1') document.body.classList.add('ed-split'); } catch { /* ignore */ }
    $('#ed-guide').addEventListener('click', () => this.toggleSplit());
    $('#btn-guide').addEventListener('click', () => {
      if (this.editorFor != null && document.body.classList.contains('phone')) { this.edTaskBig = !this.edTaskBig; this.updateTip(); return; }   // phone: expand the lesson strip
      if (this.editorFor != null && phone()) { this.toggleSplit(); return; }
      $('#lesson-go').textContent = 'Continue'; this.el.side.classList.toggle('open');
      setTimeout(() => this.r.resize(), 220);
    });
    // phone: the lesson panel is a bottom sheet; tapping its header makes it bigger / smaller
    $('#guide > .pane-head').addEventListener('click', () => {
      if (!phone() || this.editorFor != null) return;
      this.el.side.classList.toggle('open');
      setTimeout(() => this.r.resize(), 220);
    });
    $('#btn-settings').addEventListener('click', () => this.settingsModal());
    $('#btn-maps').addEventListener('click', () => this.campaignModal());
    $('#lesson-go').addEventListener('click', e => { e.stopPropagation(); this.el.side.classList.remove('open'); setTimeout(() => this.r.resize(), 220); });
    $('#btn-player').addEventListener('click', () => this.playersModal());
    $('#btn-lib').addEventListener('click', () => this.openEditor('lib'));
    $('#btn-retry').addEventListener('click', () => this.replayWave());
    $('#btn-layout').addEventListener('click', () => this.setLayout?.(document.body.classList.contains('phone') ? 'desktop' : 'phone'));
    const mute = $('#btn-mute');
    const showMute = () => { mute.textContent = this.audio.muted ? '🔇' : '🔊'; mute.title = this.audio.muted ? 'Sound off (M)' : 'Sound on (M)'; };
    showMute();
    this.toggleMute = () => { this.audio.setMuted(!this.audio.muted); showMute(); };
    mute.addEventListener('click', () => this.toggleMute());
    document.addEventListener('click', e => {
      if (e.target.closest('[data-close-side]')) { this.el.side.classList.remove('open'); setTimeout(() => this.r.resize(), 220); }
    });
  }

  updateHud() {
    const rb = document.getElementById('btn-retry'); if (rb) { const hide = !this.waveSnap || this.g.phase === 'won' || !!this.g.map.endless; if (rb.hidden !== hide) rb.hidden = hide; if (!hide) rb.title = `Replay wave ${this.waveSnap.wave + 1} (your newest code stays)`; }
    const g = this.g, el = this.el;
    el.credits.textContent = g.credits;
    el.core.textContent = `${g.core}/${g.coreMax}`;
    el.coreBar.style.width = `${100 * g.core / g.coreMax}%`;
    el.coreBar.style.background = g.core / g.coreMax > 0.5 ? 'var(--accent)' : g.core / g.coreMax > 0.25 ? 'var(--warn)' : 'var(--bad)';
    const WAVES = g.map.waves;
    const wn = g.phase === 'wave' ? g.wave + 1 : Math.min(g.wave + 1, WAVES.length);
    el.wave.textContent = g.map.endless ? `${wn} ∞` : `${wn}/${WAVES.length}`;
    const p = g.totalPower();
    el.power.textContent = `${Math.round(p.load)}/${p.cap} W`;
    el.power.style.color = p.cap && p.load / p.cap > 0.95 ? 'var(--bad)' : p.cap && p.load / p.cap > 0.7 ? 'var(--warn)' : '';
    const btn = el.waveBtn;
    if (g.phase === 'wave') { btn.disabled = true; btn.textContent = `Wave ${g.wave + 1}: ${g.enemies.length + g.spawnQ.length} left`; }
    else if (g.phase === 'build') { btn.disabled = !this.py.ready; btn.textContent = this.py.ready ? `Start wave ${g.wave + 1} ▶` : 'Python loading…'; }
    else { btn.disabled = true; btn.textContent = g.phase === 'won' ? 'Victory' : 'Core breached'; }
    for (const b of el.speed.querySelectorAll('button')) {
      b.classList.toggle('on', b.dataset.speed === 'pause' ? this.paused : (!this.paused && +b.dataset.speed === this.speed));
    }
    const banner = this.el.banner;
    const msg = this.userPaused ? 'Paused · click to continue' : this.planPaused ? 'Paused while editing · click ▶ to keep playing' : '';
    const inEd = this.editorFor != null;
    banner.textContent = msg; banner.classList.toggle('show', !!msg && !inEd);
    const chip = document.getElementById('ed-paused'); if (chip) chip.hidden = !(inEd && this.paused);
  }

  // ---- canvas input ------------------------------------------------------------------
  tileFromEvent(e) {
    const rect = this.r.cv.getBoundingClientRect();
    const t = this.r.toTile(e.clientX - rect.left, e.clientY - rect.top);
    const c = Math.floor(t.x), r = Math.floor(t.y);
    if (c < 0 || r < 0 || c >= this.g.grid[0].length || r >= this.g.grid.length) return null;
    return { c, r };
  }

  bindCanvas() {
    const cv = this.r.cv;
    cv.addEventListener('pointermove', e => { this.hoverTile = this.tileFromEvent(e); });
    cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') this.hoverTile = null; });
    cv.addEventListener('pointerdown', e => { if (e.button !== 0) { this.down = null; return; } this.down ={ x: e.clientX, y: e.clientY, t: performance.now() }; this.hoverTile = this.tileFromEvent(e); });
    cv.addEventListener('pointerup', e => {
      if (!this.down) return;
      const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y);
      this.down = null;
      if (moved > 14) return;
      const p = this.tileFromEvent(e);
      if (p) this.tap(p.c, p.r);
      else this.select(null);
    });
    // right-click anywhere outside the editor/forms: drop the current tool and go back to Select (1).
    // Already on Select → also clear the selection.
    document.addEventListener('contextmenu', e => {
      if (e.target.closest('#editor, #modal, input, textarea, .CodeMirror')) return;
      e.preventDefault();
      if (this.tool !== 'select' || this.wireFrom) { this.wireFrom = null; this.tool = 'select'; this.refreshToolbar(); }
      else this.select(null);
    });
    cv.addEventListener('dblclick', e => {
      const p = this.tileFromEvent(e); if (!p) return;
      const ent = this.g.entAt(p.c, p.r);
      if (ent?.turret && this.tool === 'select') this.openEditor(ent.id);
    });
  }

  tap(c, r) {
    const g = this.g, ent = g.entAt(c, r), tool = this.tool;
    if (tool === 'select') {
      // editor already open: clicking another turret switches the editor to that turret
      if (this.editorFor != null && ent?.turret && ent.id !== this.editorFor) { this.openEditor(ent.id); return; }
      if (ent && ent.id === this.selected && ent.turret && performance.now() - (this._lastTap || 0) < 400) this.openEditor(ent.id);
      this._lastTap = performance.now();
      if (!ent) {
        const w = g.wireAt(c + 0.5, r + 0.5, 0.5);
        if (w) { this.selectWire(w.id); return; }
      }
      this.select(ent ? ent.id : null);
      return;
    }
    if (tool === 'socket' || tool === 'splitter' || tool === 'psu') {
      if (ent) { this.select(ent.id); return; }
      const e = g.build(tool, c, r);
      if (e && tool === 'socket' && !e.input && !this._socketTip) { this._socketTip = true; this.toast('Socket placed. Now use Wire to connect it to a PSU.', 'info'); }
      return;
    }
    if (tool === 'wire') {
      if (!this.wireFrom) {
        if (ent && PORTS[ent.type]) {
          if (ent.outputs.length >= PORTS[ent.type]) this.toast(`No free outputs on this ${BUILDINGS[ent.type].name}.`, 'bad');
          else this.wireFrom = ent.id;
        } else this.toast('Start the wire at a PSU, a Splitter or a powered Socket.', 'bad');
        return;
      }
      if (!ent || ent.id === this.wireFrom) { this.wireFrom = null; return; }
      if (ent.type !== 'psu' && !ent.input) {
        const res = g.addWire(this.wireFrom, ent.id, { pay: true });
        if (typeof res === 'string') this.toast(res, 'bad');
        else { this.wireFrom = null; this.toast(`Connected! Wire: −${res.spent} credits.`, 'good'); }
        return;
      }
      if (PORTS[ent.type] && ent.outputs.length < PORTS[ent.type]) { this.wireFrom = ent.id; return; }
      this.toast('That part already has a power input.', 'bad');
      return;
    }
    if (TURRETS[tool]) {
      if (ent?.type === 'socket') {
        const t = g.buildTurret(tool, ent);
        if (t) { this.setTool('select'); this.select(ent.id); this.copyNote(t); }
      } else this.toast('Turrets go on a Socket. Build a socket first.', 'bad');
      return;
    }
    if (tool === 'sell') {
      if (ent) {
        g.sell(ent);
        if (!g.ents.has(ent.id) && this.selected === ent.id) this.select(null);
      } else {
        const w = g.wireAt(c + 0.5, r + 0.5, 0.5);
        if (w) { const back = Math.floor((w.spent || 0) * SELL_REFUND); g.removeWire(w.id, true); this.toast(back ? `Wire removed (+${back} credits).` : 'Wire removed.', 'info'); }
      }
    }
  }

  select(id) {
    this.selected = id;
    this.selWire = null;
    // "look at the PSU" task: counts after the card has been open a few seconds (rows glow meanwhile)
    clearTimeout(this._psuViewT);
    if (id && this.g.ents.get(id)?.type === 'psu' && !this.g.flags.psuViewed) {
      this._psuViewT = setTimeout(() => { if (this.selected === id) { this.g.flags.psuViewed = true; this.checkLesson(); } }, 3000);
    }
    this.renderInfo();
  }

  // ---- functions the player wrote travel with them (into the map 2 Library) ------------------
  // copies `def name(...)` and its indented lines out of a turret program into the player's profile
  keepFunction(name) {
    for (const s of this.g.sockets()) {
      const code = s.turret?.compiled && s.turret.code;
      if (!code) continue;
      const lines = code.split('\n'), i = lines.findIndex(l => new RegExp(`^def\\s+${name}\\s*\\(`).test(l));
      if (i < 0) continue;
      let j = i + 1;
      while (j < lines.length && (lines[j].trim() === '' || /^\s/.test(lines[j]))) j++;
      while (j > i + 1 && lines[j - 1].trim() === '') j--;
      const fn = lines.slice(i, j).join('\n');
      const mine = this.storeGet(this.pk('myFunctions')) || {};
      mine[name] = fn;
      if (!this.noSave) this.storeSet(this.pk('myFunctions'), mine);
      return fn;
    }
    return null;
  }

  // a new map with a Library starts with the player's own functions in it
  libraryWithMine(list) {   // list: [[name, code], ...]
    if (!list?.length) return null;
    return `${DEFAULT_LIBRARY.trimEnd()}\n\n# Written by you on an earlier map:\n${list.map(([, code]) => code).join('\n\n')}\n`;
  }

  // more own functions than Library capacity: the player picks which come along
  pickFunctionsModal(mine, cap, done) {
    this.modal(`<h2>Pack your Library</h2>
      <p class="muted">You have written ${mine.length} functions. Your Library can carry <b>${cap}</b> into this map (more capacity in the 🧪 Lab).</p>
      <div class="fn-pick">${mine.map(([n, code], i) => `<label class="opt"><input type="checkbox" data-i="${i}" ${i < cap ? 'checked' : ''}><div><b>${esc(n)}</b><small><code>${esc(code.split('\n')[0])}</code></small></div></label>`).join('')}</div>`,
      [{ label: 'Take these', cls: 'primary', fn: () => done(mine.filter((_, i) => this.el.modal.querySelector(`input[data-i="${i}"]`)?.checked).slice(0, cap)) }],
      { locked: true });
    this.el.modal.querySelector('.fn-pick').onchange = e => {
      const boxes = [...this.el.modal.querySelectorAll('.fn-pick input')];
      if (boxes.filter(b => b.checked).length > cap) e.target.checked = false;   // never more than the capacity
    };
  }

  // ---- hints: reveal the next line of the answer faintly in the editor ------------------
  // Each Hint press shows one more line (task.ghost steps). A line disappears once the player has
  // typed it. Steps: { after | before | change: regex of the line it belongs to, text }.
  currentTask() {
    const g = this.g, idx = g.lessonIndex(), L = g.map.lessons[idx];
    const i = L.tasks.findIndex((t, k) => !this.lessonDone.has(`${idx}:${k}`) && !(t.check && t.check(g)));
    return i < 0 ? null : { key: `${idx}:${i}`, task: L.tasks[i], lesson: L };
  }

  ghostDone(step, lines) {
    const norm = s => s.replace(/\s+/g, ' ').trim();
    const want = norm(step.text);
    return lines.some(l => norm(l) === want);
  }

  refreshGhosts() {
    const T = this.edTarget(), cur = this.currentTask();
    if (!T || T.lib || !cur?.task.ghost || this.hintFor?.key !== cur.key) { this.cm.ghosts([]); return; }
    const lines = this.cm.get().split('\n'), out = [];
    cur.task.ghost.slice(0, this.hintFor.n).forEach(st => {
      if (this.ghostDone(st, lines)) return;
      const re = st.after || st.before || st.change;
      const line = lines.findIndex(l => re.test(l));
      if (line >= 0) out.push({ line, above: !!st.before, text: st.text, change: !!st.change });
    });
    this.cm.ghosts(out);
  }

  hint() {
    const cur = this.currentTask();
    if (!cur) { this.toast('All tasks of this lesson are done.', 'good'); return; }
    const steps = cur.task.ghost;
    if (!steps || this.editorFor == null) { this.toast(`💡 ${cur.lesson.hint}`, 'info'); return; }
    if (this.hintFor?.key !== cur.key) this.hintFor = { key: cur.key, n: 0 };
    const lines = this.cm.get().split('\n');
    // show the next step that isn't typed yet
    let n = this.hintFor.n;
    while (n < steps.length && this.ghostDone(steps[n], lines)) n++;
    if (n >= steps.length) { this.toast('Every hint line is shown. Type them in, then Upload.', 'info'); this.refreshGhosts(); return; }
    this.hintFor.n = n + 1;
    this.refreshGhosts();
    this.sfx('task');
  }

  // ---- lesson highlights -------------------------------------------------------------
  // the first unfinished task of the current lesson decides what glows: board parts (renderer),
  // toolbar buttons, info-card rows, code lines and other page elements
  computeFocus() {
    const g = this.g, idx = g.lessonIndex(), L = g.map.lessons[idx];
    if (g.phase !== 'build' && g.phase !== 'wave') return null;
    const i = L.tasks.findIndex((t, k) => !this.lessonDone.has(`${idx}:${k}`) && !(t.check && t.check(g)));
    const t = L.tasks[i];
    if (!t?.focus) return null;
    try { return { ents: [], tools: [], info: [], dom: [], code: null, ...t.focus(g) }; } catch { return null; }
  }

  applyFocus() {
    const f = this.focus = this.computeFocus();
    for (const b of document.querySelectorAll('#tools .tool')) b.classList.toggle('focus', !!f?.tools.includes(b.dataset.tool));
    for (const n of document.querySelectorAll('#info [data-live]')) (n.closest('.kv') || n).classList.toggle('focus', !!f?.info.includes(n.dataset.live));
    const domNow = new Set(f ? f.dom.flatMap(sel => [...document.querySelectorAll(sel === '#ed-upload' ? '#ed-upload, #ed-upload-top' : sel)]) : []);   // phones: Upload is in the header
    for (const n of this._focusDom || []) if (!domNow.has(n)) n.classList.remove('focus');
    for (const n of domNow) n.classList.add('focus');
    this._focusDom = domNow;
    // code lines: only in a turret the task is about (or any turret when the task names none)
    const T = this.edTarget();
    const codeOn = f?.code && T && !T.lib && (!f.ents.length || f.ents.includes(T.s.id));
    this.cm.focusLines(codeOn ? f.code : null);
  }

  selectWire(id) {
    this.selected = null;
    this.selWire = id;
    this.renderInfo();
  }

  reroute(w) {
    if (!w) return;
    if (w.routes.length < 2) { this.toast('This wire has only one possible route.', 'info'); return; }
    this.g.cycleRoute(w);
    this.toast(`Route ${w.ri + 1} of ${w.routes.length}`, 'info');
  }

  // ---- info card --------------------------------------------------------------------
  renderWireInfo(w) {
    const el = this.el.info, g = this.g;
    const a = g.ents.get(w.from), b = g.ents.get(w.to);
    const name = e => e.type === 'socket' ? `Socket #${e.id}` : `${BUILDINGS[e.type].name} #${e.id}`;
    el.hidden = false;
    el.innerHTML = `<div class="ih"><span class="ii">${ICONS.wire}</span><div><b>Wire</b><small>${name(a)} → ${name(b)} · 12 V · max ${w.maxA} A (${w.maxA * POWER.volt} W)</small></div></div>
      <div class="meter"><i data-live="wbar"></i></div>
      <div class="kv"><span>Current</span><b data-live="wa"></b></div>
      <div class="kv"><span>Peak (all charging)</span><b data-live="wpeak"></b></div>
      <p class="note">One wire carries at most ${w.maxA} A (${w.maxA * POWER.volt} W), shared by everything after it. Tap <b>Route</b> (or press R) to switch which way it runs; that doesn't change the power.</p>
      <div class="acts"><button data-act="route">Route ↻ ${w.ri + 1}/${w.routes.length}</button><button data-act="unwire" class="danger">Remove</button></div>`;
    el.onclick = ev => {
      const btn = ev.target.closest('button[data-act]'); if (!btn) return;
      if (btn.dataset.act === 'route') { this.reroute(w); this.renderInfo(); }
      if (btn.dataset.act === 'unwire') { g.removeWire(w.id, true); this.selectWire(null); }
    };
    this.liveInfo();
  }

  renderInfo() {
    const el = this.el.info, g = this.g;
    const wsel = this.selWire && g.wires.get(this.selWire);
    if (wsel && this.editorFor == null) { this.renderWireInfo(wsel); return; }
    const e = this.selected && g.ents.get(this.selected);
    if (!e || this.editorFor != null) { el.hidden = true; return; }
    el.hidden = false;
    let html = '';
    if (e.type === 'psu') {
      html = `<div class="ih"><span class="ii">${ICONS.psu}</span><div><b>Power supply</b><small>12 V · max ${e.maxW} W (${fmt(e.maxW / POWER.volt)} A)</small></div></div>
        <div class="meter"><i data-live="psubar"></i></div>
        <div class="kv"><span>Output</span><b data-live="psuload"></b></div>
        <div class="kv"><span>Demand</span><b data-live="psudemand"></b></div>
        <div class="kv"><span>Peak (all charging)</span><b data-live="psupeak"></b></div>
        <div class="kv"><span>Outputs used</span><b>${e.outputs.length}/${PORTS.psu}</b></div>
        <p class="note" data-live="psunote"></p>
        ${this.upgradeHtml(e)}
        <div class="acts"><button data-act="wirefrom">Wire from here</button>${this.upgradeBtn(e)}<button data-act="sell" class="danger">Sell</button></div>`;
    } else if (e.type === 'splitter') {
      html = `<div class="ih"><span class="ii">${ICONS.splitter}</span><div><b>Splitter</b><small>1 input → up to 3 outputs</small></div></div>
        <div class="kv"><span>Input</span><b data-live="spin"></b></div>
        <div class="kv"><span>Outputs used</span><b>${e.outputs.length}/${PORTS.splitter}</b></div>
        <p class="note">All outputs share the input wire's 5 A (60 W) limit.</p>
        <div class="acts"><button data-act="wirefrom">Wire from here</button>${e.input ? '<button data-act="route">Route ↻</button><button data-act="unplug">Unplug</button>' : ''}<button data-act="sell" class="danger">Sell</button></div>`;
    } else {
      const t = e.turret;
      const head = t ? `${TURRETS[t.type].name} turret` : 'Empty socket';
      html = `<div class="ih"><span class="ii">${ICONS[t ? t.type : 'socket']}</span><div><b>${head}</b><small>Socket #${e.id} · 12 V · CPU ${e.cpu} lines/tick</small></div></div>
        <div class="meter cap"><i data-live="capbar"></i></div>
        <div class="kv"><span>Capacitor</span><b data-live="cap"></b></div>
        ${this.upgradeHtml(e)}
        <div class="kv"><span>Module slots</span><b>${(() => { const u = t ? g.extrasIn(t.code) : []; return `${u.length}/${e.slots}${u.length ? ` (${u.map(x => x.name).join(", ")})` : ""}`; })()}</b></div>
        <div class="kv"><span>Charging</span><b data-live="inw"></b></div>
        ${e.outputs.length ? '<div class="kv"><span>Passing on</span><b data-live="passw"></b></div>' : ''}
        ${t ? `<div class="kv"><span>CPU</span><b data-live="cpu"></b></div><div class="kv"><span>Status</span><b data-live="status"></b></div>` : ''}
        <p class="note" data-live="socknote"></p>
        <div class="acts">
          ${this.upgradeBtn(e)}
          ${t ? '<button data-act="code" class="primary">Code ✎</button>' : Object.entries(TURRETS).filter(([k]) => g.isUnlocked(k)).map(([k, d]) => `<button data-act="buy" data-type="${k}" ${g.isUnlocked(k) ? '' : 'disabled'}>${d.name} ${d.cost}</button>`).join('')}
          ${e.input ? '<button data-act="route">Route ↻</button><button data-act="unplug">Unplug</button>' : ''}
          ${e.input && !e.outputs.length ? '<button data-act="wirefrom" title="Pass power on to one more part. Everything after this socket shares its input wire.">Wire from here</button>' : ''}
          <button data-act="sell" class="danger">${t ? 'Sell turret' : 'Sell'}</button>
        </div>`;
    }
    el.innerHTML = html;
    el.onclick = ev => {
      const b = ev.target.closest('button[data-act]'); if (!b) return;
      const act = b.dataset.act;
      if (act === 'sell') { g.sell(e); if (!g.ents.has(e.id)) this.select(null); else this.renderInfo(); }
      if (act === 'code') this.openEditor(e.id);
      if (act === 'unplug') { g.unplug(e); this.renderInfo(); }
      if (act === 'upgrade') { g.upgrade(e); this.renderInfo(); }
      if (act === 'route') this.reroute(g.wires.get(e.input));
      if (act === 'wirefrom') { this.setTool('wire'); this.wireFrom = e.id; }
      if (act === 'buy') { const t = g.buildTurret(b.dataset.type, e); this.renderInfo(); this.copyNote(t); }
    };
    this.liveInfo();
  }

  // upgrade row + button for PSUs and sockets
  upgradeText(e, lvl) {
    const U = UPGRADES[e.type]?.[lvl - 1]; if (!U) return '';
    const B = this.g.boost || {};   // shown with the player's Lab boosts included
    return e.type === 'psu' ? `${U.maxW + (B.psuW || 0)} W` : `${U.chargeW + (B.chargeW || 0)} W charging, ${U.cap} J, ${U.slots + (B.slots || 0)} module slot${U.slots + (B.slots || 0) === 1 ? '' : 's'}`;
  }
  upgradeHtml(e) {
    const U = UPGRADES[e.type]; if (!U || this.g.upgradeInfo(e)?.locked) return '';
    return `<div class="kv"><span>Level</span><b>${'★'.repeat(e.level)}${'☆'.repeat(U.length - e.level)} · ${this.upgradeText(e, e.level)}</b></div>`;
  }
  upgradeBtn(e) {
    const u = this.g.upgradeInfo(e); if (!u) return '';
    if (u.max) return '<button disabled>Max level ★</button>';
    if (u.locked) return '';   // not unlocked yet: no button until the lesson that introduces upgrades
    return `<button data-act="upgrade" ${this.g.credits < u.cost ? 'disabled' : ''} title="Level ${e.level + 1}: ${this.upgradeText(e, e.level + 1)}">⬆ ${this.upgradeText(e, e.level + 1)} · ${u.cost}</button>`;
  }

  // tell the player where a new turret's program came from (each turret owns its own copy)
  copyNote(t) {
    if (!t || t.copiedFrom == null) return;
    this.toast(`New ${TURRETS[t.type].name} runs a copy of #${t.copiedFrom}'s program. Editing one turret never changes the others.`, 'info');
  }

  liveInfo() {
    const el = this.el.info, g = this.g;
    if (el.hidden) return;
    const set = (k, v) => { const n = el.querySelector(`[data-live="${k}"]`); if (n) n.innerHTML = v; };
    const w = this.selWire && g.wires.get(this.selWire);
    if (w) {
      const k = w.aS / w.maxA;
      const bar = el.querySelector('[data-live="wbar"]'); if (bar) { bar.style.width = `${Math.min(100, k * 100)}%`; bar.style.background = k > 0.95 ? 'var(--bad)' : k > 0.7 ? 'var(--warn)' : 'var(--good)'; }
      set('wa', `${fmt(w.aS * POWER.volt)} W of ${w.maxA * POWER.volt} W max · ${fmt(w.aS, 2)} / ${w.maxA} A${k >= 0.97 ? ' <span class="bad">(full)</span>' : ''}`);
      g.updatePeaks();
      const pk = (w.peakW || 0) / (w.maxA * POWER.volt);
      set('wpeak', `${fmt(w.peakW || 0)} W ${pk > 1.001 ? '<span class="bad">overloaded</span>' : pk >= 0.75 ? '<span class="warn">near the limit</span>' : '<span class="good">OK</span>'}`);
      return;
    }
    if (this.selWire) { this.selectWire(null); return; }
    const e = this.selected && g.ents.get(this.selected);
    if (!e) return;
    if (e.type === 'psu') {
      const k = e.loadS / e.maxW;
      const bar = el.querySelector('[data-live="psubar"]'); if (bar) { bar.style.width = `${Math.min(100, k * 100)}%`; bar.style.background = k > 0.95 ? 'var(--bad)' : k > 0.7 ? 'var(--warn)' : 'var(--good)'; }
      set('psuload', `${fmt(e.loadS)} W · ${fmt(e.loadS / POWER.volt, 2)} A`);
      set('psudemand', `${fmt(e.demandW)} W`);
      g.updatePeaks();
      const pk = (e.peakW || 0) / e.maxW;
      set('psupeak', `${fmt(e.peakW || 0)} W ${pk > 1.001 ? '<span class="bad">overloaded</span>' : pk >= 0.75 ? '<span class="warn">near the limit</span>' : '<span class="good">OK</span>'}`);
      set('psunote', e.overload ? `<span class="bad">Overloaded!</span> Sockets want more than ${e.maxW} W, so everyone gets a smaller share. Add another PSU.` : e.outputs.length ? 'Sockets draw power only while their capacitor is not full.' : 'Not connected to anything yet. Use Wire.');
    } else if (e.type === 'splitter') {
      const w = e.input && g.wires.get(e.input);
      set('spin', w ? `${fmt(w.aS * POWER.volt)} W · ${fmt(w.aS, 2)} A / ${w.maxA} A` : '<span class="bad">not connected</span>');
    } else {
      const k = e.energy / e.cap;
      const bar = el.querySelector('[data-live="capbar"]'); if (bar) { bar.style.width = `${k * 100}%`; bar.style.background = e.offline ? 'var(--bad)' : k < 0.3 ? 'var(--warn)' : 'var(--accent)'; }
      set('cap', `${fmt(e.energy)} / ${e.cap} J`);
      const w = e.input && g.wires.get(e.input);
      set('inw', e.input ? `${fmt(e.inS)} W${w && w.aS >= w.maxA * 0.97 ? ' <span class="bad">(wire maxed)</span>' : ''}` : '<span class="bad">no power input</span>');
      const t = e.turret;
      if (t) {
        set('cpu', `${t.ops}/${e.cpu} lines${t.over ? ' <span class="warn">overrun</span>' : ''}`);
        set('status', this.statusOf(e).html);
      }
      const ow = e.outputs.length && g.wires.get(e.outputs[0]);
      if (ow) set('passw', `${fmt(ow.aS * POWER.volt)} W → ${(() => { const n = g.ents.get(ow.to); return n.type === 'socket' ? `Socket #${n.id}` : `${BUILDINGS[n.type].name} #${n.id}`; })()}`);
      set('socknote', !e.input ? 'Connect a wire from a PSU, Splitter or another Socket.' : e.offline && t ? 'Brownout: waiting for 25% charge.'
        : w && w.aS >= w.maxA * 0.97 && e.outputs.length ? `The wire into this socket is full (${w.maxA * POWER.volt} W), and it also feeds the parts after it. Give one of them its own wire from a PSU.` : !t ? 'Pick a turret to install.' : '');
    }
  }

  statusOf(s) {
    const t = s.turret;
    if (!t) return { text: 'Empty', cls: '', html: 'Empty' };
    let text, cls;
    if (!this.py.ready) { text = 'Python loading'; cls = 'warn'; }
    else if (!t.compiled) { text = t.error ? 'Code error' : 'Not uploaded'; cls = 'bad'; }
    else if (s.offline) { text = s.input ? 'Brownout' : 'No power'; cls = 'bad'; }
    else if (t.starvedUntil > this.g.time) { text = 'Low power'; cls = 'warn'; }
    else if (t.runtimeError) { text = 'Runtime error'; cls = 'bad'; }
    else if (t.over) { text = 'CPU overrun'; cls = 'warn'; }
    else { text = 'Running'; cls = 'good'; }
    return { text, cls, html: `<span class="${cls}">${text}</span>` };
  }

  // ---- editor ---------------------------------------------------------------------
  // what the editor is showing: a turret program or the shared library
  edTarget() {
    if (this.editorFor === 'lib') return { lib: true, t: this.g.library };
    const s = this.editorFor != null && this.g.ents.get(this.editorFor);
    return s?.turret ? { lib: false, s, t: s.turret } : null;
  }

  bindEditor() {
    this.cm = makeEditor($('#cm-host'), v => {
      const T = this.edTarget();
      if (T) T.t.draft = v;
      this.cm.mark(null);
      this.refreshGhosts?.();
    });
    $('#ed-close').addEventListener('click', () => this.closeEditor());
    $('#ed-task').addEventListener('click', e => { if (this.edTaskBig && !e.target.closest('.et-tog')) return; this.edTaskBig = !this.edTaskBig; this.updateTip(); setTimeout(() => this.cm.refresh(), 30); });
    $('#ed-upload').addEventListener('click', () => this.upload());
    $('#ed-hint').addEventListener('click', () => this.hint());
    $('#ed-upload-top').addEventListener('click', () => this.upload());
    $('#ed-revert').addEventListener('click', () => {
      const T = this.edTarget(); if (!T) return;
      T.t.draft = null; this.cm.set(T.t.code);
    });
    $('#ed-template').addEventListener('click', () => {
      const T = this.edTarget(); if (!T) return;
      if (!confirm('Replace the editor text with the starter template?')) return;
      const tpl = T.lib ? DEFAULT_LIBRARY : TEMPLATES[T.t.type];
      this.cm.set(tpl); T.t.draft = tpl;
    });
    this.el.copy.addEventListener('change', () => {
      const id = +this.el.copy.value; this.el.copy.value = '';
      const src = this.g.ents.get(id); const T = this.edTarget();
      if (src?.turret && T && !T.lib) { this.cm.set(src.turret.code); T.t.draft = src.turret.code; this.toast(`Copied program from socket #${id}. Press Upload to use it.`, 'info'); }
    });
    $('#ed-clear').addEventListener('click', () => {
      const T = this.edTarget(); if (!T) return;
      T.t.logs = []; T.t.logVersion = (T.t.logVersion || 0) + 1; this.renderConsole(true);
    });
    for (const b of document.querySelectorAll('#editor .tabs button')) b.addEventListener('click', () => this.setTab(b.dataset.tab));
  }

  setTab(tab) {
    this.tab = tab;
    for (const b of document.querySelectorAll('#editor .tabs button')) b.classList.toggle('on', b.dataset.tab === tab);
    // phone tabs: "console" shows the code tab's console only, "lesson" shows the current lesson
    const pane = tab === 'console' ? 'code' : tab;
    for (const id of ['code', 'power', 'docs', 'lesson']) $(`#tab-${id}`).hidden = id !== pane;
    $('#tab-code').classList.toggle('console-mode', tab === 'console');
    if (tab === 'lesson') $('#tab-lesson').innerHTML = `<h3>Lesson ${this.g.lessonLabel()}: ${esc(this.g.lesson().title)}</h3>${$('#lesson-tasks').outerHTML.replace('id="lesson-tasks"', '')}<div class="lesson">${$('#lesson-body').innerHTML}</div>`;
    if (tab === 'code') setTimeout(() => this.cm.refresh(), 0);
    if (tab === 'power') { this.renderPower(); this.g.flags.powerTabViewed = true; }
    if (tab === 'docs') this.renderDocs();
  }

  openEditor(id) {
    const lib = id === 'lib';
    const s = lib ? null : this.g.ents.get(id);
    if (lib ? !this.g.map.library : !s?.turret) return;
    const t = lib ? this.g.library : s.turret;
    if (this.editorFor == null) this.editRun = false;   // Plan mode: pause again each time the editor opens
    this.editorFor = id;
    if (!lib) this.select(id); else this.select(null);
    // floating window over the board: the board and lesson panel stay where they are (no resize, no flicker)
    this.el.editor.hidden = false;
    document.body.classList.add('ed-open');
    $('#ed-kicker').textContent = lib
      ? 'Shared code · every turret can use it with import lib'
      : `${TURRETS[t.type].name} · Socket #${s.id} · modules: ${TURRETS[t.type].modules.join(', ')}${this.g.map.library ? ', lib' : ''}`;
    $('#ed-title').textContent = lib ? '📚 Library' : 'Turret program';
    $('#editor .tabs button[data-tab="power"]').hidden = lib;
    this.el.copy.hidden = lib;
    this.el.info.hidden = true;
    this.cm.set(t.draft ?? t.code);
    if (t.draft != null) t.draft = this.cm.get();
    if (!lib) {
      const others = this.g.sockets().filter(o => o !== s && o.turret && o.turret.type === t.type);
      this.el.copy.innerHTML = '<option value="">Copy from…</option>' + others.map(o => `<option value="${o.id}">${TURRETS[t.type].name} #${o.id}</option>`).join('');
      this.el.copy.disabled = !others.length;
    }
    this.setTab('code');
    this.consoleVersion = -1;
    this.renderConsole(true);
    const errLine = lib ? t.error?.line : (t.error?.line || t.runtimeError?.line);
    this.cm.mark(errLine);
    this.updateTip();
    requestAnimationFrame(() => { this.cm.refresh(); if (!errLine) this.cm.gotoTodo(); this.refreshGhosts(); });
  }

  // drag the editor window by its title bar; it stays inside the board area
  bindEditorDrag() {
    const ed = this.el.editor, head = $('#ed-drag'), stage = $('#stage');
    let d = null;
    head.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('button') || window.innerWidth <= 860) return;
      const r = ed.getBoundingClientRect(), s = stage.getBoundingClientRect();
      d = { dx: e.clientX - r.left, dy: e.clientY - r.top, s, w: r.width, h: r.height };
      Object.assign(ed.style, { left: `${r.left - s.left}px`, top: `${r.top - s.top}px`, width: `${r.width}px`, height: `${r.height}px`, right: 'auto', bottom: 'auto' });
      head.setPointerCapture(e.pointerId);
    });
    head.addEventListener('pointermove', e => {
      if (!d) return;
      const x = Math.max(0, Math.min(d.s.width - d.w, e.clientX - d.s.left - d.dx));
      const y = Math.max(0, Math.min(d.s.height - d.h, e.clientY - d.s.top - d.dy));
      ed.style.left = `${x}px`; ed.style.top = `${y}px`;
    });
    const end = () => { d = null; };
    head.addEventListener('pointerup', end);
    head.addEventListener('pointercancel', end);
    // CodeMirror must re-measure when the window is resized with its corner handle
    new ResizeObserver(() => { if (!ed.hidden) this.cm.refresh(); }).observe(ed);
  }

  closeEditor() {
    if (this.editorFor == null) return;
    this.editorFor = null;
    this.el.editor.hidden = true;
    document.body.classList.remove('ed-open');
    this.renderInfo();
    this.updateTip();
  }

  upload() {
    const T = this.edTarget();
    if (!T) return;
    const r = T.lib ? this.g.setLibrary(this.cm.get()) : this.g.compileTurret(T.s, this.cm.get());
    if (r.ok) { T.t.draft = null; this.cm.mark(null); this.toast(T.lib ? 'Library uploaded ✓' : 'Uploaded ✓', 'good'); this.sfx('upload'); }
    else { this.cm.mark(r.error?.line); this.toast('Upload failed: see console', 'bad'); this.sfx('error'); }
    this.renderConsole(true);
    this.checkLesson();
    this.autosave();
  }

  renderConsole(force) {
    const T = this.edTarget();
    if (!T) return;
    const t = T.t;
    if (!force && t.logVersion === this.consoleVersion) return;
    this.consoleVersion = t.logVersion;
    const c = this.el.console;
    const atBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 30;
    c.innerHTML = t.logs.slice(-60).map(l => {
      const hint = (l.kind === 'err' || l.kind === 'warn') ? hintFor(l.text) : null;
      return `<div class="log ${l.kind}"><span class="ts">${fmt(l.time)}s</span><span class="tx">${esc(l.text)}${l.n > 1 ? ` <b class="rep">×${l.n}</b>` : ''}${hint ? `<em>💡 ${esc(hint)}</em>` : ''}</span></div>`;
    }).join('') || `<div class="log sys"><span class="tx">${T.lib ? 'Library messages appear here.' : 'print() output and errors appear here.'}</span></div>`;
    if (atBottom || force) c.scrollTop = c.scrollHeight;
  }

  renderPower() {
    const T = this.edTarget();
    if (!T || T.lib) return;
    const s = T.s;
    const est = this.g.estimate(s);
    const w = s.input && this.g.wires.get(s.input);
    $('#tab-power').innerHTML = `
      <h3>Power budget</h3>
      <p class="muted">Based on your uploaded settings. Change values in <code>setup()</code> and upload to see the effect.</p>
      <table class="ptable">${est.rows.map(r => `<tr><td>${r[0]}</td><td class="num">${fmt(r[1])} ${r[2]}</td><td class="muted">${esc(r[3])}</td></tr>`).join('')}
      <tr class="sum"><td>Worst case (everything at once)</td><td class="num">${fmt(est.peak)} W</td><td></td></tr></table>
      <div class="kv"><span>Socket charge limit</span><b>${s.chargeW} W</b></div>
      ${(() => { this.g.updatePeaks(); const wc = this.g.worstCase(s); return wc ? `<div class="kv"><span>Supply in the worst case (all sockets charging)</span><b>${fmt(wc.supply)} W</b></div><div class="kv"><span>Meter's worst-case bar (use ÷ supply)</span><b class="${wc.ratio <= 1.0 ? 'good' : wc.ratio <= 1.5 ? 'warn' : 'bad'}">${isFinite(wc.ratio) ? Math.round(wc.ratio * 100) + '%' : 'no power'}</b></div>` : ''; })()}
      <div class="kv"><span>Charging now</span><b>${fmt(s.inS)} W</b></div>
      <div class="kv"><span>Capacitor</span><b>${fmt(s.energy)} / ${s.cap} J</b></div>
      <div class="kv"><span>Input wire</span><b>${w ? `${fmt(w.aS, 2)} A of ${w.maxA} A` : 'none'}</b></div>
      ${est.peak > s.chargeW ? `<p class="note warn">Worst case is above the ${s.chargeW} W the socket can charge at. The capacitor covers bursts, but firing nonstop will drain it and cause a brownout.</p>` : '<p class="note good">This setup can run nonstop without draining the capacitor (if the PSU and wire can deliver).</p>'}
      <h3>The physics</h3>
      <ul class="muted"><li><b>P = V × I</b>: 12 V × 5 A = 60 W per wire.</li><li><b>Energy (J) = Power (W) × time (s)</b>: a ${POWER.socketChargeW} W charger fills 100 J in ${fmt(100 / POWER.socketChargeW)} s.</li><li>A shot is a burst of energy (J); a beam or motor is a steady draw (W).</li></ul>`;
  }

  renderDocs() {
    const T = this.edTarget();
    let mods = T && !T.lib ? [...TURRETS[T.t.type].modules] : ['radar', 'motor', 'cannon', 'pulse', 'laser', 'power'];
    if (this.g.map.library) mods = T?.lib ? ['lib', ...mods] : [...mods, 'lib'];
    $('#tab-docs').innerHTML = DOCS.basics + mods.map(m => DOCS[m]).join('') +
      `<h3>Enemies</h3><table>${Object.values(ENEMIES).map(e => `<tr><td><span class="dot" style="background:${e.color}"></span><code>"${e.name.toLowerCase()}"</code></td><td>hp ${e.hp}${e.armor ? `, armor ${e.armor}` : ''}${e.shield ? `, shield ${e.shield}` : ''}, speed ${e.speed}. ${e.desc}</td></tr>`).join('')}</table>`;
  }

  updateEditorLive() {
    const T = this.edTarget();
    if (!T) return;
    const t = T.t;
    let st;
    if (t.draft != null && t.draft !== t.code) st = { text: 'Changes not uploaded', cls: 'warn' };
    else if (T.lib) st = t.error ? { text: 'Library error', cls: 'bad' } : { text: 'Library OK', cls: 'good' };
    else st = this.statusOf(T.s);
    this.el.status.textContent = st.text;
    this.el.status.className = `chip ${st.cls}`;
    this.renderConsole(false);
    if (this.tab === 'power') this.renderPower();
  }

  // ---- lessons / guide -----------------------------------------------------------------
  renderGuide() {
    const g = this.g;
    const idx = g.lessonIndex(), WAVES = g.map.waves, M = g.map;
    const L = g.map.lessons[idx];
    $('#lesson-num').textContent = g.lessonLabel(idx);
    $('#lesson-title').textContent = L.title;
    if (this._shownLesson !== `${g.map.id}:${idx}`) { this._shownLesson = `${g.map.id}:${idx}`; $('#guide .pane-body').scrollTop = 0; }   // new lesson: start reading at the top
    $('#lesson-body').innerHTML = L.body;
    $('#lesson-tasks').innerHTML = L.tasks.map((t, i) => `<div class="task" data-i="${i}"><span class="tick">✓</span><div><b>Task${L.tasks.length > 1 ? ` ${i + 1}` : ''}</b><div>${t.text}</div></div></div>`).join('');
    $('#lesson-hint').hidden = true; $('#lesson-hint').innerHTML = `💡 ${esc(L.hint)}`;
    $('#lesson-sol').hidden = true; $('#lesson-sol').innerHTML = `<pre>${esc(L.solution)}</pre>`;
    $('#btn-hint').onclick = () => { $('#lesson-hint').hidden = !$('#lesson-hint').hidden; if (this.editorFor != null) this.hint(); };
    $('#btn-solution').onclick = () => { $('#lesson-sol').hidden = !$('#lesson-sol').hidden; };
    // next wave preview
    const wi = Math.min(g.wave, WAVES.length - 1);
    const counts = {};
    for (const grp of WAVES[wi]) counts[grp.t] = (counts[grp.t] || 0) + grp.n;
    $('#wave-title').textContent = `Wave ${wi + 1}`;
    $('#wave-preview').innerHTML = Object.entries(counts).map(([k, n]) => {
      const d = ENEMIES[k];
      return `<div class="enemy-chip" title="${esc(d.desc)}"><span class="dot" style="background:${d.color}"></span><b>${n}×</b> ${d.name}<small>${Math.round(d.boss ? d.hp * g.bossMul(wi) : d.hp * M.hpBase * (1 + M.hpGrowth * wi))} hp${d.armor ? ` · armor ${d.armor}` : ''}${d.shield ? ` · shield ${d.shield}` : ''} · ${d.desc}</small></div>`;
    }).join('');
    this.checkLesson();
  }

  checkLesson() {
    const idx = this.g.lessonIndex();
    const L = this.g.map.lessons[idx];
    L.tasks.forEach((t, i) => {
      const done = t.check ? !!t.check(this.g) : false;
      $(`#lesson-tasks .task[data-i="${i}"]`)?.classList.toggle('done', done);
      const key = `${idx}:${i}`;
      if (done && !this.lessonDone.has(key)) {
        this.lessonDone.add(key);
        this.toast(L.tasks.length > 1 ? `Lesson ${this.g.lessonLabel(idx)}, task ${i + 1} complete!` : `Lesson ${this.g.lessonLabel(idx)} task complete!`, 'good');
        this.sfx('task');
        if (L.keeps) this.keepFunction(L.keeps);
      }
    });
    // all tasks done and a half-lesson (like 3½) belongs to this wave: move on to it right away
    const next = this.g.lessonIndex();
    if (next !== idx) {
      this.toast(`New: Lesson ${this.g.lessonLabel(next)} · ${this.g.map.lessons[next].title}`, 'good');
      this.renderGuide();
      this.flashGuide();
      return;
    }
    this.updateTip();
  }

  // one context-sensitive hint about what to do next (shown over the board)
  tipFor() {
    const g = this.g;
    if (g.phase !== 'build' && g.phase !== 'wave') return null;
    const socks = g.sockets();
    const bad = socks.find(s => s.turret && (!s.turret.compiled || s.turret.runtimeError));
    if (bad && this.py.ready) return { id: bad.id, text: `The turret on socket #${bad.id} has a code problem. Double-click it to read the console.` };
    const draft = socks.find(s => s.turret?.draft != null && s.turret.draft !== s.turret.code);
    if (draft && this.editorFor !== draft.id) return { id: draft.id, text: `Socket #${draft.id} has code changes that aren't uploaded yet. Open it and press Upload.` };
    const unpowered = socks.find(s => !s.input);
    if (unpowered) return { id: unpowered.id, text: `Socket #${unpowered.id} has no power. Pick Wire, tap a PSU, then tap the socket.` };
    const empty = socks.find(s => !s.turret);
    if (empty) return { id: empty.id, text: `Socket #${empty.id} is empty. Tap it and choose a turret.` };
    if (g.phase !== 'build') return null;
    const over = g.psus().find(p => p.overload);
    if (over) return { id: over.id, text: `PSU #${over.id} is overloaded: its sockets want more than ${over.maxW} W. A second PSU gives more power.` };
    const cheapest = BUILDINGS.socket.cost + TURRETS.cannon.cost;
    const firstLesson = g.map.num === 1 && g.wave === 0;   // let beginners focus on their first line of code
    if (g.credits >= cheapest && !firstLesson) return { id: null, text: `You have ${g.credits} credits, enough for a new tower: Socket (${BUILDINGS.socket.cost}) + Cannon (${TURRETS.cannon.cost}).` };
    return null;
  }

  updateTip() {
    const tip = this.tipFor();
    const el = this.el.tip;
    const gel = $('#guide-tip');
    const text = tip ? tip.text : '';
    if (el.dataset.text !== text) {
      el.dataset.text = text;
      el.innerHTML = gel.innerHTML = tip ? `<span>💡</span><span>${esc(text)}</span>` : '';
    }
    // tip lives in the lesson panel when it's visible, otherwise floats over the board
    // desktop: side panel open · phone: bottom sheet is always there, but hidden behind a full-screen editor unless split
    const side = this.el.side, phone = window.innerWidth <= 860;
    const shown = !this.el.guide.hidden && getComputedStyle(side).display !== 'none' && side.offsetWidth > 50 && side.offsetHeight > 50;
    const guideVisible = shown && (phone ? (this.editorFor == null || document.body.classList.contains('ed-split')) : side.classList.contains('open'));
    gel.hidden = !tip || !guideVisible;
    // lesson panel hidden (phone, or closed)? show the current task inside the editor instead
    const edTask = $('#ed-task');
    if (this.editorFor != null && !guideVisible) {
      const idx = this.g.lessonIndex(), L = this.g.map.lessons[idx];
      const i = L.tasks.findIndex((t, k) => !this.lessonDone.has(`${idx}:${k}`));
      // tap the strip to expand it into the whole lesson (and tap again to make it small)
      const big = !!this.edTaskBig;
      const html = i < 0 && !big ? '' : `<span class="et-tog">${big ? '▴ less' : '▾ more'}</span>`
        + (i < 0 ? `<b>Lesson ${this.g.lessonLabel(idx)}</b>: all tasks done.` : `<b>Lesson ${this.g.lessonLabel(idx)}${L.tasks.length > 1 ? `, task ${i + 1}` : ''}:</b> ${L.tasks[i].text}`)
        + (big ? `<div class="et-more lesson">${L.body}</div>` : '');
      if (edTask.dataset.html !== html) { edTask.dataset.html = html; edTask.innerHTML = html; }
      edTask.classList.toggle('big', big);
      edTask.hidden = !html;
    } else edTask.hidden = true;
    el.hidden = !tip || guideVisible || this.editorFor != null;
    el.onclick = gel.onclick = () => { if (tip?.id) this.select(tip.id); };
  }

  flashGuide() {
    const el = this.el.guide;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    el.querySelector('.pane-body').scrollTop = 0;   // a new lesson always starts at the top
    if ((window.innerWidth > 860 || document.body.classList.contains('phone')) && this.editorFor == null) this.el.side.classList.add('open');   // phone: the new lesson shows as a card
    $('#lesson-go').textContent = "I'm ready!";   // the card closes with this after a wave
  }

  // ---- misc --------------------------------------------------------------------------
  toast(msg, kind = 'info') {
    const d = document.createElement('div');
    d.className = `toast ${kind}`; d.textContent = msg;
    this.el.toasts.appendChild(d);
    while (this.el.toasts.children.length > 4) this.el.toasts.firstChild.remove();
    setTimeout(() => d.classList.add('out'), 2600);
    setTimeout(() => d.remove(), 3000);
  }

  // opts.locked: can't be closed by tapping outside (e.g. "Who's playing?" before anyone is picked)
  modal(html, buttons, opts = {}) {
    const m = this.el.modal;
    m.querySelector('.modal-box').innerHTML = html + `<div class="acts">${buttons.map((b, i) => `<button data-i="${i}" class="${b.cls || ''}">${b.label}</button>`).join('')}</div>`;
    m.hidden = false;
    m.dataset.locked = opts.locked ? '1' : '';
    m.onclick = e => { if (e.target === m && !opts.locked) m.hidden = true; };   // tap outside the window = close
    m.querySelector('.acts').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      const def = buttons[+b.dataset.i];
      if (def.close !== false) m.hidden = true;
      def.fn?.();
    };
  }

  settingsModal() {
    const live = !this.planMode;
    this.modal(`<h2>Settings</h2>
      <label class="opt"><input type="radio" name="mode" value="plan" ${live ? '' : 'checked'}><div><b>Plan mode</b><small>The game pauses when you open the code editor. Press ▶ (or a speed button) to keep it running while you edit. Best for learning.</small></div></label>
      <label class="opt"><input type="radio" name="mode" value="live" ${live ? 'checked' : ''}><div><b>Live mode</b><small>The game keeps running while you code. Hot-fix turrets mid-wave!</small></div></label>
      <label class="opt"><div><b>Screen layout</b><small>Auto picks the phone layout on small touch screens. If your browser guesses wrong, choose one here (also the 📱 / 🖥 button).</small>
        <select id="set-layout">${['auto', 'phone', 'desktop'].map(v => `<option value="${v}" ${(this.getLayout?.() || 'auto') === v ? 'selected' : ''}>${{ auto: 'Auto', phone: 'Phone (landscape, tap menus)', desktop: 'Desktop' }[v]}</option>`).join('')}</select></div></label>
      <label class="opt"><input type="checkbox" id="set-pathflow" ${this.showPathFlow ? 'checked' : ''}><div><b>Enemy path indicator</b><small>Moving dots along the enemy path and the glow where enemies enter. Shortcut: V.</small></div></label>
      <p class="muted">Game version ${window.CD_VERSION || "?"} · Python ${this.py.version || '(loading)'} running in your browser via Pyodide.</p>`,
      [{ label: 'Restart game', cls: 'danger', fn: () => this.restart() }, {
        label: 'Done', cls: 'primary', fn: () => {
          const v = document.querySelector('input[name="mode"]:checked')?.value;
          this.planMode = v !== 'live';
          this.setPathFlow(!!document.querySelector('#set-pathflow')?.checked);
          const lay = document.querySelector('#set-layout')?.value;
          if (lay && lay !== this.getLayout?.()) this.setLayout?.(lay);
          try { localStorage.setItem('cd.mode', this.planMode ? 'plan' : 'live'); } catch { /* ignore */ }
        },
      }]);
  }

  setPathFlow(on) {
    this.showPathFlow = on;
    try { localStorage.setItem('cd.pathflow', on ? '1' : '0'); } catch { /* ignore */ }
  }

  // endless mode: best score per map (waves survived), per player
  endlessBest(id) { return (this.storeGet(this.pk('endless')) || {})[id] || 0; }
  endlessEnd(won) {
    const g = this.g, id = g.map.id.slice(8), waves = g.wave;
    const best = this.endlessBest(id), isNew = waves > best;
    if (isNew && !this.noSave) { const all = this.storeGet(this.pk('endless')) || {}; all[id] = waves; this.storeSet(this.pk('endless'), all); }
    this.modal(`<h2 class="${won ? 'good' : 'bad'}">${won ? 'Endless cleared!' : 'Core breached'}</h2>
      <p>${esc(g.map.name)}: you survived <b>${waves}</b> wave${waves === 1 ? '' : 's'}.</p>
      <p class="${isNew ? 'good' : 'muted'}">${isNew ? (best ? `New best! (was ${best})` : 'First score on this map!') : `Your best: ${best} waves.`}</p>
      <p class="muted">${g.stats.kills} enemies destroyed.</p>`,
      [{ label: 'Campaign', fn: () => this.campaignModal() }, { label: 'Try again', cls: 'primary', fn: () => this.startMap(g.map.id, false) }]);
  }

  endModal(won) {
    const g = this.g;
    this.closeEditor();
    if (g.map.endless) return this.endlessEnd(won);
    const i = MAPS.findIndex(m => m.id === g.map.id);
    const next = MAPS[i + 1];
    this.modal(won
      ? `<h2 class="good">System secured!</h2><p>You cleared all ${g.map.waves.length} waves of <b>${g.map.name}</b>.</p><p class="muted">${g.stats.kills} bugs squashed, core integrity ${g.core}/${g.coreMax}.</p>${this.starsHtml()}${next ? `<p>Next up: <b>${next.name}</b>. ${next.desc}</p>` : '<p>That was the last map, for now.</p>'}`
      : `<h2 class="bad">Core breached</h2><p>You survived ${g.wave} wave${g.wave === 1 ? '' : 's'}.</p><p class="muted">Tip: check each turret's console for errors and brownouts, and the Power tab for energy use.</p>`,
      won && next
        ? [{ label: 'Campaign', fn: () => this.campaignModal() }, { label: '🧪 Lab', fn: () => this.labModal() }, { label: `Play ${next.name} ▶`, cls: 'primary', fn: () => this.startMap(next.id, false) }]
        : [{ label: 'Campaign', fn: () => this.campaignModal() }, { label: 'Restart map', fn: () => this.restart() },
          ...(this.waveSnap ? [{ label: `↺ Replay wave ${this.waveSnap.wave + 1}`, cls: 'primary', fn: () => this.replayWave(false) }] : [])]);
  }

  // replay the last wave: everything goes back to just before it started (credits, core, parts,
  // wires), but the player's newest turret code and Library stay, so they can retry with improvements
  replayWave(ask = true) {
    const snap = this.waveSnap; if (!snap) return;
    if (this.g.map.endless) { this.toast('Replay is off in endless mode: your score is how far you get in one go.', 'bad'); return; }
    const n = snap.wave + 1;
    if (ask && !confirm(`Replay wave ${n}? Credits, core, parts and wires go back to how they were before wave ${n}. Your newest code stays.`)) return;
    const codeNow = new Map(this.g.sockets().filter(s => s.turret).map(s => [`${s.c},${s.r},${s.turret.type}`, s.turret.code]));
    const libNow = this.g.library.code;
    this.el.modal.hidden = true;
    this.closeEditor();
    this.g.load(snap);
    this.waveSnap = snap;   // can be replayed again
    this.lessonDone = new Set(snap.lessonDone || []);
    for (const s of this.g.sockets()) {
      const code = s.turret && codeNow.get(`${s.c},${s.r},${s.turret.type}`);
      if (code && code !== s.turret.code) this.g.compileTurret(s, code);
    }
    if (this.g.map.library && libNow !== this.g.library.code) this.g.setLibrary(libNow);
    this.select(null);
    this.renderGuide();
    this.autosave();
    this.toast(`Back to just before wave ${n}. Your newest code is kept.`, 'good');
  }

  restart() {
    this.el.modal.hidden = true;
    this.clearSave();
    this.applyBoost();
    this.g.setMap(this.g.map.id);   // resets the map and emits 'map' (UI resets itself)
  }

  // ---- save / campaign -------------------------------------------------------------
  storeGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
  storeSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked: play without saving */ } }
  // every player profile keeps its own saves and progress: cd.p.<profile id>.<name>
  pk(name) { return `cd.p.${this.pid || 'none'}.${name}`; }
  saveKey(id = this.g.map.id) { return this.pk(`save.${id}`); }

  // ---- player profiles ("Who's playing?", no login) ---------------------------------
  profiles() { return this.storeGet('cd.profiles') || []; }
  setProfiles(list) { this.storeSet('cd.profiles', list); }
  currentProfile() { return this.profiles().find(p => p.id === this.pid) || null; }

  // older versions saved without profiles: move those saves into a first profile
  migrateProfiles() {
    if (this.profiles().length) return;
    const old = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^cd\.(save\.|progress$|lastMap$)/.test(k)) old.push(k); } } catch { return; }
    if (!old.length) return;
    const p = { id: Math.random().toString(36).slice(2, 8), name: 'Player 1', avatar: '🤖' };
    this.setProfiles([p]);
    for (const k of old) {
      try { localStorage.setItem(`cd.p.${p.id}.${k.slice(3)}`, localStorage.getItem(k)); localStorage.removeItem(k); } catch { /* ignore */ }
    }
  }

  usePlayer(id) {
    this.pid = id;
    try { localStorage.setItem('cd.profile', id); } catch { /* ignore */ }
    this.el.modal.hidden = true;
    const p = this.currentProfile();
    this.updatePlayerBadge();
    const last = this.storeGet(this.pk('lastMap'));
    const anySave = MAPS.some(m => this.storeGet(this.saveKey(m.id)));
    const anyWin = Object.keys(this.progress().won).length > 0;
    if (anySave || anyWin) this.campaignModal();
    else { this.startMap(last || MAPS[0].id, false); this.toast(`Hi ${p?.name || 'player'}! Your progress is saved on this device.`, 'good'); }
  }

  updatePlayerBadge() {
    const p = this.currentProfile(), b = document.getElementById('btn-player');
    if (b) { b.textContent = p ? p.avatar : '👤'; b.title = p ? `Playing as ${p.name} (tap to switch)` : 'Players'; }
  }

  playersModal() {
    const list = this.profiles();
    const cards = list.map(p => `<div class="player-card" data-pid="${p.id}"><span class="av">${p.avatar}</span><b>${esc(p.name)}</b><button class="link" data-del="${p.id}" title="Delete this player">✕</button></div>`).join('');
    this.modal(`<h2>Who's playing?</h2>
      <p class="muted">Each player has their own saves on this device. No password needed.</p>
      <div class="players">${cards || '<p class="muted">No players yet.</p>'}</div>`,
      [{ label: '+ New player', cls: list.length ? '' : 'primary', fn: () => this.newPlayerModal() }], { locked: !this.pid });
    this.el.modal.querySelector('.players').onclick = e => {
      const del = e.target.closest('[data-del]');
      if (del) {
        const p = list.find(x => x.id === del.dataset.del);
        if (!confirm(`Delete ${p.name} and all of their saves on this device? This can't be undone.`)) return;
        try { for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k.startsWith(`cd.p.${p.id}.`)) localStorage.removeItem(k); } } catch { /* ignore */ }
        this.setProfiles(list.filter(x => x.id !== p.id));
        if (this.pid === p.id) this.pid = null;
        this.playersModal();
        return;
      }
      const c = e.target.closest('[data-pid]'); if (c) this.usePlayer(c.dataset.pid);
    };
  }

  newPlayerModal() {
    const avatars = ['🤖', '🦊', '🐱', '🐸', '🐼', '🦉', '🐙', '🐲', '🦄', '🐝'];
    let pick = avatars[this.profiles().length % avatars.length];
    this.modal(`<h2>New player</h2>
      <label class="field">Name<input id="np-name" maxlength="16" placeholder="Your name" autocomplete="off"></label>
      <div class="avatars">${avatars.map(a => `<button class="av-pick ${a === pick ? 'on' : ''}" data-av="${a}">${a}</button>`).join('')}</div>`,
      [{ label: 'Back', fn: () => this.playersModal() },
        { label: 'Start playing', cls: 'primary', close: false, fn: () => {
          const name = ($('#np-name').value || '').trim() || `Player ${this.profiles().length + 1}`;
          const p = { id: Math.random().toString(36).slice(2, 8), name, avatar: pick };
          this.setProfiles([...this.profiles(), p]);
          this.usePlayer(p.id);
        } }], { locked: !this.pid });
    this.el.modal.querySelector('.avatars').onclick = e => {
      const b = e.target.closest('[data-av]'); if (!b) return;
      pick = b.dataset.av;
      for (const x of this.el.modal.querySelectorAll('.av-pick')) x.classList.toggle('on', x === b);
    };
    setTimeout(() => $('#np-name')?.focus(), 50);
  }

  autosave() {
    if (this.noSave || this.g.phase !== 'build') return;
    clearTimeout(this._saveT);
    this._saveT = setTimeout(() => {
      if (this.g.phase !== 'build') return;
      if (!this.pid) return;
      this.storeSet(this.saveKey(), { ...this.g.serialize(), lessonDone: [...this.lessonDone] });
      this.storeSet(this.pk('lastMap'), this.g.map.id);
    }, 400);
  }

  clearSave() {
    if (this.noSave) return;
    clearTimeout(this._saveT);
    try { localStorage.removeItem(this.saveKey()); } catch { /* ignore */ }
  }

  progress() { return this.storeGet(this.pk('progress')) || { won: {} }; }

  // stars: ★ cleared · ★ core at 15/20 or better (5 or fewer hits) · ★ the map's code goal.
  // Each star is earned once; a replay can only add the missing ones.
  starsFor() {
    const g = this.g, goal = g.map.goal;
    return [true, g.core >= g.coreMax - 5, !!(goal && goal.check(g))];
  }
  recordWin() {
    const now = this.starsFor();
    const p = this.progress(), prev = p.won[this.g.map.id];
    const had = prev?.stars || [!!prev, false, false];
    const stars = now.map((s, i) => s || had[i]);
    this.lastStars = { now, had, stars };
    if (this.noSave) return;
    p.won[this.g.map.id] = { core: Math.max(this.g.core, prev?.core || 0), max: this.g.coreMax, stars, at: Date.now() };
    this.storeSet(this.pk('progress'), p);
  }
  // end screen: the three stars of this map, which ones are new this time
  starsHtml() {
    const s = this.lastStars; if (!s) return '';
    const names = ['Cleared the map', `Core at ${this.g.coreMax - 5}/${this.g.coreMax} or better`, this.g.map.goal ? this.g.map.goal.text : 'Code goal'];
    const newOnes = s.now.filter((x, i) => x && !s.had[i]).length;
    return `<div class="star-list">${names.map((n, i) => `<div class="${s.stars[i] ? 'got' : ''}"><span>${s.stars[i] ? '★' : '☆'}</span> ${n}${s.now[i] && !s.had[i] ? ' <b class="new">new!</b>' : ''}</div>`).join('')}</div>
      ${newOnes ? `<p class="good">+${newOnes} star${newOnes === 1 ? '' : 's'} for the <b>Lab</b> (campaign screen).</p>` : ''}`;
  }
  starCount(id) { const w = this.progress().won[id]; return w ? (w.stars || [true, false, false]).filter(Boolean).length : 0; }
  starsEarned() { return MAPS.reduce((a, m) => a + this.starCount(m.id), 0); }

  // ---- the Lab: spend stars on small permanent boosts (per player) ------------------------
  labLevels() { return this.storeGet(this.pk('lab')) || {}; }
  starsSpent(levels = this.labLevels()) { return LAB.reduce((a, b) => a + (levels[b.id] || 0) * b.cost, 0); }
  applyBoost() { this.g.boost = this.forceBoost ?? labBoost(this.labLevels()); }   // forceBoost: set by the balance bots

  labModal() {
    const lv = this.labLevels(), free = this.starsEarned() - this.starsSpent(lv);
    const rows = LAB.map(b => {
      const n = lv[b.id] || 0, max = n >= b.levels, can = !max && free >= b.cost;
      return `<div class="lab-row"><span class="lab-ic">${b.icon}</span>
        <div class="lab-info"><b>${b.name}</b> <span class="lab-pips">${'●'.repeat(n)}${'○'.repeat(b.levels - n)}</span><small>${b.desc} <i>${b.per} per level.</i></small></div>
        <button class="${can ? 'primary' : 'ghost'}" data-buy="${b.id}" ${can ? '' : 'disabled'}>${max ? 'Max' : `★ ${b.cost}`}</button></div>`;
    }).join('');
    this.modal(`<h2>Lab</h2>
      <p class="muted">Spend stars on small permanent boosts for every map. <b>${free} ★ free</b> of ${this.starsEarned()} earned. Boosts apply when a map starts (or restarts). Every map can be won without them.</p>
      <div class="lab">${rows}</div>`,
      [{ label: 'Reset (get stars back)', cls: 'ghost', close: false, fn: () => { if (confirm('Take back all Lab boosts and get your stars back?')) { this.storeSet(this.pk('lab'), {}); this.labModal(); } } },
        { label: 'Back to campaign', cls: 'primary', fn: () => this.campaignModal() }]);
    this.el.modal.querySelector('.lab').onclick = e => {
      const b = e.target.closest('[data-buy]'); if (!b || b.disabled) return;
      const L = this.labLevels(); L[b.dataset.buy] = (L[b.dataset.buy] || 0) + 1;
      this.storeSet(this.pk('lab'), L);
      this.sfx('upload');
      this.labModal();
    };
  }

  startMap(id, fromSave) {
    this.el.modal.hidden = true;
    const save = fromSave ? this.storeGet(this.saveKey(id)) : null;
    if (!fromSave) { try { localStorage.removeItem(this.saveKey(id)); } catch { /* ignore */ } }
    this.applyBoost();   // the player's Lab boosts for this map
    this.g.setMap(id);
    if (save && this.g.load(save)) {
      this.lessonDone = new Set(save.lessonDone || []);
      this.toast(`Welcome back! ${this.g.map.name}, wave ${this.g.wave + 1}.`, 'good');
    } else if (this.g.map.library) {
      // your own functions from earlier maps come along, up to your Library capacity (Lab)
      const mine = Object.entries(this.storeGet(this.pk('myFunctions')) || {});
      const cap = this.g.boost?.library ?? 1;
      const take = list => {
        if (!list.length) return;
        this.g.library.code = this.libraryWithMine(list); this.g.syncLibrary();
        this.toast(`In your Library (📚): ${list.map(([n]) => n).join(', ')}`, 'good');
      };
      if (mine.length <= cap) take(mine);
      else setTimeout(() => this.pickFunctionsModal(mine, cap, take), 400);
    }
    this.renderGuide();
    this.storeSet(this.pk('lastMap'), id);
    // phone: show the current lesson as a card when a map starts or continues (like after each wave)
    if (document.body.classList.contains('phone')) setTimeout(() => this.flashGuide(), 300);
  }

  campaignModal() {
    const prog = this.progress();
    const cards = MAPS.map((m, i) => {
      const save = this.storeGet(this.saveKey(m.id));
      const won = prog.won[m.id];
      const unlocked = i === 0 || prog.won[MAPS[i - 1].id];
      const st = won ? (won.stars || [true, false, false]) : [false, false, false];
      const starHtml = `<span class="stars" title="★ cleared · ★ core 15/20+ · ★ ${m.goal ? m.goal.text.replace(/<[^>]+>/g, "") : "code goal"}">${st.map(s => (s ? "★" : "☆")).join("")}</span>`;
      const status = won ? `<span class="good">✓ Cleared · core ${won.core}/${won.max}</span> ${starHtml}`
        : save ? `<span class="warn">In progress · wave ${save.wave + 1}/${m.waves.length}</span>`
        : unlocked ? '<span class="muted">Not started</span>' : `<span class="muted">🔒 Clear ${MAPS[i - 1].name} first</span>`;
      return `<div class="map-card ${unlocked ? '' : 'locked'}">
        <div class="map-num">${m.label || m.num}</div>
        <div class="map-info"><b>${m.name}</b><small>${m.desc}</small><small>${m.waves.length} waves · ${status}</small></div>
        <div class="map-acts">
          ${save ? `<button class="primary" data-map="${m.id}" data-save="1">Continue</button>` : ''}
          <button class="${save ? 'ghost' : unlocked ? 'primary' : 'ghost'}" data-map="${m.id}">${save ? 'Restart' : unlocked ? 'Play' : 'Play anyway'}</button>
          ${won ? `<button class="ghost endless-btn" data-map="endless:${m.id}" title="Endless mode: waves keep getting harder. Score = waves survived.">∞ Endless${this.endlessBest(m.id) ? ` · best ${this.endlessBest(m.id)}` : ''}</button>` : ''}
        </div></div>`;
    }).join('');
    const me = this.currentProfile();
    this.modal(`<h2>Campaign</h2><p class="muted">${me ? `Playing as ${me.avatar} <b>${esc(me.name)}</b> · ` : ""}Each map teaches new code. Progress is saved on this device between waves. Cleared maps can also be played in <b>∞ Endless</b> mode.</p><p class="lab-line">⭐ <b>${this.starsEarned()}</b> stars earned · <b>${this.starsEarned() - this.starsSpent()}</b> free to spend in the <b>Lab</b>.</p><div class="maps">${cards}</div>`,
      [{ label: '🧪 Lab', fn: () => this.labModal() }, { label: 'Switch player', fn: () => this.playersModal() }, { label: 'Close', fn: () => {} }]);
    this.el.modal.querySelector('.maps').onclick = e => {
      const b = e.target.closest('button[data-map]'); if (!b) return;
      this.startMap(b.dataset.map, !!b.dataset.save);
    };
  }

  // first screen: continue straight away if there is a save, otherwise start map 1
  // first screen: pick (or create) a player, then continue their game
  boot() {
    this.migrateProfiles();
    const list = this.profiles();
    try { this.pid = localStorage.getItem('cd.profile'); } catch { this.pid = null; }
    if (!list.some(p => p.id === this.pid)) this.pid = null;
    this.updatePlayerBadge();
    if (!list.length) this.newPlayerModal();
    else this.playersModal();
  }

  bootStatus(text) { const s = $('#boot span'); if (s) s.innerHTML = `${text}<br><small class="muted">version ${window.CD_VERSION || '?'}</small>`; }
  bootDone() {
    this.el.boot.classList.add('done');
    setTimeout(() => this.el.boot.remove(), 600);
    this.toast(`Python ${this.py.version} ready`, 'good');
    this.renderInfo();
  }
  bootFailed(err) {
    console.error(err);
    this.el.boot.classList.add('failed');
    $('#boot span').innerHTML = `Couldn't start Python: ${esc(err.message || err)}<br><small>Check your internet connection and reload.</small>`;
  }

  bindKeys() {
    window.addEventListener('keydown', e => {
      const inField = e.target.closest?.('.CodeMirror, input, textarea, select');
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'Enter')) {
        if (this.editorFor) { e.preventDefault(); this.upload(); }
        return;
      }
      if (e.key === 'Escape') {
        if (!this.el.modal.hidden) { if (!this.el.modal.dataset.locked) this.el.modal.hidden = true; return; }
        if (inField || this.editorFor) { this.closeEditor(); return; }
        if (this.wireFrom) this.wireFrom = null;
        else if (this.tool !== 'select') this.setTool('select');
        else this.select(null);
        return;
      }
      if (inField || !this.el.modal.hidden) return;
      const t = TOOLS.find(x => x.key === e.key);
      if (t) { this.setTool(t.id); return; }
      if (e.key === ' ') { e.preventDefault(); this.g.startWave(); }
      if (e.key === 'p') { if (this.planPaused) this.editRun = true; else this.userPaused = !this.userPaused; }
      if (e.key === 'm') this.toggleMute();
      if (e.key === 'v') { this.setPathFlow(!this.showPathFlow); this.toast(`Enemy path indicator ${this.showPathFlow ? 'on' : 'off'}`, 'info'); }
      if (e.key === 'l' && this.g.map.library) this.openEditor('lib');
      if (e.key === 'r') {
        const sel = this.selected && this.g.ents.get(this.selected);
        this.reroute(this.selWire ? this.g.wires.get(this.selWire) : sel?.input && this.g.wires.get(sel.input));
        this.renderInfo();
      }
    });
  }

  frame(dt) {
    this.updateHud();
    this.liveT += dt; this.checkT += dt;
    if (this.liveT > 0.2) { this.liveT = 0; this.liveInfo(); this.updateEditorLive(); this.refreshToolbar(); this.applyFocus(); }
    if (this.checkT > 0.7) { this.checkT = 0; this.checkLesson(); }
  }
}
