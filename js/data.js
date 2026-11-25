// ---------------------------------------------------------------------------
// Static game data: map, power constants, turrets, enemies, waves, lessons.
// ---------------------------------------------------------------------------

export const COLS = 18;
export const ROWS = 11;

// Enemy path (tile-centre coordinates). Axis-aligned segments only.
export const PATH = [
  [-0.6, 2.5], [4.5, 2.5], [4.5, 7.5], [8.5, 7.5],
  [8.5, 3.5], [12.5, 3.5], [12.5, 8.5], [15.6, 8.5],
];
export const CORE = { c: 15, r: 7, w: 3, h: 3 };

export const START = { credits: 120, core: 20 };
export const CODE_HZ = 10;           // turret programs run 10x per second
export const SELL_REFUND = 0.6;
export const WIRE_COST_PER_TILE = 1;   // credits per tile of wire length (min 1)

// Real-ish electrical model: P = V x I, energy in joules (J = W x s).
export const POWER = {
  volt: 12,            // all rails are 12 V
  psuW: 100,           // PSU max output (~8.3 A @ 12 V)
  wireA: 5,            // each wire carries max 5 A  -> 60 W
  socketCap: 100,      // capacitor in each socket (J)
  socketChargeW: 30,   // max charge rate of a socket (W)
  socketCpu: 150,      // code lines per tick
  idleW: 1,            // socket electronics
  radarK: 0.3,         // radar W = 0.3 x range^2
  motorK: 0.04,        // motor W while turning = 0.04 x speed(deg/s)
  cpuJPerOp: 0.002,    // each executed line of code costs 2 mJ
  shotJPerDmg: 1.5,    // cannon shot J = 1.5 x damage
  laserDpsPerW: 0.8,   // laser damage/s = 0.8 x watts
  pulseBase: 2,        // pulse J = strength x (2 + 0.5 x range^2)
  pulseRangeK: 0.5,
  brownoutResume: 0.25 // turret restarts at 25% charge
};

// [min, max, default] for every module setting
export const LIMITS = {
  range: [1, 6, 3],
  speed: [30, 720, 180],
  damage: [1, 60, 10],
  power: [1, 80, 20],
  strength: [1, 40, 8],
};

export const BUILDINGS = {
  socket:   { name: 'Socket',   cost: 40, desc: 'Tower base: 12 V, 100 J capacitor, 150 lines/tick CPU. Can pass power on to 1 more part.' },
  splitter: { name: 'Splitter', cost: 15, desc: 'Splits one power line into up to 3.' },
  psu:      { name: 'PSU',      cost: 80, desc: 'Generator: 12 V, 100 W max, 4 outputs.' },
};
// power outputs per part. A socket has 1 "power out" so sockets can be chained;
// everything further down a chain shares the wire feeding it (5 A = 60 W).
export const PORTS = { psu: 4, splitter: 3, socket: 1 };

export const TURRETS = {
  cannon: {
    name: 'Cannon', cost: 60, unlock: 1, reload: 0.7, shellSpeed: 18,
    modules: ['radar', 'motor', 'cannon', 'power', 'meter'], color: '#5ee1ff',
    desc: 'Fires shells in the direction it faces. Needs aiming.',
  },
  pulse: {
    name: 'Pulse', cost: 80, unlock: 5, reload: 1.4,
    modules: ['radar', 'pulse', 'power', 'meter'], color: '#ffcf4a',
    desc: 'Shockwave that hits every enemy in radar range.',
  },
  laser: {
    name: 'Laser', cost: 100, unlock: 8,
    modules: ['radar', 'motor', 'laser', 'power', 'meter'], color: '#ff5ea8',
    desc: 'Continuous beam. Ignores armor, drains watts while firing.',
  },
};

export const ENEMIES = {
  bug:     { name: 'Bug',     hp: 30,  speed: 1.1,  radius: 0.27, reward: 4,   dmg: 1,  armor: 0, color: '#ff4d6d', desc: 'Basic crawler.' },
  worm:    { name: 'Worm',    hp: 20,  speed: 2.1,  radius: 0.24, reward: 4,   dmg: 1,  armor: 0, color: '#7dff6a', desc: 'Fast. Slow turrets struggle to track it.' },
  mite:    { name: 'Mite',    hp: 7,   speed: 1.5,  radius: 0.15, reward: 1,   dmg: 1,  armor: 0, color: '#ffd23f', desc: 'Tiny. Comes in swarms.' },
  beetle:  { name: 'Beetle',  hp: 90,  speed: 0.8,  radius: 0.34, reward: 10,  dmg: 2,  armor: 6, color: '#7fa6cf', desc: 'Armor 6: every hit does 6 less damage.' },
  forkbomb: { name: 'Forkbomb', hp: 55, speed: 0.95, radius: 0.3, reward: 5, dmg: 2, armor: 0, splits: { type: 'mite', n: 3 }, color: '#ff8a3d', desc: 'Splits into 3 mites when destroyed.' },
  rootkit: { name: 'Rootkit', hp: 1400, speed: 0.45, radius: 0.5,  reward: 100, dmg: 10, armor: 3, shield: 300, shieldRegen: 20, boss: true, color: '#b15cff', desc: 'Boss. Shield regenerates after 2 s without damage.' },
};

// Each wave = groups spawned one after another.
export const WAVES = [
  // 1 · calling a function: a few slow bugs for one cannon
  [{ t: 'bug', n: 6, gap: 1.5 }],
  // 2 · wires + 2nd cannon: more bugs than one cannon handles
  [{ t: 'bug', n: 10, gap: 1.0 }, { t: 'worm', n: 3, gap: 1.2, delay: 2 }],
  // 3 · if aimed: fast worms punish wasted shots
  [{ t: 'worm', n: 10, gap: 0.7 }, { t: 'bug', n: 8, gap: 1.0, delay: 1 }],
  // 4 · energy in/out: a long steady stream, so capacitors are under constant load
  [{ t: 'bug', n: 12, gap: 0.8 }, { t: 'worm', n: 6, gap: 0.7, delay: 1.5 }],
  // 5 · damage setting: armored beetles
  [{ t: 'bug', n: 8, gap: 0.9 }, { t: 'beetle', n: 4, gap: 2.6, delay: 1 }],
  // 6 · second PSU: a big mixed wave that needs more towers (and so more power)
  [{ t: 'bug', n: 14, gap: 0.6 }, { t: 'beetle', n: 5, gap: 2.2, delay: 1 }, { t: 'worm', n: 10, gap: 0.5, delay: 1 }],
  // 7 · pulse + for loops: mite swarms
  [{ t: 'mite', n: 14, gap: 0.25 }, { t: 'bug', n: 6, gap: 1, delay: 2 }, { t: 'mite', n: 14, gap: 0.25, delay: 2 }, { t: 'mite', n: 16, gap: 0.2, delay: 2 }],
  // 8 · targeting: beetles hidden among fast worms and mites
  [{ t: 'worm', n: 16, gap: 0.5 }, { t: 'beetle', n: 6, gap: 2.0, delay: 1 }, { t: 'mite', n: 20, gap: 0.18, delay: 1 }],
  // 9 · laser + saving energy: heavy armor
  [{ t: 'beetle', n: 8, gap: 1.7 }, { t: 'mite', n: 24, gap: 0.18, delay: 1 }, { t: 'bug', n: 16, gap: 0.5, delay: 1 }, { t: 'worm', n: 10, gap: 0.4, delay: 1 }],
  // 10 · memory + prediction: lots of fast worms
  [{ t: 'mite', n: 30, gap: 0.14 }, { t: 'beetle', n: 12, gap: 1.1, delay: 1 }, { t: 'worm', n: 22, gap: 0.35, delay: 1 }, { t: 'bug', n: 20, gap: 0.35, delay: 1 }],
  // 11 · boss
  [{ t: 'bug', n: 15, gap: 0.48 }, { t: 'rootkit', n: 1, gap: 1, delay: 2 }, { t: 'beetle', n: 12, gap: 1.1, delay: 3 }, { t: 'mite', n: 42, gap: 0.125, delay: 2 }, { t: 'worm', n: 22, gap: 0.32, delay: 1 }],
];
export const WAVE_HP_GROWTH = 0.14;   // +14% hp per wave (bosses excluded)
export const WAVE_BONUS = (w) => 30 + 5 * w;   // +5 vs before wires cost credits

// ---------------------------------------------------------------------------
// Program templates
// ---------------------------------------------------------------------------
export const STARTER_CANNON = `import radar, motor, cannon

def setup():
    # Runs once when you press Upload.
    # Bigger numbers = stronger turret, but more power used!
    radar.range = 3      # tiles (1 to 6). Power: 0.3 x range² W, always on
    motor.speed = 180    # degrees per second (30 to 720). Power: 0.04 x speed W while turning
    cannon.damage = 10   # damage per shot. Power: damage x 1.5 J per shot

def update():
    # Runs 10 times every second.
    enemies = radar.scan()   # enemies in range, [0] = nearest the core
    if len(enemies) == 0:
        return               # nothing in range, do nothing
    target = enemies[0]
    motor.aim(target)        # start turning toward the target
    # TODO (Lesson 1): fire the cannon!
`;

export const TEMPLATES = {
  cannon: `import radar, motor, cannon

def setup():
    radar.range = 3      # power: 0.3 x range² W, always on
    motor.speed = 180    # power: 0.04 x speed W while turning
    cannon.damage = 10   # power: damage x 1.5 J per shot

def update():
    enemies = radar.scan()
    if len(enemies) == 0:
        return
    target = enemies[0]
    motor.aim(target)
    if motor.aimed(target):
        cannon.fire()
`,
  pulse: `import radar, pulse

def setup():
    radar.range = 2       # the pulse hits EVERY enemy inside this radius. Radar: 0.3 x range² W
    pulse.strength = 8    # damage to each enemy
    # energy per pulse = strength x (2 + 0.5 x range^2)

def update():
    enemies = radar.scan()
    # TODO (Lesson 7): only fire when 3 or more enemies are in range
    if len(enemies) > 0:
        pulse.fire()
`,
  laser: `import radar, motor, laser

def setup():
    radar.range = 3.5     # power: 0.3 x range² W, always on
    motor.speed = 240     # power: 0.04 x speed W while turning
    laser.power = 20      # watts while firing, damage/s = power x 0.8

def update():
    enemies = radar.scan()
    if not enemies:
        laser.stop()
        return
    target = enemies[0]
    motor.aim(target)
    if motor.aimed(target):
        laser.fire(target)    # must be called every tick to keep the beam on
    else:
        laser.stop()
`,
};

// ---------------------------------------------------------------------------
// Lessons: shown in the guide panel before wave N (index = wave - 1)
// ---------------------------------------------------------------------------
const turretsOf = (g, type) => g.sockets().filter(s => s.turret && (!type || s.turret.type === type)).map(s => s.turret);
const anyCode = (g, re, type) => turretsOf(g, type).some(t => t.compiled && re.test(t.code));

// ---- what a task highlights (task.focus(g) → {ents, tools, info, code, dom}) ----
//   ents: board part ids to ring · tools: toolbar buttons · info: rows of the info card (data-live keys)
//   code: regex of code lines to mark in the editor · dom: other page elements (CSS selectors)
const turretSocks = (g, type, pred = () => true) => g.sockets().filter(s => s.turret && (!type || s.turret.type === type) && pred(s.turret)).map(s => s.id);
// step-by-step help for "build a turret of this type": socket → wire → turret
function buildFocus(g, type) {
  const empty = g.sockets().filter(s => !s.turret);
  const powered = empty.find(s => s.input);
  if (powered) return { tools: [type], ents: [powered.id] };
  const unpowered = empty[0];
  if (unpowered) {
    const src = g.psus().filter(p => p.outputs.length < 4)
      .sort((a, b) => Math.hypot(a.x - unpowered.x, a.y - unpowered.y) - Math.hypot(b.x - unpowered.x, b.y - unpowered.y))[0];
    return { tools: ['wire'], ents: [unpowered.id, ...(src ? [src.id] : [])] };
  }
  return { tools: ['socket'], ents: [] };
}

// Each lesson can have several tasks; each task has its own check(game).
export const LESSONS = [
  {
    title: 'Calling a function',
    body: `Bugs are crawling along the bus toward your <b>CPU core</b>. Your cannon already <b>finds</b> them (<code>radar.scan()</code>) and <b>turns</b> toward them (<code>motor.aim(target)</code>), but it never shoots.
      <p>To make something happen, you <b>call a function</b>: write its name followed by brackets. <code>cannon.fire()</code> tells the cannon module to shoot.</p>`,
    tasks: [
      {
        text: 'Open the cannon\'s code: double-click it (on a phone: tap it, then <b>Code</b>). On the empty line under the yellow <code># TODO</code>, type <code>cannon.fire()</code>. Press <b>Upload</b> (or Ctrl+S), then <b>Start wave</b>.',
        check: g => anyCode(g, /cannon\.fire\(/, 'cannon'),
        focus: g => ({ ents: turretSocks(g, 'cannon'), code: /# TODO/, dom: ['#ed-upload'] }),
      },
    ],
    hint: 'The new line needs 4 spaces in front of it, the same as motor.aim(target). That tells Python it belongs inside update().',
    solution: `    target = enemies[0]
    motor.aim(target)
    cannon.fire()`,
  },
  {
    title: 'Wires and power',
    body: `Wave 1 is done, and more bugs are on the way. Time for a <b>second cannon</b>.
      <p>A turret needs two things: a <b>socket</b> to stand on, and <b>power</b> from a PSU, carried by a <b>wire</b>. The highlighted buttons and parts show you the next step.</p>
      <p><b>How the power works</b> (like real circuits): <b>power (W) = voltage (V) × current (A)</b>.</p>
      <ul><li>A <b>PSU</b> gives 12 V and up to <b>100 W</b>, with 4 outputs.</li>
      <li>A <b>wire</b> costs 1 credit per tile and carries at most <b>5 A</b>. At 12 V that is 60 W.</li>
      <li>Each <b>socket</b> stores <b>100 J</b> and refills at up to 30 W. Shooting, turning and even running code use it up.</li>
      <li>If a socket runs empty you get a <b>brownout</b>: the turret stops until it is back to 25%.</li>
      <li>A socket can pass power on to one more part. Build on top of a wire and the new part joins it. Everything after a wire shares its 60 W.</li></ul>`,
    tasks: [
      {
        text: 'Build a second cannon: <b>Socket</b> on an empty tile near the path, then <b>Wire</b> from the PSU to that socket, then <b>Cannon</b> on the socket. It starts with a copy of your cannon program.',
        check: g => turretsOf(g, 'cannon').length >= 2,
        focus: g => buildFocus(g, 'cannon'),
      },
      {
        text: 'Tap the <b>PSU</b> and look at <b>Output</b> and <b>Demand</b>: how many watts your cannons use right now.',
        check: g => !!g.flags.psuViewed,
        focus: g => ({ ents: g.psus().map(p => p.id), info: ['psuload', 'psudemand'] }),
      },
    ],
    hint: 'Wire colour shows the load: green is light, red means the wire is near its 5 A limit. Before you connect, the Wire tool shows the price of the wire. If a wire takes an odd route, tap it and press Route.',
    solution: 'No code this time. Place the socket where its range circle covers a lot of path, like the inside of a bend, and close to the PSU so the wire is short.',
  },
  {
    title: 'Making decisions with if',
    body: `Your cannons call <code>cannon.fire()</code> on <b>every</b> tick, even while the barrel is still turning. Many shells miss, and every shot costs energy (<code>damage × 1.5</code> joules).
      <p>Now let's make firing a <b>response to a condition</b>: "<i>if</i> the barrel points at the target, <i>then</i> fire".</p>
      <p><b>How an if looks in Python:</b></p>
      <pre>if <i>condition</i>:
    <i>action</i></pre>
      <ul><li>The line starts with <code>if</code>, then the condition, then a colon <code>:</code></li>
      <li>The action goes on the next line, pushed <b>4 spaces further right</b> than the <code>if</code>. Only indented lines belong to the if.</li>
      <li>If the condition is <code>True</code>, the action runs. If it is <code>False</code>, Python skips it.</li></ul>
      <p><b>Example</b> (not your answer):</p>
      <pre>if len(enemies) > 3:
    print("Big group!")</pre>
      <p>Here the condition is <code>len(enemies) > 3</code> and the action is the <code>print</code> line. You already have another one in your code: <code>if len(enemies) == 0:</code> with <code>return</code> under it.</p>
      <p>For your cannon, the <b>motor</b> module can tell you if the barrel points at the target: <code>motor.aimed(target)</code> gives back <code>True</code> or <code>False</code>. Look up <b>motor</b> in the Module reference below.</p>`,
    tasks: [
      {
        text: 'Make a cannon fire <b>only when</b> <code>motor.aimed(target)</code> is True. Press <b>Upload</b>. Each cannon has its own copy of the code, so do it on every cannon.',
        check: g => anyCode(g, /if\s+motor\.aimed\(\s*target\s*\)\s*:\s*\n\s+cannon\.fire\(/, 'cannon'),
        focus: g => ({ ents: turretSocks(g, 'cannon', t => !/if\s+motor\.aimed\(/.test(t.code)), code: /cannon\.fire\(/, dom: ['#ed-upload'] }),
      },
      {
        text: 'Have 3 turrets running. Fast <b>worms</b> are coming this wave.',
        check: g => turretsOf(g).filter(t => t.compiled).length >= 3,
        focus: g => buildFocus(g, 'cannon'),
      },
    ],
    hint: 'The if goes right above cannon.fire(). The if line ends with a colon : and cannon.fire() then needs 4 extra spaces so it sits inside the if. Change one cannon, then use "Copy from…" in the other cannons to reuse it.',
    solution: `    motor.aim(target)
    if motor.aimed(target):
        cannon.fire()`,
  },
  {
    title: 'Energy: joules in and out',
    body: `Everything a turret does uses energy from its socket's capacitor. Energy is counted in <b>joules (J)</b>, and <b>1 watt = 1 joule every second</b>.
      <ul><li><b>In:</b> the socket refills at up to <b>30 W</b> (30 J every second), if its wire and PSU can deliver that.</li>
      <li><b>Out:</b> each shot costs <code>damage × 1.5</code> J. Damage 10 = 15 J per shot. A cannon that fires every 0.7 s uses about 21 J every second, so 21 W.</li>
      <li>The radar uses <code>0.3 × range²</code> W all the time, the motor <code>0.04 × speed</code> W while turning, and every line of code 2 mJ.</li></ul>
      <p>If more joules go out than come in, the capacitor empties and the turret runs low (⚡) or browns out.</p>
      <p><b>New module: meter.</b> Add <code>meter</code> to the import line and the tower shows a small badge: <b style="color:#3dff9a">▲</b> gaining, <b style="color:#ffc94a">=</b> about even, <b style="color:#ff5b5b">▼</b> using more than it gets, and next to it a <b>worst-case</b> bar: green if the turret could fire nonstop on the power it gets, yellow if close, red if it would drain. The meter itself uses no power.</p>`,
    tasks: [
      {
        text: 'Add <code>meter</code> to the import line of a cannon and upload. Watch its badge during the wave.',
        check: g => anyCode(g, /^\s*import[^\n#]*\bmeter\b/m),
        focus: g => ({ ents: turretSocks(g, 'cannon'), code: /^import /, dom: ['#ed-upload'] }),
      },
      {
        text: 'Open a cannon\'s <b>Power</b> tab and see how many watts each part of it uses.',
        check: g => !!g.flags.powerTabViewed,
        focus: g => ({ ents: turretSocks(g, 'cannon'), dom: ['#editor .tabs button[data-tab="power"]'] }),
      },
    ],
    hint: 'The import line is the first line: import radar, motor, cannon, meter. Your code can also read meter.net (watts) and meter.trend.',
    solution: 'import radar, motor, cannon, meter',
  },
  {
    title: 'Variables and settings',
    body: `<b>Beetles</b> are coming. Their <b>armor 6</b> removes 6 damage from every hit, so a 10-damage shell only does 4!
      <p>In <code>setup()</code>, the line <code>cannon.damage = 10</code> stores a number in a setting. Change the number and you change the turret. But stronger shots cost more energy: a 20-damage shot needs 30 J.</p>
      <p>The other settings cost power too: the radar uses <code>0.3 × range²</code> W all the time (range 3 = 2.7 W, range 6 = 10.8 W), and the motor uses <code>0.04 × speed</code> W while it turns.</p>
      <p>The <b>Power</b> tab in the editor shows how your settings change the energy use, and your <b>meter</b> badge shows it live: if it turns red ▼, the damage is too high for the power you have.</p>`,
    tasks: [
      {
        text: 'Raise <code>cannon.damage</code> to 15 or more on at least one cannon, then upload.',
        check: g => turretsOf(g, 'cannon').some(t => t.compiled && t.cfg.damage >= 15),
        focus: g => ({ ents: turretSocks(g, 'cannon'), code: /cannon\.damage\s*=/, dom: ['#editor .tabs button[data-tab="power"]', '#ed-upload'] }),
      },
    ],
    hint: 'Too much damage drains the socket faster than it refills, and a yellow ⚡ appears on the turret. Somewhere around 18–25 works well.',
    solution: `def setup():
    radar.range = 3
    motor.speed = 180
    cannon.damage = 20`,
  },
  {
    title: 'More power: a second PSU',
    body: `Stronger shots use more energy, and your <b>PSU</b> only has <b>100 W</b>. Look at its frame on the board:
      <ul><li><b>green</b>: fine</li>
      <li><b>yellow</b>: its sockets could use 75–100% of its power</li>
      <li><b>red</b>: if all its sockets charge at once they need more than 100 W. Then it is <b>overloaded</b>: everyone gets a smaller share, capacitors drain and turrets run low (⚡).</li></ul>
      <p>Each socket can pull up to 30 W while it charges, so one PSU comfortably runs about <b>3 turrets</b>.</p>
      <p><b>The fix:</b> build another PSU (80 credits), close to your towers so the wires are short. Then move a socket over to it: tap the socket, press <b>Unplug</b>, pick <b>Wire</b> and connect it from the new PSU. New towers can go straight onto the new PSU.</p>
      <p>Tap a PSU to see its <b>Peak</b>: what it would need if everything charged at the same time.</p>`,
    tasks: [
      {
        text: 'Build a second <b>PSU</b> and connect at least one socket to it with a <b>Wire</b>.',
        check: g => g.psus().filter(p => p.outputs.length).length >= 2,
        focus: g => {
          const spare = g.psus().find(p => !p.outputs.length);
          if (!spare) return g.psus().length < 2 ? { tools: ['psu'], ents: [] } : { tools: ['psu'] };
          return { tools: ['wire'], ents: [spare.id, ...g.sockets().filter(s => s.turret).map(s => s.id)] };
        },
      },
      {
        text: 'Get every PSU out of the red: no PSU should need more than 100 W at peak (tap it and check <b>Peak</b>).',
        check: g => { g.updatePeaks(); return g.psus().length >= 2 && g.psus().every(p => (p.peakW || 0) <= p.maxW + 0.01); },
        focus: g => { g.updatePeaks(); return { ents: g.psus().filter(p => (p.peakW || 0) > p.maxW).map(p => p.id), info: ['psupeak'] }; },
      },
    ],
    hint: 'Unplug cuts a socket from its wire (you get some of the wire\'s cost back). The socket then needs a new wire from the other PSU. Sockets that are chained share one wire, so moving the first one of a chain moves the whole chain.',
    solution: 'No code this time. One PSU per 3 turrets keeps every frame green or yellow.',
  },
  {
    title: 'Lists and for loops',
    body: `Swarms of tiny <b>mites</b> are coming. <b>New: Pulse turret!</b> Its shockwave hits <i>every</i> enemy in range at once, but each pulse is expensive, so only fire it when it hits several.
      <p><code>radar.scan()</code> gives you a <b>list</b> of enemies. A <b>for loop</b> runs the indented lines once for every item in a list.</p>
      <p><b>Example</b> (not your answer):</p>
      <pre>for e in enemies:
    print(e.kind, e.hp)</pre>
      <p>Each time round, <code>e</code> is the next enemy in the list. Lines after the loop that are <b>not</b> indented run once, when the loop is finished.</p>`,
    tasks: [
      {
        text: 'Build a <b>Pulse</b> turret (on a socket, like the cannon).',
        check: g => turretsOf(g, 'pulse').length > 0,
        focus: g => buildFocus(g, 'pulse'),
      },
      {
        text: 'In its code, use a <code>for</code> loop to count the enemies, and only call <code>pulse.fire()</code> when there are 3 or more.',
        check: g => anyCode(g, /\bfor\b.+\bin\b/, 'pulse'),
        focus: g => ({ ents: turretSocks(g, 'pulse'), code: /TODO|pulse\.fire\(/, dom: ['#ed-upload'] }),
      },
    ],
    hint: 'Start with count = 0. Inside the loop add 1. After the loop (not indented under for), check if count >= 3.',
    solution: `def update():
    enemies = radar.scan()
    count = 0
    for e in enemies:
        count = count + 1
    if count >= 3:
        pulse.fire()`,
  },
  {
    title: 'Choosing a target',
    body: `<code>enemies[0]</code> is the enemy nearest your core. Sometimes a different choice is smarter:
      <ul><li><code>radar.weakest(enemies)</code>, <code>radar.strongest(enemies)</code> or <code>radar.closest(enemies)</code></li>
      <li>your own rule, e.g. <code>min(enemies, key=lambda e: e.hp)</code></li>
      <li>look at the type: <code>if e.kind == "beetle":</code></li></ul>
      Every enemy has these values: <code>kind, hp, max_hp, armor, shield, speed, distance, progress, x, y, vx, vy</code>.`,
    tasks: [
      {
        text: 'Change how at least one turret chooses its target.',
        check: g => anyCode(g, /weakest\(|strongest\(|closest\(|\bmin\(|\bmax\(|\.kind|\.hp|\.armor/),
        focus: g => ({ ents: turretSocks(g), code: /enemies\[0\]/ }),
      },
    ],
    hint: 'Good idea: let your strongest cannon go after beetles first. Loop over the enemies and pick the first one whose kind is "beetle".',
    solution: `    target = enemies[0]
    for e in enemies:
        if e.kind == "beetle":
            target = e
            break`,
  },
  {
    title: 'Laser and saving energy',
    body: `<b>New: Laser turret!</b> The beam <b>ignores armor</b>. While it is on it uses <code>laser.power</code> watts every second, and does <code>power × 0.8</code> damage per second.
      <p>Call <code>laser.fire(target)</code> every tick to keep the beam on. It only does damage when the turret is aimed at the target. Otherwise you are burning energy into thin air.</p>
      <p><b>Saving energy:</b> big waves empty your sockets. Add <code>power</code> to the import line and your code can read <code>power.percent</code> (0–100) and <code>power.energy</code> (joules), for example to stop shooting small bugs when energy is low. Even your code costs energy: every line that runs uses 2 mJ.</p>`,
    tasks: [
      {
        text: 'Build a <b>Laser</b> turret.',
        check: g => turretsOf(g, 'laser').length > 0,
        focus: g => buildFocus(g, 'laser'),
      },
      {
        text: 'Use <code>power.percent</code> or <code>power.energy</code> in one turret, for example to save energy for beetles when the capacitor is low.',
        check: g => anyCode(g, /power\.(percent|energy|capacity)/),
        focus: g => ({ ents: turretSocks(g), code: /^import /, info: ['cap'] }),
      },
    ],
    hint: 'A socket refills at only 30 W, so a laser set above about 25 W slowly drains it. For power.percent, change the first line to: import radar, motor, laser, power',
    solution: `    if power.percent < 30 and target.kind != "beetle":
        laser.stop()
        return   # low on energy: save it for beetles`,
  },
  {
    title: 'Memory and prediction',
    body: `A variable created <b>outside</b> a function keeps its value between ticks. To change it inside a function, write <code>global</code> first:
<pre>shots = 0
def update():
    global shots
    ...
    if cannon.fire():
        shots += 1
        print("shots:", shots)</pre>
      <p><b>Expert trick:</b> shells fly 18 tiles per second, so fast enemies move on before the shell arrives. Aim where the enemy <i>will be</i>: work out how long the shell needs (distance ÷ speed), then move the aim point by the enemy's speed (<code>target.vx</code>, <code>target.vy</code>, in tiles per second) × that time. <code>motor.aim_at(x, y)</code> aims at any point.</p>`,
    tasks: [
      {
        text: 'Use a <code>global</code> variable or <code>motor.aim_at()</code> in one turret.',
        check: g => anyCode(g, /\bglobal\b|aim_at\(/),
        focus: g => ({ ents: turretSocks(g, 'cannon'), code: /motor\.aim\(/ }),
      },
    ],
    hint: 'Anything you print() shows up in the console under the code editor.',
    solution: `    t = target.distance / 18
    motor.aim_at(target.x + target.vx * t, target.y + target.vy * t)`,
  },
  {
    title: 'Final wave: the Rootkit',
    body: `The boss is coming: a <b>Rootkit</b> with 1400 hp, armor 3 and a <b>300-point shield</b>. The shield grows back if nothing hits it for 2 seconds.
      <p>Keep up constant pressure: lasers for steady damage, strong cannons against armor, pulses for the mites that follow it. Keep an eye on your power!</p>`,
    tasks: [{ text: 'Survive wave 11.', check: null }],
    hint: 'The shield takes damage before armor counts. Several towers hitting the boss at the same time break the shield fastest.',
    solution: '# Use everything you learned!',
  },
];

// ---------------------------------------------------------------------------
// Module reference (Docs tab)
// ---------------------------------------------------------------------------
export const DOCS = {
  basics: `<h3>How turret programs work</h3>
<p>Your program must define <code>update()</code>. It runs <b>10 times per second</b>. The optional <code>setup()</code> runs once when you press Upload and is the place for settings.</p>
<p>Each socket has a CPU budget of <b>150 lines per tick</b>. If your code runs longer, the tick is cut short (<i>CPU overrun</i>). Every executed line also costs 2 mJ of energy.</p>
<p>Allowed imports: your turret's modules plus <code>math</code> and <code>random</code>. <code>print()</code> writes to the console.</p>`,
  radar: `<h3>radar</h3>
<p><b>Setting</b> <code>radar.range</code> 1–6 tiles (default 3). Draws <code>0.3 × range²</code> W all the time.</p>
<table>
<tr><td><code>radar.scan()</code></td><td>List of enemies in range, sorted: <code>[0]</code> is nearest the core.</td></tr>
<tr><td><code>radar.first(list)</code></td><td>Enemy furthest along the path.</td></tr>
<tr><td><code>radar.closest(list)</code></td><td>Enemy closest to this turret.</td></tr>
<tr><td><code>radar.weakest(list)</code></td><td>Lowest hp + shield.</td></tr>
<tr><td><code>radar.strongest(list)</code></td><td>Highest hp + shield.</td></tr>
</table>
<p>Each enemy has: <code>id kind hp max_hp armor shield speed distance progress x y vx vy</code>. <code>kind</code> is "bug", "worm", "mite", "beetle" or "rootkit".</p>`,
  motor: `<h3>motor</h3>
<p><b>Setting</b> <code>motor.speed</code> 30–720 °/s (default 180). Draws <code>0.04 × speed</code> W while turning.</p>
<table>
<tr><td><code>motor.aim(enemy)</code></td><td>Keep turning toward this enemy (it tracks it between ticks).</td></tr>
<tr><td><code>motor.aim_at(x, y)</code></td><td>Turn toward a map position (for leading targets).</td></tr>
<tr><td><code>motor.aimed(enemy, tolerance=6)</code></td><td>True if pointing within <i>tolerance</i> degrees.</td></tr>
<tr><td><code>motor.angle</code></td><td>Current angle in degrees (0 = right, 90 = down).</td></tr>
</table>`,
  cannon: `<h3>cannon</h3>
<p><b>Setting</b> <code>cannon.damage</code> 1–60 (default 10). Each shot costs <code>1.5 × damage</code> J. Reload 0.7 s. Shells fly 18 tiles/s in the direction the turret faces. Armor reduces each hit.</p>
<table>
<tr><td><code>cannon.fire()</code></td><td>Shoot if ready. Returns True if a shot was fired.</td></tr>
<tr><td><code>cannon.ready()</code></td><td>True if reloaded and there's enough energy.</td></tr>
<tr><td><code>cannon.shot_cost()</code></td><td>Energy per shot in J.</td></tr>
</table>`,
  pulse: `<h3>pulse</h3>
<p><b>Setting</b> <code>pulse.strength</code> 1–40 (default 8). Hits every enemy within <code>radar.range</code>. Cost per pulse <code>strength × (2 + 0.5 × range²)</code> J. Reload 1.4 s. Armor reduces damage.</p>
<table>
<tr><td><code>pulse.fire()</code></td><td>Release a pulse if ready. Returns True if fired.</td></tr>
<tr><td><code>pulse.ready()</code></td><td>True if reloaded and enough energy.</td></tr>
<tr><td><code>pulse.cost()</code></td><td>Energy per pulse in J.</td></tr>
</table>`,
  laser: `<h3>laser</h3>
<p><b>Setting</b> <code>laser.power</code> 1–80 W (default 20). Damage per second = <code>0.8 × power</code>. <b>Ignores armor.</b> Draws its watts the whole time it is on.</p>
<table>
<tr><td><code>laser.fire(enemy)</code></td><td>Beam on for this tick. Hurts only if aimed within 8°.</td></tr>
<tr><td><code>laser.stop()</code></td><td>Beam off.</td></tr>
<tr><td><code>laser.dps</code></td><td>Current damage per second.</td></tr>
</table>`,
  power: `<h3>power</h3>
<p>Read-only info about this socket's capacitor.</p>
<table>
<tr><td><code>power.energy</code></td><td>Stored energy (J).</td></tr>
<tr><td><code>power.capacity</code></td><td>Max energy (J).</td></tr>
<tr><td><code>power.percent</code></td><td>0–100.</td></tr>
</table>`,
  meter: `<h3>meter</h3>
<p>An energy meter. Just add it to the import line (<code>import radar, motor, cannon, meter</code>) and a small badge appears on the tower. <b>It uses no power.</b> Left half: the arrow below. Right half: the <b>worst case</b>: a bar of the power this turret would use with everything flat out (firing nonstop, turning, radar, code) compared with the power it would still get if every socket on its wires and PSU charged at once. Green up to 100%: it can run flat out forever. Yellow up to 150%: the capacitor covers bursts, but nonstop firing slowly drains it. Red (blinking) above: it cannot keep up under full load. The Power tab shows the exact numbers.</p>
<table>
<tr><td>▲ green</td><td>More energy comes in than the turret uses (or the capacitor is full).</td></tr>
<tr><td>= yellow</td><td>About even.</td></tr>
<tr><td>▼ red</td><td>The turret uses energy faster than it charges. It will run low (⚡) or brown out.</td></tr>
</table>
<p>Your code can read it too: <code>meter.net</code> (watts in minus watts used, smoothed over about 2 s) and <code>meter.trend</code> (<code>"charging"</code>, <code>"steady"</code> or <code>"draining"</code>).</p>`,
};

DOCS.lib = `<h3>lib (your library)</h3>
<p>Open <b>📚 Library</b> in the toolbar. Functions you write there can be used by <b>every</b> turret: add <code>import lib</code> to a turret program and call <code>lib.your_function(...)</code>.</p>
<p>Uploading the library re-uploads every turret that uses it. Pass things in as parameters (for example the enemy list) instead of importing turret modules inside the library, because not every turret has every module.</p>`;

// ---------------------------------------------------------------------------
// Shared player library (map 2+)
// ---------------------------------------------------------------------------
export const DEFAULT_LIBRARY = `# Your library: every turret can use these functions.
# In a turret:  import lib  then  lib.pick_target(enemies)

def pick_target(enemies):
    # TODO (Map 2): choose the best enemy to shoot
    return enemies[0]
`;

// ---------------------------------------------------------------------------
// Map 2: Graphics card (two lanes, forkbombs, the shared library)
// ---------------------------------------------------------------------------
const libCode = g => g.library?.code || '';
const allCode = g => libCode(g) + '\n' + turretsOf(g).map(t => t.code).join('\n');
const libUsers = g => turretsOf(g).filter(t => t.compiled && /\bimport\s+[\w, ]*\blib\b|from\s+lib\s+import/.test(t.code));

const GPU_LESSONS = [
  {
    title: 'Writing your own function',
    body: `Welcome to the <b>graphics card</b>. Bugs now come from <b>two lanes</b> that meet in the middle, and every turret type is already unlocked.
      <p>So far you used functions other people wrote. Now write your own! <code>def</code> creates a function, and <code>return</code> sends a result back:</p>
<pre>def double(n):
    return n * 2

print(double(5))    # prints 10</pre>
      <p>Your turn: write a function that takes the <code>enemies</code> list and returns the one to shoot, then use it in <code>update()</code>. The radar module has helpers like <code>radar.weakest(enemies)</code> and <code>radar.closest(enemies)</code>.</p>`,
    tasks: [
      { text: 'Build at least 2 turrets that cover both lanes.', check: g => turretsOf(g).filter(t => t.compiled).length >= 2 },
      { text: 'In one turret, create your own function with <code>def</code> (not setup or update) and call it.', check: g => anyCode(g, /def\s+(?!setup\b|update\b)\w+\s*\(/) },
    ],
    hint: 'Put your function above update(). Everything inside it is indented 4 spaces.',
    solution: `def pick_target(enemies):
    return radar.weakest(enemies)`,
  },
  {
    title: 'The shared library',
    body: `Copying the same function into every turret gets messy. Real programmers put shared code in a <b>module</b>, and you can too.
      <p>Open <b>📚 Library</b> (bottom toolbar). Functions you write there work in every turret: add <code>import lib</code> and call <code>lib.pick_target(enemies)</code>. Change the library once, and every turret uses the new version.</p>`,
    tasks: [
      { text: 'Write a <code>pick_target</code> function in the Library and upload it.', check: g => /def\s+pick_target/.test(libCode(g)) && !g.library.error },
      { text: 'Use <code>lib</code> in at least 2 turrets (<code>import lib</code>).', check: g => libUsers(g).length >= 2 },
    ],
    hint: 'In a turret, add lib to the import line, then change   target = enemies[0]   to   target = lib.pick_target(enemies)',
    solution: `import radar, motor, cannon, lib
...
    target = lib.pick_target(enemies)`,
  },
  {
    title: 'True or False answers',
    body: `A function can answer a yes/no question by returning <code>True</code> or <code>False</code>. That keeps your turret code short and readable:
<pre>def is_far(target):
    return target.distance > 2.5</pre>
      Then a turret can say <code>if lib.is_far(target):</code> and do something only for far-away enemies.
      <p>Idea for yours: a pulse is only worth its energy when a group of enemies is in range.</p>`,
    tasks: [
      { text: 'Add a function to the Library that returns True or False, and use it in an <code>if</code> in a turret.', check: g => /return\s+(True|False|.*(==|!=|<|>|\bin\b|\bnot\b))/.test(libCode(g)) && anyCode(g, /if\s+(not\s+)?lib\.\w+\(/) },
    ],
    hint: 'A comparison like len(enemies) >= 3 already is True or False, so you can return it directly.',
    solution: `def worth_pulsing(enemies):
    return len(enemies) >= 3`,
  },
  {
    title: 'Forkbombs and dictionaries',
    body: `<b>Forkbombs</b> split into 3 mites when they die, so a pulse right behind them is very useful.
      <p>A <b>dictionary</b> stores values under keys, like labelled boxes:</p>
<pre>prices = {"socket": 40, "cannon": 60}
print(prices["cannon"])           # 60
prices["laser"] = 100             # add a new box
print(prices.get("pulse", 0))     # 0: no such key yet</pre>
      <p>Idea: every enemy has its own <code>id</code> and <code>kind</code>. A dictionary could count how often you hit each one, or how many of each kind you saw.</p>`,
    tasks: [
      { text: 'Use a dictionary (create one with <code>{}</code>) in a turret or in the Library.', check: g => /=\s*\{\s*\}|=\s*dict\(/.test(allCode(g)) },
    ],
    hint: 'Create the dictionary outside update(), so it is remembered between ticks.',
    solution: `shots = {}

def update():
    ...
    shots[target.id] = shots.get(target.id, 0) + 1`,
  },
  {
    title: 'Sorting',
    body: `<code>sorted(list, key=...)</code> gives you a new list in the order you choose. The <code>key</code> says what to sort by:
<pre>by_hp = sorted(enemies, key=lambda e: e.hp)
toughest = by_hp[-1]     # the last one has the most hp</pre>
      <p><code>lambda e: e.hp</code> is a tiny function: "for an enemy e, use e.hp".</p>`,
    tasks: [
      { text: 'Use <code>sorted(</code> somewhere in your code.', check: g => /sorted\(/.test(allCode(g)) },
    ],
    hint: 'Add reverse=True to sort from biggest to smallest.',
    solution: `def pick_target(enemies):
    return sorted(enemies, key=lambda e: e.hp + e.shield)[-1]`,
  },
  {
    title: 'Default parameters',
    body: `A parameter can have a <b>default value</b>, so you only pass it when you want something different:
<pre>def pick(enemies, n=0):
    return enemies[n]</pre>
      <code>pick(enemies)</code> gives the first enemy, <code>pick(enemies, 2)</code> the third.
      <p>Idea: a target picker that prefers one enemy <code>kind</code>, with a default (like beetles), so a laser can pass a different kind (like "rootkit").</p>`,
    tasks: [
      { text: 'Give one of your Library functions a parameter with a default value.', check: g => /def\s+\w+\([^)]*=[^)]*\)/.test(libCode(g)) },
    ],
    hint: 'The default goes in the def line: def name(a, b=5):',
    solution: `def pick_target(enemies, prefer="beetle"):
    for e in enemies:
        if e.kind == prefer:
            return e
    return enemies[0]`,
  },
  {
    title: 'f-strings and debugging',
    body: `When something behaves strangely, print what your code sees. <b>f-strings</b> put values straight into text:
<pre>print(f"{target.kind} hp={target.hp:.0f}")</pre>
      <p><code>:.0f</code> means "no decimals". The output appears in the turret's console.</p>`,
    tasks: [
      { text: 'Print something with an f-string from a turret.', check: g => turretsOf(g).some(t => t.compiled && /print\(\s*f["']/.test(t.code)) },
    ],
    hint: 'Print only when something happens (for example when cannon.fire() returns True), or the console fills up fast.',
    solution: `    if cannon.fire():
        print(f"shot {target.kind} at {target.distance:.1f} tiles")`,
  },
  {
    title: 'Final: double Rootkit',
    body: `<b>Two Rootkits</b>, one in each lane, with escorts. Use everything: your library, smart targeting and your power budget.`,
    tasks: [{ text: 'Survive wave 8.', check: null }],
    hint: 'A laser that prefers "rootkit", e.g. lib.pick_target(enemies, "rootkit"), keeps the shield down.',
    solution: '# You know everything you need. Good luck!',
  },
];

const MOTHERBOARD_STARTER = g => {
  const psu = g.addEntity('psu', 1, 5);
  const sock = g.addEntity('socket', 6, 5);
  g.addWire(psu.id, sock.id);
  g.addTurret(sock, 'cannon', STARTER_CANNON);
  sock.energy = sock.cap * 0.6;
  sock.offline = false;
};

export const MAPS = [
  {
    id: 'motherboard', name: 'Motherboard', num: 1,
    desc: 'Learn the basics: functions, if, loops, power and targeting.',
    paths: [PATH], core: CORE, start: START, waves: WAVES, lessons: LESSONS,
    hpBase: 1, hpGrowth: WAVE_HP_GROWTH, bonus: WAVE_BONUS,
    unlock: { cannon: 1, pulse: 7, laser: 9 }, library: false, starter: MOTHERBOARD_STARTER,
  },
  {
    id: 'gpu', name: 'Graphics card', num: 2,
    desc: 'Two lanes and forkbombs. Write your own functions and a shared library.',
    paths: [
      [[-0.6, 1.5], [3.5, 1.5], [3.5, 5.5], [8.5, 5.5], [8.5, 8.5], [12.5, 8.5], [12.5, 5.5], [15.6, 5.5]],
      [[-0.6, 9.5], [3.5, 9.5], [3.5, 5.5], [8.5, 5.5], [8.5, 8.5], [12.5, 8.5], [12.5, 5.5], [15.6, 5.5]],
    ],
    core: { c: 15, r: 4, w: 3, h: 3 },
    start: { credits: 400, core: 20 },
    waves: [
      [{ t: 'bug', n: 7, gap: 1.4, p: 0 }, { t: 'bug', n: 7, gap: 1.4, p: 1, with: true, delay: 0.7 }],
      [{ t: 'worm', n: 10, gap: 0.8, p: 0 }, { t: 'bug', n: 10, gap: 1, p: 1, with: true }],
      [{ t: 'beetle', n: 4, gap: 2.5, p: 1 }, { t: 'bug', n: 12, gap: 0.7, p: 0, with: true }],
      [{ t: 'forkbomb', n: 5, gap: 2.4, p: 0 }, { t: 'forkbomb', n: 5, gap: 2.4, p: 1, with: true, delay: 1.2 }],
      [{ t: 'mite', n: 30, gap: 0.15, p: 0 }, { t: 'worm', n: 16, gap: 0.5, p: 1, with: true }, { t: 'beetle', n: 6, gap: 1.8, p: 0, delay: 1 }],
      [{ t: 'forkbomb', n: 8, gap: 1.6, p: 1 }, { t: 'beetle', n: 6, gap: 1.9, p: 0, with: true }, { t: 'worm', n: 16, gap: 0.5, p: 0, delay: 1 }],
      [{ t: 'beetle', n: 8, gap: 1.5, p: 0 }, { t: 'beetle', n: 8, gap: 1.5, p: 1, with: true }, { t: 'mite', n: 30, gap: 0.15, p: 0, delay: 1 }, { t: 'forkbomb', n: 6, gap: 1.4, p: 1, with: true }],
      [{ t: 'rootkit', n: 1, gap: 1, p: 0 }, { t: 'rootkit', n: 1, gap: 1, p: 1, with: true, delay: 6 }, { t: 'worm', n: 14, gap: 0.5, p: 0, delay: 2 }, { t: 'forkbomb', n: 6, gap: 1.4, p: 1, with: true }, { t: 'beetle', n: 6, gap: 1.5, p: 0 }],
    ],
    lessons: GPU_LESSONS,
    hpBase: 1.0, hpGrowth: 0.10, bonus: w => 35 + 8 * w,
    unlock: { cannon: 1, pulse: 1, laser: 1 }, library: true,
    starter: g => { g.addEntity('psu', 1, 5); },
  },
];
