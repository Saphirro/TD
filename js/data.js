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
  pulseSurgeJ: 15,     // a pulse that hits 0-1 enemies drains this from every other socket on its PSU
  fieldWPerPct: 0.45,  // Slow field uses slow x 0.45 W while on (30 % = 13.5 W)
  arcJPerDmg: 0.9,     // Arc: energy per shot = damage x (1 + jumps) x 0.9 J
  arcJump: 1.8,        // Arc: max distance (tiles) for a jump
  arcFalloff: 0.75,    // Arc: each jump does 75 % of the previous damage
  brownoutResume: 0.25 // turret restarts at 25% charge
};

// [min, max, default] for every module setting
export const LIMITS = {
  range: [1, 6, 3],
  speed: [30, 720, 180],
  damage: [1, 60, 10],
  power: [1, 80, 20],
  strength: [1, 40, 8],
  slow: [10, 60, 30],      // Slow field: % slower for enemies inside it
  jumps: [1, 5, 2],        // Arc: how many extra enemies the lightning jumps to
};

export const BUILDINGS = {
  socket:   { name: 'Socket',   cost: 40, desc: 'Tower base: 12 V, 100 J capacitor, 150 lines/tick CPU. Can pass power on to 1 more part.' },
  splitter: { name: 'Splitter', cost: 15, desc: 'Splits one power line into up to 3.' },
  psu:      { name: 'PSU',      cost: 80, desc: 'Generator: 12 V, 100 W max, 4 outputs.' },
};
// power outputs per part. A socket has 1 "power out" so sockets can be chained;
// everything further down a chain shares the wire feeding it (5 A = 60 W).
export const PORTS = { psu: 4, splitter: 3, socket: 1 };
// upgrade levels (level 1 = as built). Costs are paid per step and count toward the sell value.
// The Lab: permanent boosts bought with stars between maps (per player). Small on purpose:
// every map must stay winnable without them. All levels together cost 35 stars.
export const LAB = [
  { id: 'library', icon: '📚', name: 'Library capacity', desc: 'Bring one more of your own functions into a new map (basic modules never count). Everyone starts with 1.', per: '+1 function', levels: 3, cost: 2 },
  { id: 'core', icon: '🛡', name: 'Core shield', desc: 'The CPU core can take more hits on every map.', per: '+2 core', levels: 3, cost: 1 },
  { id: 'slots', icon: '🧩', name: 'Socket CPU', desc: 'Every new socket has an extra module slot.', per: '+1 module slot', levels: 2, cost: 3 },
  { id: 'psu', icon: '⚡', name: 'PSU efficiency', desc: 'Every PSU gives more power.', per: '+10 W per PSU', levels: 3, cost: 1 },
  { id: 'wire', icon: '〰', name: 'Thicker wires', desc: 'Every wire carries more current.', per: '+1 A (+12 W) per wire', levels: 2, cost: 2 },
  { id: 'budget', icon: '💰', name: 'Starting budget', desc: 'More credits when a map starts.', per: '+20 credits', levels: 3, cost: 1 },
  { id: 'bonus', icon: '📈', name: 'Wave bonus', desc: 'More credits after each wave.', per: '+5% wave bonus', levels: 3, cost: 2 },
  { id: 'charge', icon: '🔋', name: 'Fast charging', desc: 'Sockets refill their capacitor faster.', per: '+5 W charging', levels: 2, cost: 2 },
];
// what a set of Lab levels does in the game rules
export function labBoost(levels = {}) {
  const l = id => levels[id] || 0;
  return { library: 1 + l('library'), core: 2 * l('core'), slots: l('slots'), psuW: 10 * l('psu'), wireA: l('wire'),
    credits: 20 * l('budget'), bonusPct: 0.05 * l('bonus'), chargeW: 5 * l('charge') };
}
export const EXTRA_MODULES = ['power', 'meter', 'lib', 'mem', 'net', 'sched'];   // need a free module slot on the socket
export const UPGRADES = {
  psu: [{ maxW: 100 }, { maxW: 140, cost: 60 }, { maxW: 180, cost: 90 }],
  // slots = extra modules a turret program may import (power, meter, lib); radar, motor and the weapon are always free
  socket: [{ chargeW: 30, cap: 100, slots: 1, cpu: 150 }, { chargeW: 40, cap: 130, slots: 2, cpu: 200, cost: 35 }, { chargeW: 50, cap: 160, slots: 3, cpu: 250, cost: 55 }],
};

export const TURRETS = {
  cannon: {
    name: 'Cannon', cost: 60, unlock: 1, reload: 0.7, shellSpeed: 18,
    modules: ['radar', 'motor', 'cannon', 'power', 'meter', 'mem', 'net', 'sched'], color: '#5ee1ff',
    desc: 'Fires shells in the direction it faces. Needs aiming.',
  },
  pulse: {
    name: 'Pulse', cost: 80, unlock: 5, reload: 1.4,
    modules: ['radar', 'pulse', 'power', 'meter', 'mem', 'net', 'sched'], color: '#ffcf4a',
    desc: 'Shockwave that hits every enemy in radar range.',
  },
  laser: {
    name: 'Laser', cost: 100, unlock: 8,
    modules: ['radar', 'motor', 'laser', 'power', 'meter', 'mem', 'net', 'sched'], color: '#ff5ea8',
    desc: 'Continuous beam. Ignores armor, drains watts while firing.',
  },
  field: {
    name: 'Slow field', cost: 70, unlock: 99,
    modules: ['radar', 'field', 'power', 'meter', 'mem', 'net', 'sched'], color: '#7ad7ff',
    desc: 'Slows every enemy in radar range while it is on. Uses watts while on, does no damage.',
  },
  arc: {
    name: 'Arc', cost: 90, unlock: 99, reload: 1.0,
    modules: ['radar', 'arc', 'power', 'meter', 'mem', 'net', 'sched'], color: '#c89bff',
    desc: 'Lightning that hits a target, then jumps to nearby enemies. No aiming needed.',
  },
};

export const ENEMIES = {
  bug:     { name: 'Bug',     hp: 30,  speed: 1.1,  radius: 0.27, reward: 4,   dmg: 1,  armor: 0, color: '#ff4d6d', desc: 'Basic crawler.' },
  worm:    { name: 'Worm',    hp: 20,  speed: 2.1,  radius: 0.24, reward: 4,   dmg: 1,  armor: 0, color: '#7dff6a', desc: 'Fast. Slow turrets struggle to track it.' },
  mite:    { name: 'Mite',    hp: 7,   speed: 1.5,  radius: 0.15, reward: 1,   dmg: 1,  armor: 0, color: '#ffd23f', desc: 'Tiny. Comes in swarms.' },
  beetle:  { name: 'Beetle',  hp: 90,  speed: 0.8,  radius: 0.34, reward: 10,  dmg: 2,  armor: 6, color: '#7fa6cf', desc: 'Armor 6: every hit does 6 less damage.' },
  forkbomb: { name: 'Forkbomb', hp: 55, speed: 0.95, radius: 0.3, reward: 5, dmg: 2, armor: 0, splits: { type: 'mite', n: 3 }, color: '#ff8a3d', desc: 'Splits into 3 mites when destroyed.' },
  leak:    { name: 'Memory leak', hp: 50, speed: 0.85, radius: 0.27, reward: 7, dmg: 2, armor: 0, grows: 0.10, growCap: 3, color: '#ff66cc', desc: 'Grows: gains 10% health every second it is alive (up to 3x). Kill it early.' },
  overflow: { name: 'Stack overflow', hp: 1600, speed: 0.4, radius: 0.5, reward: 120, dmg: 10, armor: 2, grows: 0.025, growCap: 1.5, boss: true, splits: { type: 'leak', n: 4 }, color: '#ff3fa4', desc: 'Boss. Grows slowly (up to 1.5x) and bursts into 4 memory leaks.' },
  packet:  { name: 'Packet', hp: 12, speed: 2.5, radius: 0.16, reward: 1, dmg: 1, armor: 0, color: '#5effc8', desc: 'Very fast and light. Comes in bursts.' },
  router:  { name: 'Router', hp: 90, speed: 0.7, radius: 0.33, reward: 10, dmg: 2, armor: 2, splits: { type: 'packet', n: 3 }, color: '#4fd1ff', desc: 'Armor 2. Sends out 3 packets when destroyed.' },
  rootkit: { name: 'Rootkit', hp: 1400, speed: 0.45, radius: 0.5,  reward: 100, dmg: 10, armor: 3, shield: 300, shieldRegen: 20, boss: true, color: '#b15cff', desc: 'Boss. Shield regenerates after 2 s without damage.' },
  // chapter 5: a virus that keeps changing its form, and the final boss
  poly:    { name: 'Polymorphic virus', hp: 55, speed: 1.0, radius: 0.29, reward: 8, dmg: 1, armor: 0,
             morph: { every: 3, forms: [{ armor: 0, speed: 1.4 }, { armor: 8, speed: 0.6 }] }, color: '#3dffb0',
             desc: 'Changes form every 3 s: fast with no armor, or slow with armor 8. Check target.armor before you shoot.' },
  kernel:  { name: 'Kernel panic', hp: 2600, speed: 0.36, radius: 0.58, reward: 250, dmg: 15, armor: 4, shield: 400, shieldRegen: 25, boss: true,
             spawns: { type: 'poly', every: 6 }, splits: { type: 'poly', n: 4 }, color: '#ff3b3b',
             desc: 'Final boss. Shield regenerates after 2 s, calls in a polymorphic virus every 6 s and bursts into 4 more when destroyed.' },
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
  [{ t: 'bug', n: 14, gap: 0.5 }, { t: 'rootkit', n: 1, gap: 1, delay: 2 }, { t: 'beetle', n: 10, gap: 1.2, delay: 3 }, { t: 'mite', n: 40, gap: 0.13, delay: 2 }, { t: 'worm', n: 20, gap: 0.35, delay: 1 }],
];
export const WAVE_HP_GROWTH = 0.14;   // +14% hp per wave (bosses excluded)
export const WAVE_BONUS = (w) => 23 + 6 * w;   // tighter early than before (was 30 + 5w), grows for the late waves

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
    if motor.aimed(target):  # only shoot when the barrel points at it
        cannon.fire()
`,
  pulse: `import radar, pulse

def setup():
    # Runs once when you press Upload.
    radar.range = 2       # tiles (1 to 6): the pulse hits EVERY enemy inside this radius. Radar: 0.3 x range² W
    pulse.strength = 8    # damage to each enemy (1 to 40)
    # energy per pulse = strength x (2 + 0.5 x range²) J

def update():
    # Runs 10 times every second.
    enemies = radar.scan()   # enemies in range
    # TODO (Lesson 7): only fire when 3 or more enemies are in range
    if len(enemies) > 0:
        pulse.fire()         # hitting only 1 enemy causes a power SURGE
`,
  laser: `import radar, motor, laser

def setup():
    # Runs once when you press Upload.
    radar.range = 3.5     # tiles (1 to 6). Power: 0.3 x range² W, always on
    motor.speed = 240     # degrees per second (30 to 720). Power: 0.04 x speed W while turning
    laser.power = 20      # watts while firing (1 to 80). Damage per second = power x 0.8, ignores armor

def update():
    # Runs 10 times every second.
    enemies = radar.scan()   # enemies in range, [0] = nearest the core
    if not enemies:
        laser.stop()         # nothing to shoot: switch the beam off to save power
        return
    target = enemies[0]
    motor.aim(target)        # start turning toward the target
    if motor.aimed(target):
        laser.fire(target)   # must be called every tick to keep the beam on
    else:
        laser.stop()
`,
  field: `import radar, field

def setup():
    # Runs once when you press Upload.
    radar.range = 2.5     # tiles (1 to 6): enemies inside this circle are slowed. Radar: 0.3 x range² W
    field.slow = 30       # percent slower (10 to 60). Power: slow x 0.45 W while the field is on

def update():
    # Runs 10 times every second.
    enemies = radar.scan()
    if len(enemies) > 0:
        field.on()        # slow everything in range
    else:
        field.off()       # nobody here: save the power
`,
  arc: `import radar, arc

def setup():
    # Runs once when you press Upload.
    radar.range = 2.5     # tiles (1 to 6). Radar: 0.3 x range² W, always on
    arc.damage = 12       # damage to the first enemy (1 to 60); each jump does 75 % of the one before
    arc.jumps = 2         # extra enemies the lightning jumps to (1 to 5)
    # energy per shot = damage x (1 + jumps) x 0.9 J

def update():
    # Runs 10 times every second.
    enemies = radar.scan()   # enemies in range, [0] = nearest the core
    if len(enemies) == 0:
        return
    arc.fire(enemies[0])     # no aiming needed: lightning finds its way
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
        text: 'Open the cannon\'s code: <span class="pc">double-click the cannon</span><span class="tap">tap the cannon, then <b>Code</b></span>. On the empty line under the yellow <code># TODO</code>, type <code>cannon.fire()</code>. Press <b>Upload</b><span class="pc"> (or Ctrl+S)</span>, then <b>Start wave</b>.',
        check: g => anyCode(g, /cannon\.fire\(/, 'cannon'),
        focus: g => ({ ents: turretSocks(g, 'cannon'), code: /# TODO/, dom: ['#ed-upload'] }),
        ghost: [{ after: /# TODO \(Lesson 1\)/, text: '    cannon.fire()' }],
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
        text: '<b>Build a second cannon.</b> <span class="pc">Pick <b>Socket</b> in the toolbar and click an empty tile near the path. Pick <b>Wire</b>, click the PSU, then your socket. Pick <b>Cannon</b> and click the socket.</span><span class="tap">Tap an empty tile near the path and choose <b>Socket</b>. Tap the socket, choose <b>🔌 Power</b>, then tap the PSU. Tap the socket again and choose <b>Cannon</b>.</span> It starts with a copy of your cannon program.',
        check: g => turretsOf(g, 'cannon').length >= 2,
        focus: g => buildFocus(g, 'cannon'),
      },
      {
        text: '<span class="pc">Click the <b>PSU</b></span><span class="tap">Tap the <b>PSU</b> and choose <b>ℹ Info</b></span>, and look at <b>Output</b> and <b>Demand</b>: how many watts your cannons use right now.',
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
      <p>For your cannon, the <b>motor</b> module can tell you if the barrel points at the target: <code>motor.aimed(target)</code> gives back <code>True</code> or <code>False</code>. To see everything <b>motor</b> can do, open the code editor and look at its <b>Docs</b> tab.</p>`,
    tasks: [
      {
        text: 'Make a cannon fire <b>only when</b> <code>motor.aimed(target)</code> is True. Press <b>Upload</b>. Each cannon has its own copy of the code, so do it on every cannon.',
        check: g => anyCode(g, /if\s+motor\.aimed\(\s*target\s*\)\s*:\s*\n\s+cannon\.fire\(/, 'cannon'),
        focus: g => ({ ents: turretSocks(g, 'cannon', t => !/if\s+motor\.aimed\(/.test(t.code)), code: /cannon\.fire\(/, dom: ['#ed-upload'] }),
        ghost: [
          { after: /^\s*motor\.aim\(target\)/, text: '    if motor.aimed(target):' },
          { after: /^\s*if motor\.aimed\(target\)/, text: '        cannon.fire()' },
        ],
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
    title: 'Your own function',
    half: true,   // lesson 3½: appears in the same wave once lesson 3 is done
    keeps: 'in_range',   // the function the player writes here is saved and goes into their map 2 Library
    body: `So far you called functions other people wrote: <code>radar.scan()</code>, <code>cannon.fire()</code>. Now you write one yourself. A function is a small named recipe:
      <ul><li><code>def</code> starts it, then its <b>name</b>, then the values it needs in brackets, then a colon <code>:</code></li>
      <li>the lines under it, 4 spaces in, are what it does</li>
      <li><code>return</code> sends the answer back to whoever called it</li></ul>
      <p><b>Example</b> (not your answer): a function that tells you if the turret is gaining energy. It uses the meter module (add <code>meter</code> to the import line to try it):</p>
      <pre>def charging():
    return meter.net > 0</pre>
      <p>and using it inside <code>update()</code>:</p>
      <pre>    if charging():
        print("gaining energy")</pre>
      <p><b>Your function:</b> <code>in_range(target, max_dist)</code> answers "is this enemy close enough?". <code>target</code> and <code>max_dist</code> are its two inputs. Every enemy has <code>target.distance</code>: how many tiles away from this turret it is. The answer is <code>True</code> when that is <code>max_dist</code> or less.</p>
      <p>Why it helps: shells need time to fly, so close enemies are hit much more often. Stuck? <b>Hint</b> shows the next line faintly in the editor. You still type it yourself.</p>
      <p>Your function also comes with you to the next map, into your own <b>Library</b>.</p>`,
    tasks: [
      {
        text: 'Above <code>def update():</code>, write the function <code>in_range(target, max_dist)</code> that returns whether <code>target.distance</code> is <code>max_dist</code> or less. Upload.',
        check: g => anyCode(g, /def\s+in_range\s*\(\s*\w+\s*,\s*\w+\s*\)\s*:\s*\n[ \t]+return\b/, 'cannon'),
        focus: g => ({ ents: turretSocks(g, 'cannon'), code: /^def update/, dom: ['#ed-upload', '#ed-hint'] }),
        ghost: [
          { before: /^def update\(/, text: 'def in_range(target, max_dist):' },
          { after: /^def in_range\(/, text: '    return target.distance <= max_dist' },
        ],
      },
      {
        text: 'Use it: the cannon fires only when it is aimed <b>and</b> <code>in_range(target, 2.5)</code> is True. Upload.',
        check: g => anyCode(g, /if\s+[^\n]*in_range\(\s*target\s*,/, 'cannon'),
        focus: g => ({ ents: turretSocks(g, 'cannon'), code: /cannon\.fire\(/, dom: ['#ed-upload', '#ed-hint'] }),
        ghost: [
          { after: /^\s*if motor\.aimed\(target\)/, text: '        if in_range(target, 2.5):' },
          { after: /^\s*if in_range\(target/, text: '            cannon.fire()' },
        ],
      },
    ],
    hint: 'First line: def in_range(target, max_dist):   Second line, 4 spaces in: return target.distance <= max_dist   (<= means "less than or equal to").',
    solution: `def in_range(target, max_dist):
    return target.distance <= max_dist

def update():
    ...
    if motor.aimed(target):
        if in_range(target, 2.5):
            cannon.fire()`,
  },
  {
    title: 'Energy: joules in and out',
    body: `Everything a turret does uses energy from its socket's capacitor. Energy is counted in <b>joules (J)</b>, and <b>1 watt = 1 joule every second</b>.
      <ul><li><b>In:</b> the socket refills at up to <b>30 W</b> (30 J every second), if its wire and PSU can deliver that.</li>
      <li><b>Out:</b> each shot costs <code>damage × 1.5</code> J. Damage 10 = 15 J per shot. A cannon that fires every 0.7 s uses about 21 J every second, so 21 W.</li>
      <li>The radar uses <code>0.3 × range²</code> W all the time, the motor <code>0.04 × speed</code> W while turning, and every line of code 2 mJ.</li></ul>
      <p>If more joules go out than come in, the capacitor empties and the turret runs low (⚡) or browns out.</p>
      <p><b>New module: meter.</b> Add <code>meter</code> to the import line and the tower shows a small badge: <b style="color:#3dff9a">▲</b> gaining, <b style="color:#ffc94a">=</b> about even, <b style="color:#ff5b5b">▼</b> using more than it gets, and next to it a <b>worst-case</b> bar: green if the turret could fire nonstop on the power it gets, yellow if close, red if it would drain. The meter itself uses no power.</p>
      <p><b>Module slots:</b> radar, motor and the weapon are built in. Extra modules like <code>meter</code>, <code>power</code> and (later) <code>lib</code> each need a <b>slot</b> on the socket. A new socket has 1 slot; upgrading it gives 2, then 3.</p>`,
    tasks: [
      {
        text: 'Add <code>meter</code> to the import line of a cannon and upload. Watch its badge during the wave.',
        check: g => anyCode(g, /^\s*import[^\n#]*\bmeter\b/m),
        focus: g => ({ ents: turretSocks(g, 'cannon'), code: /^import /, dom: ['#ed-upload'] }),
        ghost: [{ change: /^import /, text: 'import radar, motor, cannon, meter' }],
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
        ghost: [{ change: /^\s*cannon\.damage\s*=/, text: '    cannon.damage = 20' }],
      },
    ],
    hint: 'Too much damage drains the socket faster than it refills, and a yellow ⚡ appears on the turret. Somewhere around 18–25 works well.',
    solution: `def setup():
    radar.range = 3
    motor.speed = 180
    cannon.damage = 20`,
  },
  {
    title: 'More power: PSUs and upgrades',
    body: `Stronger shots use more energy, and your <b>PSU</b> only has <b>100 W</b>. Look at its frame on the board:
      <ul><li><b>green</b>: fine</li>
      <li><b>yellow</b>: its sockets could use 75–100% of its power</li>
      <li><b>red</b>: if all its sockets charge at once they need more than 100 W. Then it is <b>overloaded</b>: everyone gets a smaller share, capacitors drain and turrets run low (⚡).</li></ul>
      <p>Each socket can pull up to 30 W while it charges, so one PSU comfortably runs about <b>3 turrets</b>.</p>
      <p><b>The fix:</b> build another PSU (80 credits), close to your towers so the wires are short. Then move a socket over to it: <span class="pc">click the socket, press <b>Unplug</b>, pick <b>Wire</b> and connect it from the new PSU</span><span class="tap">tap the socket and choose <b>⏏ Unplug</b>, then tap it again, choose <b>🔌 Power</b> and tap the new PSU</span>. New towers can go straight onto the new PSU.</p>
      <p>Tap a PSU to see its <b>Peak</b>: what it would need if everything charged at the same time.</p>
      <p><b>New: upgrades.</b> Instead of a second PSU you can upgrade one: <b>⬆ Upgrade</b> on a PSU raises it to 140 W, then 180 W. Sockets can be upgraded too: they charge faster (40, then 50 W) and store more energy. Upgrades are cheaper than new parts but limited, so choose where they matter.</p>`,
    tasks: [
      {
        text: 'Get more power: <span class="pc">pick <b>PSU</b> in the toolbar, click an empty tile, then <b>Wire</b> it to a socket</span><span class="tap">tap an empty tile and choose <b>PSU</b>, then tap it, choose <b>➜ Wire out</b> and tap a socket</span>. <b>Or</b> upgrade your PSU: <span class="pc">click it, then <b>⬆ Upgrade</b></span><span class="tap">tap it and choose <b>⬆ Upgrade</b></span>.',
        check: g => g.psus().filter(p => p.outputs.length).length >= 2 || g.psus().some(p => p.level >= 2),
        focus: g => {
          const spare = g.psus().find(p => !p.outputs.length);
          if (!spare) return g.psus().length < 2 ? { tools: ['psu'], ents: [] } : { tools: ['psu'] };
          return { tools: ['wire'], ents: [spare.id, ...g.sockets().filter(s => s.turret).map(s => s.id)] };
        },
      },
      {
        text: 'Get every PSU out of the red: no PSU should need more than it can give at peak (<span class="pc">click it</span><span class="tap">tap it, choose <b>ℹ Info</b></span> and check <b>Peak</b>).',
        check: g => { g.updatePeaks(); return g.psus().length >= 2 && g.psus().every(p => (p.peakW || 0) <= p.maxW + 0.01); },
        focus: g => { g.updatePeaks(); return { ents: g.psus().filter(p => (p.peakW || 0) > p.maxW).map(p => p.id), info: ['psupeak'] }; },
      },
    ],
    hint: 'Unplug cuts a socket from its wire (you get some of the wire\'s cost back). The socket then needs a new wire from the other PSU. Sockets that are chained share one wire, so moving the first one of a chain moves the whole chain.',
    solution: 'No code this time. One PSU per 3 turrets keeps every frame green or yellow.',
  },
  {
    title: 'Lists and for loops',
    body: `Swarms of tiny <b>mites</b> are coming. <b>New: Pulse turret!</b> Its shockwave hits <i>every</i> enemy in range at once, but each pulse is expensive, so only fire it when it hits several. <b>Careful:</b> a pulse that hits only one enemy (or none) sends a <b>power surge</b> back through the wires and drains 15 J from every other socket on the same PSU.
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
      <p><b>Saving energy:</b> big waves empty your sockets. Add <code>power</code> to the import line and your code can read <code>power.percent</code> (0–100) and <code>power.energy</code> (joules), for example to stop shooting small bugs when energy is low. Even your code costs energy: every line that runs uses 2 mJ.</p>
      <p><code>power</code> needs a module slot. If the socket already uses its slot for <code>meter</code>, upgrade the socket (⬆, 2 slots) or take <code>meter</code> out of the import line.</p>`,
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
<p><b>Setting</b> <code>pulse.strength</code> 1–40 (default 8). Hits every enemy within <code>radar.range</code>. Cost per pulse <code>strength × (2 + 0.5 × range²)</code> J. Reload 1.4 s. Armor reduces damage. A pulse that hits <b>one or no</b> enemy causes a <b>surge</b>: every other socket on the same PSU loses 15 J.</p>
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
  field: `<h3>field (Slow field turret)</h3>
<p><b>Setting</b> <code>field.slow</code> 10–60 (default 30): how many percent slower enemies inside <code>radar.range</code> move. Does no damage. While on it uses <code>slow × 0.45</code> W (30 % = 13.5 W).</p>
<table>
<tr><td><code>field.on()</code></td><td>Switch the field on (it stays on until <code>field.off()</code>).</td></tr>
<tr><td><code>field.off()</code></td><td>Switch it off to save power.</td></tr>
<tr><td><code>field.cost()</code></td><td>Watts it uses while on.</td></tr>
</table>`,
  arc: `<h3>arc (Arc turret)</h3>
<p><b>Settings</b> <code>arc.damage</code> 1–60 (default 12) and <code>arc.jumps</code> 1–5 (default 2). The lightning hits the target (inside <code>radar.range</code>), then jumps to the nearest enemy it hasn't hit yet within 1.8 tiles, up to <code>jumps</code> times. Each jump does 75 % of the one before. Armor counts on every hit. Energy per shot: <code>damage × (1 + jumps) × 0.9</code> J. Reload 1 s.</p>
<table>
<tr><td><code>arc.fire(target)</code></td><td>Fire at an enemy if ready. Returns True if fired.</td></tr>
<tr><td><code>arc.ready()</code></td><td>True if reloaded and enough energy.</td></tr>
<tr><td><code>arc.cost()</code></td><td>Energy one shot costs.</td></tr>
</table>`,
  net: `<h3>net (messages between turrets)</h3>
<p>Turrets can talk. A message sent during one tick arrives during the next tick, for <b>every</b> turret that listens on that channel. Needs a module slot.</p>
<table>
<tr><td><code>net.send(channel, value)</code></td><td>Send a value on a channel, e.g. <code>net.send("boss", target.id)</code>.</td></tr>
<tr><td><code>net.receive(channel)</code></td><td>List of everything sent on that channel last tick (empty list if nothing).</td></tr>
<tr><td><code>net.channels()</code></td><td>Channels that had messages last tick.</td></tr>
</table>
<p>Difference to <code>mem</code>: mem keeps a value until it is overwritten; net messages are gone after one tick, like a radio call.</p>`,
  sched: `<h3>sched (scheduler)</h3>
<p>Plan <b>when</b> your code runs. Heavy work (sorting, counting, long loops) does not have to run every tick. Needs a module slot.</p>
<table>
<tr><td><code>sched.tick</code></td><td>How many ticks this turret has run (1, 2, 3, ...).</td></tr>
<tr><td><code>sched.every(n)</code></td><td><code>True</code> on every n-th tick (n = 1..100), e.g. <code>if sched.every(5):</code>.</td></tr>
<tr><td><code>sched.spare()</code></td><td>CPU lines this turret can still use in this tick.</td></tr>
</table>
<p>Store the result of heavy work in a variable outside <code>update()</code> (or in <code>mem</code>) and reuse it until the next run.</p>`,
  mem: `<h3>mem (shared memory)</h3>
<p>One notebook that <b>every turret</b> on the map can read and write. Needs a module slot. It is emptied when a map starts.</p>
<table>
<tr><td><code>mem.write(key, value)</code></td><td>Store a value under a name, e.g. <code>mem.write("boss", target.id)</code>.</td></tr>
<tr><td><code>mem.read(key, default)</code></td><td>Read it back; gives <code>default</code> (or None) if nothing is stored.</td></tr>
<tr><td><code>mem.keys()</code></td><td>List of all names in the notebook.</td></tr>
<tr><td><code>mem.clear(key)</code></td><td>Remove one name.</td></tr>
</table>
<p>Values are written during a turret's <code>update()</code>, so another turret may see them one tick later.</p>`,
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
      <p>On the motherboard you wrote <code>in_range</code>. It is already in your <b>📚 Library</b> (it shows up there if you finished lesson 3½). Now write another one: <code>def</code> creates a function, and <code>return</code> sends a result back:</p>
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
      <p>Open <b>📚 Library</b> (<span class="pc">bottom toolbar, or the L key</span><span class="tap">📚 in the top bar</span>). Functions you write there work in every turret: add <code>import lib</code> and call <code>lib.pick_target(enemies)</code>. Change the library once, and every turret uses the new version.</p>`,
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

// ---------------------------------------------------------------------------
// Exam maps (B maps): short challenges that use what the chapter taught
// ---------------------------------------------------------------------------
const cannonsAll = (g, re) => turretsOf(g, 'cannon').length > 0 && turretsOf(g, 'cannon').every(t => t.compiled && re.test(t.code));
const libDefs = g => (libCode(g).match(/^def\s+\w+/gm) || []).length;
const psusOk = g => { g.updatePeaks(); return g.psus().length > 0 && g.psus().every(p => (p.peakW || 0) <= p.maxW + 0.01); };

const EXAM1_LESSONS = [
  {
    title: 'Exam: careful cannons',
    body: `<b>Motherboard exam.</b> No new code here: this map checks what you learned on the motherboard. Everything you unlocked is ready from the start, upgrades too. Each wave asks for one skill.
      <p>The path is longer and the bugs are tougher than on the first map, so plan your credits.</p>`,
    tasks: [
      { text: 'Build at least 2 cannons.', check: g => turretsOf(g, 'cannon').length >= 2, focus: g => buildFocus(g, 'cannon') },
      { text: 'Every cannon fires only when <code>motor.aimed(target)</code> is True.', check: g => cannonsAll(g, /if\s+[^\n]*motor\.aimed\(/), focus: g => ({ ents: turretSocks(g, 'cannon', t => !/motor\.aimed\(/.test(t.code)), code: /cannon\.fire\(/ }) },
    ],
    hint: 'The if goes right above cannon.fire(); cannon.fire() then gets 4 more spaces.',
    solution: `    motor.aim(target)
    if motor.aimed(target):
        cannon.fire()`,
  },
  {
    title: 'Exam: your own function',
    keeps: 'in_range',
    body: 'Write <code>in_range(target, max_dist)</code> again, from memory if you can, and use it in <b>every</b> cannon so they only shoot at close enemies.',
    tasks: [
      { text: 'Every cannon has <code>def in_range(...)</code> and uses it in an <code>if</code>.', check: g => cannonsAll(g, /def\s+in_range\s*\(/) && cannonsAll(g, /if\s+[^\n]*in_range\(/), focus: g => ({ ents: turretSocks(g, 'cannon', t => !/in_range\(/.test(t.code)), code: /^def update/ }),
        ghost: [{ before: /^def update\(/, text: 'def in_range(target, max_dist):' }, { after: /^def in_range\(/, text: '    return target.distance <= max_dist' }] },
    ],
    hint: 'def in_range(target, max_dist):  then 4 spaces in:  return target.distance <= max_dist',
    solution: `def in_range(target, max_dist):
    return target.distance <= max_dist`,
  },
  {
    title: 'Exam: pulse discipline',
    body: 'Mites come in swarms. Build a <b>Pulse</b> that only fires when at least 3 enemies are in range. A pulse that hits one enemy causes a surge!',
    tasks: [
      { text: 'Build a Pulse.', check: g => turretsOf(g, 'pulse').length > 0, focus: g => buildFocus(g, 'pulse') },
      { text: 'It fires only when 3 or more enemies are in range (count them or use <code>len(enemies)</code>).', check: g => anyCode(g, /(len\(\s*enemies\s*\)|count)\s*>=?\s*[2-9]/, 'pulse'), focus: g => ({ ents: turretSocks(g, 'pulse'), code: /pulse\.fire\(/ }) },
    ],
    hint: 'if len(enemies) >= 3:  then pulse.fire() indented under it.',
    solution: `    if len(enemies) >= 3:
        pulse.fire()`,
  },
  {
    title: 'Exam: power plan',
    body: 'More towers need more power. Get every PSU out of the red: build another PSU or upgrade one.',
    tasks: [{ text: 'No PSU needs more than it can give at peak (all frames green or yellow).', check: psusOk, focus: g => { g.updatePeaks(); return { ents: g.psus().filter(p => p.peakW > p.maxW).map(p => p.id), tools: ['psu'], info: ['psupeak'] }; } }],
    hint: 'One PSU runs about 3 busy turrets. An upgraded PSU (140 W) runs 4.',
    solution: 'No code: add a PSU near your towers or upgrade the busiest one.',
  },
  {
    title: 'Exam: steady laser',
    body: 'Armored beetles are coming. Build a <b>Laser</b> (it ignores armor) and make it save energy with <code>power.percent</code> or the <code>meter</code>.',
    tasks: [
      { text: 'Build a Laser.', check: g => turretsOf(g, 'laser').length > 0, focus: g => buildFocus(g, 'laser') },
      { text: 'The laser uses <code>power.percent</code> or <code>meter</code> to decide when to stop.', check: g => anyCode(g, /power\.percent|meter\.(net|trend)/, 'laser'), focus: g => ({ ents: turretSocks(g, 'laser'), code: /^import / }) },
    ],
    hint: 'Add power to the import line. if power.percent < 30: laser.stop() and return.',
    solution: `import radar, motor, laser, power
...
    if power.percent < 30:
        laser.stop()
        return`,
  },
  {
    title: 'Exam: beetles first',
    body: 'Make at least one cannon go after <b>beetles</b> first. Loop over the enemies and check <code>e.kind</code>.',
    tasks: [{ text: 'A cannon picks beetles first (<code>e.kind == "beetle"</code>).', check: g => anyCode(g, /\.kind\s*==\s*["']beetle["']/, 'cannon'), focus: g => ({ ents: turretSocks(g, 'cannon'), code: /enemies\[0\]/ }) }],
    hint: 'target = enemies[0], then for e in enemies: if e.kind == "beetle": target = e and break.',
    solution: `    target = enemies[0]
    for e in enemies:
        if e.kind == "beetle":
            target = e
            break`,
  },
  {
    title: 'Exam: lead the target',
    body: 'Fast worms dodge slow shells. Aim ahead of them with <code>motor.aim_at(x, y)</code>, or keep a count with a <code>global</code> variable.',
    tasks: [{ text: 'Use <code>motor.aim_at()</code> or a <code>global</code> variable in a turret.', check: g => anyCode(g, /\bglobal\b|aim_at\(/), focus: g => ({ ents: turretSocks(g, 'cannon'), code: /motor\.aim\(/ }) }],
    hint: 't = target.distance / 18, then aim at target.x + target.vx * t and target.y + target.vy * t.',
    solution: `    t = target.distance / 18
    motor.aim_at(target.x + target.vx * t, target.y + target.vy * t)`,
  },
  {
    title: 'Exam: final wave',
    body: 'The Rootkit is back, with friends. Use everything.',
    tasks: [{ text: 'Survive wave 8.', check: null }],
    hint: 'Lasers ignore armor and wear the shield down. Keep your PSUs out of the red.',
    solution: 'Mix lasers and cannons near the end of the path, and keep power in check.',
  },
];

const EXAM2_LESSONS = [
  {
    title: 'Exam: Library first',
    body: `<b>Graphics card exam.</b> Your own functions come along in your <b>📚 Library</b> (as many as your Library capacity allows). This map checks the Library skills: every turret should use it.`,
    tasks: [
      { text: 'Build at least 2 turrets.', check: g => turretsOf(g).filter(t => t.compiled).length >= 2, focus: g => buildFocus(g, 'cannon') },
      { text: 'Every turret uses <code>import lib</code>.', check: g => turretsOf(g).length >= 2 && libUsers(g).length === turretsOf(g).length, focus: g => ({ ents: turretSocks(g, null, t => !/\blib\b/.test(t.code)), code: /^import / }) },
    ],
    hint: 'Add lib to the import line of each turret, and call lib.pick_target(enemies).',
    solution: 'import radar, motor, cannon, lib',
  },
  {
    title: 'Exam: yes or no',
    body: 'Write a Library function that answers <code>True</code> or <code>False</code>, and use it in an <code>if</code> in a turret.',
    tasks: [{ text: 'A Library function returns True/False and a turret uses it in an <code>if</code>.', check: g => /return\s+(True|False|.*(==|!=|<|>|\bin\b|\bnot\b))/.test(libCode(g)) && anyCode(g, /if\s+(not\s+)?lib\.\w+\(/), focus: g => ({ dom: ['.lib-btn', '#btn-lib'] }) }],
    hint: 'def worth_pulsing(enemies): return len(enemies) >= 3',
    solution: `def worth_pulsing(enemies):
    return len(enemies) >= 3`,
  },
  {
    title: 'Exam: count with a dictionary',
    body: 'Keep count of something with a dictionary, for example shots per enemy kind, and print it.',
    tasks: [{ text: 'Use a dictionary (<code>{}</code>) and <code>print</code> in your code.', check: g => /=\s*\{\s*\}|=\s*dict\(/.test(allCode(g)) && /print\(/.test(allCode(g)) }],
    hint: 'kinds = {} outside update(); kinds[target.kind] = kinds.get(target.kind, 0) + 1',
    solution: `kinds = {}
...
    kinds[target.kind] = kinds.get(target.kind, 0) + 1
    print(kinds)`,
  },
  {
    title: 'Exam: sort it out',
    body: 'Use <code>sorted(..., key=...)</code> in your Library to pick a smarter target.',
    tasks: [{ text: 'Your Library uses <code>sorted(</code> with <code>key=</code>.', check: g => /sorted\([^)]*key\s*=/.test(libCode(g)), focus: g => ({ dom: ['.lib-btn', '#btn-lib'] }) }],
    hint: 'return sorted(enemies, key=lambda e: e.hp)[0] gives the weakest.',
    solution: `def pick_target(enemies):
    return sorted(enemies, key=lambda e: e.hp + e.shield)[-1]`,
  },
  {
    title: 'Exam: defaults',
    body: 'Give one Library function a parameter with a default value, and call it both with and without that value.',
    tasks: [{ text: 'A Library function has a default parameter (<code>def f(a, b=...)</code>).', check: g => /def\s+\w+\([^)]*=[^)]*\)/.test(libCode(g)) }],
    hint: 'def pick_target(enemies, prefer="beetle"):',
    solution: `def pick_target(enemies, prefer="beetle"):
    for e in enemies:
        if e.kind == prefer:
            return e
    return enemies[0]`,
  },
  {
    title: 'Exam: readable output',
    body: 'Print something useful with an f-string, only when something happens (so the console stays readable).',
    tasks: [{ text: 'A turret prints with an f-string.', check: g => turretsOf(g).some(t => t.compiled && /print\(\s*f["']/.test(t.code)) }],
    hint: 'if cannon.fire(): print(f"hit {target.kind}")',
    solution: `    if cannon.fire():
        print(f"shot {target.kind} at {target.distance:.1f}")`,
  },
  {
    title: 'Exam: three helpers',
    body: 'A good Library grows. Have at least 3 of your own functions in it.',
    tasks: [{ text: 'Your Library has 3 or more functions.', check: g => libDefs(g) >= 3, focus: g => ({ dom: ['.lib-btn', '#btn-lib'] }) }],
    hint: 'pick_target, worth_pulsing and in_range are a good set.',
    solution: 'Keep pick_target, add in_range(target, max_dist) and worth_pulsing(enemies).',
  },
  {
    title: 'Exam: final wave',
    body: 'A Rootkit and a flood of forkbombs. Use your Library everywhere.',
    tasks: [{ text: 'Survive wave 8.', check: null }],
    hint: 'A laser that prefers "rootkit" keeps the shield down; pulses clear the mites from forkbombs.',
    solution: 'lib.pick_target(enemies, "rootkit") on your lasers, pulses near the lane merge.',
  },
];

// ---------------------------------------------------------------------------
// Chapter 3: RAM (lists in depth, while, list comprehensions, modes, mem, Slow field, memory leaks)
// ---------------------------------------------------------------------------
const memWriters = g => turretsOf(g).filter(t => t.compiled && /mem\.write\(/.test(t.code)).length;
const memReaders = g => turretsOf(g).filter(t => t.compiled && /mem\.read\(/.test(t.code)).length;

const RAM_LESSONS = [
  {
    title: 'Lists that grow',
    body: `Welcome to the <b>RAM</b>: the computer's working memory. Here you learn to work with lists properly.
      <p>A list can grow while the program runs. <code>append</code> adds an item at the end:</p>
<pre>names = []                 # an empty list
names.append("bug")
names.append("worm")
print(names)               # ['bug', 'worm']
print(len(names))          # 2</pre>
      <p>Idea for your turret: collect the enemies you are allowed to shoot (for example only the close ones) in a new list, then pick from that list.</p>`,
    tasks: [
      { text: 'Build at least 2 turrets.', check: g => turretsOf(g).filter(t => t.compiled).length >= 2, focus: g => buildFocus(g, 'cannon') },
      { text: 'Use <code>.append(</code> in a turret or in your Library to build a list.', check: g => /\.append\(/.test(allCode(g)), focus: g => ({ ents: turretSocks(g), code: /enemies\s*=/ }) },
    ],
    hint: 'close = [] then for e in enemies: if e.distance < 2.5: close.append(e)',
    solution: `    close = []
    for e in enemies:
        if e.distance < 2.5:
            close.append(e)
    if len(close) == 0:
        return
    target = close[0]`,
  },
  {
    title: 'New: Slow field',
    body: `<b>New turret: Slow field.</b> It does no damage, but every enemy inside its circle moves slower, so your other turrets get more time to shoot.
      <ul><li><code>field.on()</code> and <code>field.off()</code> switch it.</li>
      <li><code>field.slow</code> (10 to 60) is how many percent slower.</li>
      <li>While on it uses <code>slow × 0.45</code> W, so switch it off when nothing is near.</li></ul>
      <p>Fast <b>worms</b> are coming: a field in front of your cannons helps a lot.</p>`,
    tasks: [
      { text: 'Build a <b>Slow field</b> next to your other turrets.', check: g => turretsOf(g, 'field').length > 0, focus: g => buildFocus(g, 'field') },
    ],
    hint: 'Put the field where the path passes your cannons. Its template already switches off when nothing is in range.',
    solution: 'No new code: the Slow field template turns on when enemies are in range and off when not.',
  },
  {
    title: 'Is it in the list?',
    body: `<code>in</code> asks "is this value one of the items in the list?" and answers True or False:
<pre>tough = ["beetle", "forkbomb"]
if "beetle" in tough:
    print("yes")         # prints yes</pre>
      <p>That makes rules short: <code>if e.kind in tough:</code> is true for beetles <i>and</i> forkbombs.</p>`,
    tasks: [
      { text: 'Use <code>in</code> inside an <code>if</code> to check a value against a list (for example enemy kinds).', check: g => /\bif\s+[^\n]*\s\bin\s+[\[\w]/.test(allCode(g)), focus: g => ({ ents: turretSocks(g, 'cannon'), code: /target\s*=/ }) },
    ],
    hint: 'for e in enemies: if e.kind in ["beetle", "forkbomb"]: target = e',
    solution: `    target = enemies[0]
    for e in enemies:
        if e.kind in ["beetle", "forkbomb"]:
            target = e
            break`,
  },
  {
    title: 'Shared memory: mem',
    body: `<b>New module: mem.</b> Until now every turret had its own memory. <code>mem</code> is one notebook that <b>all</b> turrets share (it needs a module slot):
<pre>import radar, mem
mem.write("danger", 5)          # one turret writes
x = mem.read("danger", 0)       # any turret reads it (0 if nothing written)</pre>
      <p>Idea: a turret near the start of the path writes how many enemies it sees, and a pulse near the core reads it to get ready.</p>`,
    tasks: [
      { text: 'One turret uses <code>mem.write(...)</code> and another one uses <code>mem.read(...)</code>.', check: g => memWriters(g) >= 1 && memReaders(g) >= 1 && turretsOf(g).filter(t => /mem\.(read|write)\(/.test(t.code)).length >= 2, focus: g => ({ ents: turretSocks(g), code: /^import / }) },
    ],
    hint: 'Add mem to the import lines. Writer: mem.write("seen", len(enemies)). Reader: if mem.read("seen", 0) >= 3: ...',
    solution: `# turret A
    mem.write("seen", len(enemies))
# turret B
    if mem.read("seen", 0) >= 3:
        pulse.fire()`,
  },
  {
    title: 'while loops',
    body: `A <code>for</code> loop walks through a list. A <code>while</code> loop repeats <b>as long as a condition is True</b>:
<pre>i = 0
while i < 3:
    print(i)       # 0, 1, 2
    i = i + 1      # without this line the loop never ends!</pre>
      <p>Careful: a loop that never ends uses up the socket's CPU lines (you'll see "CPU overrun"). Always change something the condition checks.</p>`,
    tasks: [
      { text: 'Use a <code>while</code> loop in a turret or in your Library.', check: g => /\bwhile\b/.test(allCode(g)), focus: g => ({ ents: turretSocks(g, 'cannon'), code: /target\s*=/ }) },
    ],
    hint: 'i = 0, then while i < len(enemies) and enemies[i].kind == "mite": i = i + 1 skips the mites at the front.',
    solution: `    i = 0
    while i < len(enemies) - 1 and enemies[i].kind == "mite":
        i = i + 1
    target = enemies[i]`,
  },
  {
    title: 'Memory leaks!',
    body: `<b>New enemy: memory leak.</b> It gains 10 % health <b>every second</b> it is alive (up to 3 times its starting health), so a leak you ignore becomes tough. Kill them first, while they are small.
      <p>Use what you know: pick leaks first (<code>e.kind == "leak"</code>), and slow them down so they don't reach the core.</p>`,
    tasks: [
      { text: 'A turret picks memory leaks first (<code>"leak"</code>).', check: g => /["']leak["']/.test(allCode(g)), focus: g => ({ ents: turretSocks(g, 'cannon'), code: /target\s*=/ }) },
    ],
    hint: 'for e in enemies: if e.kind == "leak": target = e and break.',
    solution: `    target = enemies[0]
    for e in enemies:
        if e.kind == "leak":
            target = e
            break`,
  },
  {
    title: 'List comprehensions',
    body: `Building a list with a loop is so common that Python has a short form for it, a <b>list comprehension</b>:
<pre>numbers = [1, 5, 8, 2]
big = [n for n in numbers if n > 4]     # [5, 8]
double = [n * 2 for n in numbers]       # [2, 10, 16, 4]</pre>
      <p>Read it as: "<i>n</i>, for every <i>n</i> in numbers, if <i>n</i> > 4". It does the same as the <code>append</code> loop from lesson 1, in one line.</p>`,
    tasks: [
      { text: 'Use a list comprehension (<code>[x for x in ... ]</code>).', check: g => /\[\s*[^\]\n]*\bfor\s+\w+\s+in\s+[^\]\n]+\]/.test(allCode(g)), focus: g => ({ ents: turretSocks(g), code: /\.append\(/ }) },
    ],
    hint: 'close = [e for e in enemies if e.distance < 2.5]',
    solution: `    close = [e for e in enemies if e.distance < 2.5]`,
  },
  {
    title: 'Modes',
    body: `Sometimes a turret should behave differently depending on the situation. Keep the situation in a variable, a <b>mode</b>:
<pre>mode = "save"                 # outside the functions: remembered

def update():
    global mode
    if power.percent > 80:
        mode = "attack"
    if power.percent < 30:
        mode = "save"
    if mode == "attack":
        ...</pre>
      <p>Using two thresholds (80 and 30) stops the turret from flipping back and forth every tick.</p>`,
    tasks: [
      { text: 'Use a mode: a string variable that your code compares, e.g. <code>mode == "attack"</code>.', check: g => /\b\w+\s*==\s*["'](attack|save|hunt|calm|defend|idle|charge|\w+)["']/.test(allCode(g)) && /\bglobal\s+\w+/.test(allCode(g)), focus: g => ({ ents: turretSocks(g), code: /^def update/ }) },
    ],
    hint: 'mode = "save" at the top, global mode inside update(), switch it with two different power levels.',
    solution: `mode = "save"

def update():
    global mode
    if power.percent > 80:
        mode = "attack"
    if power.percent < 30:
        mode = "save"`,
  },
  {
    title: 'Slices',
    body: `A <b>slice</b> takes a part of a list: <code>list[start:end]</code> (the end is not included):
<pre>letters = ["a", "b", "c", "d", "e"]
letters[:2]      # ['a', 'b']        the first two
letters[1:3]     # ['b', 'c']
letters[-2:]     # ['d', 'e']        the last two</pre>
      <p>Idea: <code>enemies[:3]</code> is "the 3 closest to the core". A pulse could look only at those.</p>`,
    tasks: [
      { text: 'Use a slice (<code>list[a:b]</code>) somewhere in your code.', check: g => /\w\s*\[\s*-?\d*\s*:\s*-?\d*\s*\]/.test(allCode(g)), focus: g => ({ ents: turretSocks(g), code: /enemies/ }) },
    ],
    hint: 'front = enemies[:3] gives at most the first three (no error if there are fewer).',
    solution: `    front = enemies[:3]`,
  },
  {
    title: 'Final: Stack overflow',
    body: `The <b>Stack overflow</b> boss: huge, slowly growing, and when it bursts it releases 4 memory leaks. Slow it, focus it, and be ready for the leaks.`,
    tasks: [{ text: 'Survive wave 10.', check: null }],
    hint: 'A Slow field near the end of the path plus lasers (no armor problems) wear it down. Keep pulses for the leaks it drops.',
    solution: 'Fields at the last bend, lasers that prefer "overflow", pulses for the leaks.',
  },
];

const EXAM3_LESSONS = [
  {
    title: 'Exam: lists',
    body: '<b>RAM exam.</b> Everything from chapter 3, one skill per wave. Build up and use <code>append</code>.',
    tasks: [
      { text: 'Build at least 3 turrets.', check: g => turretsOf(g).filter(t => t.compiled).length >= 3, focus: g => buildFocus(g, 'cannon') },
      { text: 'Use <code>.append(</code>.', check: g => /\.append\(/.test(allCode(g)) },
    ],
    hint: 'close = [] and close.append(e) inside a for loop.',
    solution: `    close = []
    for e in enemies:
        if e.distance < 2.5:
            close.append(e)`,
  },
  {
    title: 'Exam: freeze them',
    body: 'Build a Slow field and make sure it switches <b>off</b> when nothing is in range, so it doesn\'t waste power.',
    tasks: [{ text: 'A Slow field uses both <code>field.on()</code> and <code>field.off()</code>.', check: g => anyCode(g, /field\.on\(/, 'field') && anyCode(g, /field\.off\(/, 'field'), focus: g => buildFocus(g, 'field') }],
    hint: 'if len(enemies) > 0: field.on() else: field.off()',
    solution: `    if len(enemies) > 0:
        field.on()
    else:
        field.off()`,
  },
  {
    title: 'Exam: membership',
    body: 'Use <code>in</code> with a list to pick the dangerous kinds first.',
    tasks: [{ text: 'An <code>if</code> uses <code>in</code> with a list.', check: g => /\bif\s+[^\n]*\s\bin\s+[\[\w]/.test(allCode(g)) }],
    hint: 'if e.kind in ["leak", "beetle"]:',
    solution: `    for e in enemies:
        if e.kind in ["leak", "beetle"]:
            target = e
            break`,
  },
  {
    title: 'Exam: team memory',
    body: 'Two turrets work together through <code>mem</code>: one writes, the other reads.',
    tasks: [{ text: 'One turret writes with <code>mem.write</code>, another reads with <code>mem.read</code>.', check: g => memWriters(g) >= 1 && memReaders(g) >= 1 && turretsOf(g).filter(t => /mem\.(read|write)\(/.test(t.code)).length >= 2 }],
    hint: 'Writer: mem.write("seen", len(enemies)). Reader: mem.read("seen", 0).',
    solution: `mem.write("seen", len(enemies))   # turret A
mem.read("seen", 0)                # turret B`,
  },
  {
    title: 'Exam: while',
    body: 'Use a <code>while</code> loop (and make sure it always ends).',
    tasks: [{ text: 'Use <code>while</code>.', check: g => /\bwhile\b/.test(allCode(g)) }],
    hint: 'i = 0; while i < len(enemies) and ...: i = i + 1',
    solution: `    i = 0
    while i < len(enemies) - 1 and enemies[i].kind == "mite":
        i = i + 1`,
  },
  {
    title: 'Exam: comprehension',
    body: 'Write a list comprehension that keeps only the enemies you care about.',
    tasks: [{ text: 'Use a list comprehension.', check: g => /\[\s*[^\]\n]*\bfor\s+\w+\s+in\s+[^\]\n]+\]/.test(allCode(g)) }],
    hint: 'leaks = [e for e in enemies if e.kind == "leak"]',
    solution: `    leaks = [e for e in enemies if e.kind == "leak"]`,
  },
  {
    title: 'Exam: modes',
    body: 'Give one turret two modes and switch between them.',
    tasks: [{ text: 'Use a mode variable (a string you compare with <code>==</code>, kept with <code>global</code>).', check: g => /\b\w+\s*==\s*["']\w+["']/.test(allCode(g)) && /\bglobal\s+\w+/.test(allCode(g)) }],
    hint: 'mode = "save"; in update(): global mode, then change it with two different thresholds.',
    solution: `mode = "save"

def update():
    global mode
    if power.percent > 80:
        mode = "attack"
    if power.percent < 30:
        mode = "save"`,
  },
  {
    title: 'Exam: final wave',
    body: 'A Stack overflow and a Rootkit at once. Use everything from the RAM.',
    tasks: [{ text: 'Survive wave 8.', check: null }],
    hint: 'Slow the bosses, laser them, and keep pulses for the leaks.',
    solution: 'Fields at the merge, lasers on the bosses, pulses for leaks.',
  },
];

// ---------------------------------------------------------------------------
// Chapter 4: Network card (net messages, Arc turret, classes and objects, routers/packets)
// ---------------------------------------------------------------------------
const netSenders = g => turretsOf(g).filter(t => t.compiled && /net\.send\(/.test(t.code)).length;
const netReceivers = g => turretsOf(g).filter(t => t.compiled && /net\.receive\(/.test(t.code)).length;
const classNames = g => [...allCode(g).matchAll(/^\s*class\s+(\w+)/gm)].map(m => m[1]);
const usesObjects = g => classNames(g).some(n => new RegExp(`(^|[^\\w])${n}\\(`, 'm').test(allCode(g).replace(new RegExp(`class\\s+${n}`, 'g'), '')));

const NET_LESSONS = [
  {
    title: 'Three lanes',
    body: `Welcome to the <b>network card</b>. Traffic comes in on <b>three lanes</b> that meet in the middle before the core.
      <p>The meeting point is the most valuable spot: towers there cover all three lanes. But enemies only meet there late, so you also want something earlier on.</p>`,
    tasks: [{ text: 'Build at least 3 turrets.', check: g => turretsOf(g).filter(t => t.compiled).length >= 3, focus: g => buildFocus(g, 'cannon') }],
    hint: 'Put the first towers around the point where the three lanes meet.',
    solution: 'No code: build near the junction in the middle.',
  },
  {
    title: 'Messages: net',
    body: `<b>New module: net.</b> <code>mem</code> is a notebook; <code>net</code> is a <b>radio</b>. A turret sends a message on a channel, and every turret listening on that channel gets it in the next tick:
<pre>import radar, net
net.send("boss", 1)            # one turret calls out
calls = net.receive("boss")    # others get a list: [1] (or [] if nobody sent)</pre>
      <p>Messages last one tick only, so they are perfect for "right now" news like "a router is coming!".</p>`,
    tasks: [{ text: 'One turret uses <code>net.send(...)</code> and another one uses <code>net.receive(...)</code>.', check: g => netSenders(g) >= 1 && netReceivers(g) >= 1 && turretsOf(g).filter(t => /net\.(send|receive)\(/.test(t.code)).length >= 2, focus: g => ({ ents: turretSocks(g), code: /^import / }) }],
    hint: 'Add net to the import lines (it needs a module slot). Sender: net.send("seen", len(enemies)). Receiver: if len(net.receive("seen")) > 0: ...',
    solution: `# turret A
    net.send("seen", len(enemies))
# turret B
    news = net.receive("seen")
    if len(news) > 0 and max(news) >= 3:
        pulse.fire()`,
  },
  {
    title: 'New: Arc turret',
    body: `<b>New turret: Arc.</b> Lightning hits your target, then <b>jumps</b> to nearby enemies (up to <code>arc.jumps</code> times, each jump a bit weaker). It needs no aiming.
      <p>Energy per shot: <code>damage × (1 + jumps) × 0.9</code> J, so more jumps cost more.</p>`,
    tasks: [{ text: 'Build an <b>Arc</b>.', check: g => turretsOf(g, 'arc').length > 0, focus: g => buildFocus(g, 'arc') }],
    hint: 'Arcs are best where enemies bunch up: at the lane junction.',
    solution: 'The Arc template already fires at the nearest enemy to the core.',
  },
  {
    title: 'Classes: your own type',
    body: `So far you used objects others made: every enemy is an object with <code>.hp</code>, <code>.kind</code>... A <b>class</b> lets you make your own kind of object:
<pre>class Counter:
    def __init__(self, start):
        self.value = start        # every Counter remembers its own value

c = Counter(10)                   # make one
print(c.value)                    # 10</pre>
      <ul><li><code>class Name:</code> starts the recipe (names of classes start with a capital letter).</li>
      <li><code>__init__</code> runs when you make one, <code>self</code> is "this object".</li>
      <li><code>self.value = ...</code> stores a value <b>inside</b> the object.</li></ul>`,
    tasks: [{ text: 'Write a class with an <code>__init__(self, ...)</code> (in a turret or your Library).', check: g => /^\s*class\s+\w+/m.test(allCode(g)) && /def\s+__init__\s*\(\s*self/.test(allCode(g)), focus: g => ({ ents: turretSocks(g), code: /^def update/ }),
      ghost: [{ before: /^def update\(/, text: 'class Counter:' }, { after: /^class Counter/, text: '    def __init__(self, start):' }, { after: /def __init__\(self, start\)/, text: '        self.value = start' }] }],
    hint: 'class Counter:  then (4 spaces)  def __init__(self, start):  then (8 spaces)  self.value = start',
    solution: `class Counter:
    def __init__(self, start):
        self.value = start`,
  },
  {
    title: 'Methods',
    body: `Functions inside a class are called <b>methods</b>. They always get <code>self</code> first, so they can use the object's own values:
<pre>class Counter:
    def __init__(self, start):
        self.value = start
    def add(self, n):
        self.value = self.value + n

c = Counter(0)
c.add(5)
print(c.value)      # 5</pre>
      <p>That's exactly how <code>motor.aim(target)</code> works: <code>motor</code> is an object, <code>aim</code> is a method, and Python passes <code>motor</code> as <code>self</code>.</p>`,
    tasks: [{ text: 'Give your class a method besides <code>__init__</code> (it takes <code>self</code> first).', check: g => /def\s+(?!__init__)\w+\s*\(\s*self\b/.test(allCode(g)), focus: g => ({ ents: turretSocks(g), code: /^class / }) }],
    hint: 'Inside the class, 4 spaces in: def add(self, n): and 8 spaces in: self.value = self.value + n',
    solution: `    def add(self, n):
        self.value = self.value + n`,
  },
  {
    title: 'Routers and packets',
    body: `<b>New enemies.</b> A <b>router</b> (armor 2) sends out <b>3 packets</b> when destroyed. Packets are very fast but weak.
      <p>Perfect for the Arc: raise <code>arc.jumps</code> so one shot clears a whole burst of packets.</p>`,
    tasks: [{ text: 'Set <code>arc.jumps</code> to 3 or more on an Arc.', check: g => turretsOf(g, 'arc').some(t => t.compiled && t.cfg.jumps >= 3), focus: g => ({ ents: turretSocks(g, 'arc'), code: /arc\.jumps/ }), ghost: [{ change: /^\s*arc\.jumps\s*=/, text: '    arc.jumps = 3' }] }],
    hint: 'In setup(): arc.jumps = 3. Check the Power tab: more jumps cost more energy per shot.',
    solution: `    arc.jumps = 3`,
  },
  {
    title: 'Objects in a list',
    body: `You can make as many objects from a class as you like, and keep them in a list:
<pre>class Note:
    def __init__(self, kind, hp):
        self.kind = kind
        self.hp = hp

notes = []
for e in enemies:
    notes.append(Note(e.kind, e.hp))</pre>
      <p>Each <code>Note(...)</code> is a separate object with its own values.</p>`,
    tasks: [{ text: 'Create objects from your own class (call <code>YourClass(...)</code>).', check: usesObjects, focus: g => ({ ents: turretSocks(g), code: /^class / }) }],
    hint: 'Somewhere in update() or another function: x = YourClassName(...)',
    solution: `    notes = [Note(e.kind, e.hp) for e in enemies]`,
  },
  {
    title: 'A protocol',
    body: `Teams agree on what their messages look like: a <b>protocol</b>. A dictionary makes a clear message:
<pre>net.send("target", {"id": target.id, "kind": target.kind})
for msg in net.receive("target"):
    print(msg["kind"])</pre>`,
    tasks: [{ text: 'Send a dictionary with <code>net.send(..., {...})</code>.', check: g => /net\.send\([^)]*\{/.test(allCode(g)), focus: g => ({ ents: turretSocks(g), code: /net\.send/ }) }],
    hint: 'net.send("target", {"id": target.id, "hp": target.hp})',
    solution: `    net.send("target", {"id": target.id, "hp": target.hp})`,
  },
  {
    title: 'Objects that remember',
    body: `An object made <b>outside</b> the functions lives for the whole game, just like a global variable, but it can hold many values and methods together:
<pre>class Stats:
    def __init__(self):
        self.shots = 0
    def shot(self):
        self.shots = self.shots + 1

stats = Stats()            # made once, at the top

def update():
    ...
    if cannon.fire():
        stats.shot()       # no "global" needed to change what's inside</pre>`,
    tasks: [{ text: 'Make an object at the top of a program (outside the functions), e.g. <code>stats = Stats()</code>.', check: g => /^\w+\s*=\s*[A-Z]\w*\(/m.test(allCode(g)), focus: g => ({ ents: turretSocks(g), code: /^def update/ }) }],
    hint: 'Under your class (no spaces in front): stats = Stats()',
    solution: `stats = Stats()`,
  },
  {
    title: 'Final: denial of service',
    body: 'A Rootkit leads a flood of routers and packets down all three lanes. Use everything: arcs at the junction, messages between turrets, and your own classes.',
    tasks: [{ text: 'Survive wave 10.', check: null }],
    hint: 'Lasers on the Rootkit, Arcs with 3+ jumps for the packet bursts.',
    solution: 'Arcs at the junction, lasers that prefer "rootkit", net messages to warn about the boss.',
  },
];

const EXAM4_LESSONS = [
  {
    title: 'Exam: radio check',
    body: '<b>Network exam.</b> One skill per wave. Start with turrets that talk to each other.',
    tasks: [
      { text: 'Build at least 3 turrets.', check: g => turretsOf(g).filter(t => t.compiled).length >= 3, focus: g => buildFocus(g, 'cannon') },
      { text: 'One turret sends with <code>net.send</code>, another receives with <code>net.receive</code>.', check: g => netSenders(g) >= 1 && netReceivers(g) >= 1 && turretsOf(g).filter(t => /net\.(send|receive)\(/.test(t.code)).length >= 2 },
    ],
    hint: 'Add net to both import lines.',
    solution: `net.send("seen", len(enemies))      # turret A
net.receive("seen")                  # turret B`,
  },
  {
    title: 'Exam: chain lightning',
    body: 'Packets come in bursts. Build an Arc with 3 or more jumps.',
    tasks: [{ text: 'An Arc with <code>arc.jumps</code> of 3 or more.', check: g => turretsOf(g, 'arc').some(t => t.compiled && t.cfg.jumps >= 3), focus: g => buildFocus(g, 'arc') }],
    hint: 'arc.jumps = 3 in setup().',
    solution: '    arc.jumps = 3',
  },
  {
    title: 'Exam: a class',
    body: 'Write a class with <code>__init__</code>.',
    tasks: [{ text: 'A class with <code>__init__(self, ...)</code>.', check: g => /^\s*class\s+\w+/m.test(allCode(g)) && /def\s+__init__\s*\(\s*self/.test(allCode(g)) }],
    hint: 'class Counter: / def __init__(self, start): / self.value = start',
    solution: `class Counter:
    def __init__(self, start):
        self.value = start`,
  },
  {
    title: 'Exam: a method',
    body: 'Give the class a method of its own.',
    tasks: [{ text: 'A method besides <code>__init__</code>.', check: g => /def\s+(?!__init__)\w+\s*\(\s*self\b/.test(allCode(g)) }],
    hint: 'def add(self, n): self.value = self.value + n',
    solution: `    def add(self, n):
        self.value = self.value + n`,
  },
  {
    title: 'Exam: many objects',
    body: 'Create objects from your class.',
    tasks: [{ text: 'Call your class to create objects.', check: usesObjects }],
    hint: 'notes = [Note(e.kind, e.hp) for e in enemies]',
    solution: '    notes = [Note(e.kind, e.hp) for e in enemies]',
  },
  {
    title: 'Exam: protocol',
    body: 'Send a dictionary as a message.',
    tasks: [{ text: 'Use <code>net.send(..., {...})</code>.', check: g => /net\.send\([^)]*\{/.test(allCode(g)) }],
    hint: 'net.send("target", {"id": target.id, "kind": target.kind})',
    solution: '    net.send("target", {"id": target.id, "kind": target.kind})',
  },
  {
    title: 'Exam: long-lived object',
    body: 'Keep an object alive for the whole game: make it outside the functions.',
    tasks: [{ text: 'An object created at the top of a program.', check: g => /^\w+\s*=\s*[A-Z]\w*\(/m.test(allCode(g)) }],
    hint: 'stats = Stats() (no spaces in front)',
    solution: 'stats = Stats()',
  },
  {
    title: 'Exam: final wave',
    body: 'Two Rootkits and a storm of routers. Everything you have.',
    tasks: [{ text: 'Survive wave 8.', check: null }],
    hint: 'Split your lasers between the lanes; arcs where lanes meet.',
    solution: 'Lasers on each boss lane, arcs at the merges, net to call out the bosses.',
  },
];

// ---- chapter 5: CPU (algorithms, errors, efficiency) -------------------------------
const schedUsers = g => turretsOf(g).filter(t => t.compiled && /sched\.(every|spare|tick)/.test(t.code)).length;
const usesTry = g => /^\s*try\s*:/m.test(allCode(g)) && /^\s*except\b[^\n]*:/m.test(allCode(g));
const usesKeySort = g => /(sorted\(|\.sort\()[^\n]*key\s*=/.test(allCode(g));
const usesCounting = g => /\w+\[[^\]\n]+\]\s*=\s*\w+\.get\([^\n]*\)\s*\+\s*1|\w+\[[^\]\n]+\]\s*\+=\s*1/.test(allCode(g));
const usesTuple = g => /^\s*return\s+[^\n#,]+,\s*[^\n#]+/m.test(allCode(g)) && /^\s*\w+\s*,\s*\w+\s*=\s*\w+\(/m.test(allCode(g));

const CPU_LESSONS = [
  {
    title: 'The CPU',
    body: `Welcome to the <b>CPU</b>, the heart of the computer and the last chapter. Two lanes come in and merge before the core.
      <p>Everything you learned is allowed here. This chapter is about writing code that is <b>smart</b>: it handles errors, sorts, counts and saves CPU time.</p>`,
    tasks: [{ text: 'Build at least 3 turrets.', check: g => turretsOf(g).filter(t => t.compiled).length >= 3, focus: g => buildFocus(g, 'cannon') }],
    hint: 'The merge point covers both lanes. Put a tower or two before it as well.',
    solution: 'No code: build around the merge point.',
  },
  {
    title: 'Polymorphic virus',
    body: `<b>New enemy: polymorphic virus.</b> It changes its form every 3 seconds:
      <ul><li><b>fast form</b>: speed 1.4, <code>armor</code> 0</li><li><b>armored form</b>: slow, <code>armor</code> 8 (every cannon or arc hit does 8 less)</li></ul>
      <p>Your radar sees the current form: <code>target.armor</code>. Shoot the soft ones first:</p>
<pre>soft = [e for e in enemies if e.armor &lt; 5]
if len(soft) &gt; 0:
    target = radar.first(soft)
else:
    target = radar.first(enemies)</pre>
      <p>Lasers ignore armor completely, so they are good against the armored form.</p>`,
    tasks: [{ text: 'A turret checks <code>.armor</code> to choose its target.', check: g => anyCode(g, /\.armor\b/), focus: g => ({ ents: turretSocks(g), code: /^def update/ }) }],
    hint: 'Make a list of enemies with e.armor < 5 and aim at the first of those, if there are any.',
    solution: `    soft = [e for e in enemies if e.armor < 5]
    if len(soft) > 0:
        target = radar.first(soft)
    else:
        target = radar.first(enemies)`,
  },
  {
    title: 'Errors: try / except',
    body: `When a line of <code>update()</code> causes an <b>error</b>, the rest of <code>update()</code> is skipped for that tick: the turret does nothing. For example, <code>enemies[0]</code> fails when the list is empty.
      <p>With <code>try</code> / <code>except</code> you catch the error and decide what happens instead:</p>
<pre>try:
    target = enemies[0]           # may fail
    motor.aim(target)
except IndexError:                # only runs if that error happened
    print("nothing to aim at")</pre>
      <p>Catch the error you expect (<code>IndexError</code>, <code>KeyError</code>, <code>TypeError</code>...), not every error: a typo should still show up in the console.</p>`,
    tasks: [{ text: 'Use <code>try:</code> with an <code>except ...:</code> block.', check: usesTry, focus: g => ({ ents: turretSocks(g), code: /^def update/ }),
      ghost: [{ after: /^def update\(/, text: '    try:' }, { after: /^    try:/, text: '        target = enemies[0]' }, { after: /target = enemies\[0\]/, text: '    except IndexError:' }] }],
    hint: 'try: (4 spaces deeper) the risky line, then except IndexError: (same depth as try) and what to do instead.',
    solution: `    try:
        target = enemies[0]
        motor.aim(target)
    except IndexError:
        return`,
  },
  {
    title: 'New module: sched',
    body: `<b>New module: sched</b> (scheduler). Not everything has to run every tick (10 times a second). Heavy work can run less often:
<pre>import radar, sched
plan = []

def update():
    global plan
    if sched.every(5):            # True on every 5th tick
        plan = radar.scan()       # the heavy part, twice a second
    ...                           # use plan the other ticks</pre>
      <p>Each executed line costs CPU time and 2 mJ of energy, so a turret that thinks less often has more energy left for shooting. Needs a module slot.</p>`,
    tasks: [{ text: 'A turret uses <code>sched.every(...)</code>.', check: g => anyCode(g, /sched\.every\(/), focus: g => ({ ents: turretSocks(g), code: /^import / }) }],
    hint: 'Add sched to the import line, then wrap the heavy part in if sched.every(5):',
    solution: `import radar, motor, cannon, sched
plan = []

def update():
    global plan
    if sched.every(5):
        plan = radar.scan()`,
  },
  {
    title: 'Sorting with a key',
    body: `<code>sorted(list, key=...)</code> gives a new list in order. The <b>key</b> says what to sort by. A <code>lambda</code> is a tiny one-line function:
<pre>by_hp = sorted(enemies, key=lambda e: e.hp)          # weakest first
by_hp = sorted(enemies, key=lambda e: e.hp, reverse=True)   # strongest first
enemies.sort(key=lambda e: e.distance)               # sorts the list itself</pre>
      <p><code>lambda e: e.hp</code> means "give me e, I give back e.hp". The same works for <code>min()</code> and <code>max()</code>: <code>min(enemies, key=lambda e: e.distance)</code>.</p>`,
    tasks: [{ text: 'Sort a list with <code>key=</code> (<code>sorted(...)</code> or <code>.sort(...)</code>).', check: usesKeySort, focus: g => ({ ents: turretSocks(g), code: /^def update/ }) }],
    hint: 'order = sorted(enemies, key=lambda e: e.hp), then target = order[0]',
    solution: `    order = sorted(enemies, key=lambda e: e.hp)
    target = order[0]`,
  },
  {
    title: 'Counting with a dictionary',
    body: `A <b>dictionary</b> stores values under names. It is perfect for counting:
<pre>kinds = {}
for e in enemies:
    kinds[e.kind] = kinds.get(e.kind, 0) + 1
# kinds is now e.g. {"poly": 3, "bug": 5}
if kinds.get("poly", 0) &gt;= 3:
    print("virus swarm!")</pre>
      <p><code>kinds.get(name, 0)</code> reads a value, or 0 if it is not there yet (no <code>KeyError</code>).</p>`,
    tasks: [{ text: 'Count something in a dictionary (<code>d[key] = d.get(key, 0) + 1</code>).', check: usesCounting, focus: g => ({ ents: turretSocks(g), code: /^def update/ }) }],
    hint: 'kinds = {} before the loop, then kinds[e.kind] = kinds.get(e.kind, 0) + 1 inside it.',
    solution: `    kinds = {}
    for e in enemies:
        kinds[e.kind] = kinds.get(e.kind, 0) + 1`,
  },
  {
    title: 'Stop early: break',
    body: `Searching does not have to look at every enemy. <code>break</code> leaves the loop as soon as you found what you need:
<pre>target = None
for e in enemies:              # enemies are sorted: closest to the core first
    if e.armor &lt; 5:
        target = e
        break                  # found one: stop looking</pre>
      <p>Fewer loop rounds = fewer CPU lines = more energy for shooting.</p>`,
    tasks: [{ text: 'Use <code>break</code> inside a loop.', check: g => /^\s+break\s*$/m.test(allCode(g)), focus: g => ({ ents: turretSocks(g), code: /^def update/ }) }],
    hint: 'for e in enemies: if (condition): target = e and then break',
    solution: `    target = None
    for e in enemies:
        if e.armor < 5:
            target = e
            break`,
  },
  {
    title: 'How much CPU is left?',
    body: `<code>sched.spare()</code> tells how many CPU lines your turret may still use in this tick. Use it to do optional work only when there is time:
<pre>if sched.spare() &gt; 40:
    kinds = {}
    for e in enemies:
        kinds[e.kind] = kinds.get(e.kind, 0) + 1</pre>
      <p>If code runs longer than the socket allows, the tick is cut short (<i>CPU overrun</i>). Upgrading a socket gives more CPU lines.</p>`,
    tasks: [{ text: 'A turret checks <code>sched.spare()</code>.', check: g => anyCode(g, /sched\.spare\(\)/), focus: g => ({ ents: turretSocks(g), code: /^def update/ }) }],
    hint: 'if sched.spare() > 40: then the optional work.',
    solution: `    if sched.spare() > 40:
        print(len(enemies), "enemies")`,
  },
  {
    title: 'Two answers at once',
    body: `A function can <b>return two values</b> at once, separated by a comma. You unpack them the same way:
<pre>def pick(enemies):
    soft = [e for e in enemies if e.armor &lt; 5]
    if len(soft) &gt; 0:
        return soft[0], "soft"
    return enemies[0], "armored"

target, why = pick(enemies)
print("shooting", why)</pre>
      <p>Put such helpers in your <b>Library</b> so every turret can use them.</p>`,
    tasks: [{ text: 'A function returns two values and you unpack them: <code>a, b = f(...)</code>.', check: usesTuple, focus: g => ({ ents: turretSocks(g), code: /^def update/ }) }],
    hint: 'return x, y  in the function, and  a, b = function(...)  where you call it.',
    solution: `def pick(enemies):
    soft = [e for e in enemies if e.armor < 5]
    if len(soft) > 0:
        return soft[0], "soft"
    return enemies[0], "armored"

    target, why = pick(enemies)`,
  },
  {
    title: 'Final: kernel panic',
    body: `<b>Boss: Kernel panic.</b> A huge chip with armor 4 and a shield that comes back after 2 seconds without damage. Every 6 seconds it calls in a polymorphic virus, and when it breaks it bursts into 4 more.
      <p>Keep constant pressure on the shield, and keep some turrets free for the viruses it brings.</p>`,
    tasks: [{ text: 'Have at least 6 turrets ready.', check: g => turretsOf(g).filter(t => t.compiled).length >= 6, focus: g => buildFocus(g, 'laser') }],
    hint: 'Lasers ignore armor and keep the shield down; arcs and pulses clean up the viruses.',
    solution: 'Several lasers near the merge point, plus arcs or pulses for the viruses.',
  },
];

const EXAM5_LESSONS = [
  {
    title: 'Exam: three ways in',
    body: '<b>Final exam.</b> Enemies come from the left, the right and below. One skill per wave.',
    tasks: [{ text: 'Build at least 3 turrets.', check: g => turretsOf(g).filter(t => t.compiled).length >= 3, focus: g => buildFocus(g, 'cannon') }],
    hint: 'Each lane needs something. The core sits in the middle.',
    solution: 'No code: cover all three lanes near the core.',
  },
  {
    title: 'Exam: shape shifters',
    body: 'Viruses change form. Choose targets by armor.',
    tasks: [{ text: 'A turret checks <code>.armor</code>.', check: g => anyCode(g, /\.armor\b/) }],
    hint: 'soft = [e for e in enemies if e.armor < 5]',
    solution: '    soft = [e for e in enemies if e.armor < 5]',
  },
  {
    title: 'Exam: safe code',
    body: 'Catch an error with try / except.',
    tasks: [{ text: 'Use <code>try:</code> and <code>except ...:</code>.', check: usesTry }],
    hint: 'try: risky line / except IndexError: what to do instead',
    solution: `    try:
        target = enemies[0]
    except IndexError:
        return`,
  },
  {
    title: 'Exam: think less often',
    body: 'Use the scheduler in two turrets.',
    tasks: [{ text: 'Two turrets use <code>sched</code>.', check: g => schedUsers(g) >= 2 }],
    hint: 'import sched, then if sched.every(5): in update().',
    solution: '    if sched.every(5):',
  },
  {
    title: 'Exam: order',
    body: 'Sort with a key.',
    tasks: [{ text: '<code>sorted(..., key=...)</code> or <code>.sort(key=...)</code>.', check: usesKeySort }],
    hint: 'sorted(enemies, key=lambda e: e.hp)',
    solution: '    order = sorted(enemies, key=lambda e: e.hp)',
  },
  {
    title: 'Exam: count',
    body: 'Count enemies by kind in a dictionary.',
    tasks: [{ text: '<code>d[key] = d.get(key, 0) + 1</code>.', check: usesCounting }],
    hint: 'kinds[e.kind] = kinds.get(e.kind, 0) + 1',
    solution: `    kinds = {}
    for e in enemies:
        kinds[e.kind] = kinds.get(e.kind, 0) + 1`,
  },
  {
    title: 'Exam: everything together',
    body: 'Every enemy type you have met is in this wave. Use all your tools.',
    tasks: [{ text: 'Have at least 8 turrets ready.', check: g => turretsOf(g).filter(t => t.compiled).length >= 8, focus: g => buildFocus(g, 'laser') }],
    hint: 'Upgrade overloaded PSUs, and use Slow fields where lanes are long.',
    solution: 'Spread turrets over all three lanes; lasers for armor, arcs for swarms.',
  },
  {
    title: 'Exam: kernel panic',
    body: '<b>The final boss.</b> Shield, armor, and a stream of viruses. Show what you have learned.',
    tasks: [{ text: 'Have at least 10 turrets ready.', check: g => turretsOf(g).filter(t => t.compiled).length >= 10, focus: g => buildFocus(g, 'laser') }],
    hint: 'Keep damage on the boss all the time so its shield cannot come back.',
    solution: 'Lasers on the boss lane, arcs and pulses for the viruses it brings.',
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
    id: 'motherboard', name: 'Motherboard', num: 1, label: '1A',
    desc: 'Learn the basics: functions, if, loops, power and targeting.',
    paths: [PATH], core: CORE, start: START, waves: WAVES, lessons: LESSONS,
    hpBase: 1, hpGrowth: WAVE_HP_GROWTH, bonus: WAVE_BONUS,
    unlock: { cannon: 1, pulse: 7, laser: 9, upgrades: 6 }, library: false, starter: MOTHERBOARD_STARTER,
    // ★★★ code goal (checked when the map is cleared)
    goal: { text: 'Every cannon uses your <code>in_range</code> function, and no pulse ever surged', check: g => turretsOf(g, 'cannon').length > 0 && turretsOf(g, 'cannon').every(t => /in_range\(/.test(t.code)) && !g.stats.surges },
  },
  {
    id: 'motherboard-x', name: 'Motherboard · Overclock', num: 2, label: '1B',
    desc: 'Exam for chapter 1: a longer path, tougher bugs, one skill per wave.',
    paths: [[[-0.6, 8.5], [3.5, 8.5], [3.5, 2.5], [8.5, 2.5], [8.5, 8.5], [12.5, 8.5], [12.5, 2.5], [15.6, 2.5]]],
    core: { c: 15, r: 1, w: 3, h: 3 },
    start: { credits: 300, core: 20 },
    waves: [
      [{ t: 'bug', n: 12, gap: 0.8 }, { t: 'worm', n: 4, gap: 1, delay: 2 }],
      [{ t: 'worm', n: 12, gap: 0.6 }, { t: 'bug', n: 10, gap: 0.8, delay: 1 }],
      [{ t: 'mite', n: 30, gap: 0.2 }, { t: 'bug', n: 8, gap: 0.9, delay: 1 }],
      [{ t: 'bug', n: 16, gap: 0.5 }, { t: 'beetle', n: 4, gap: 2, delay: 1 }, { t: 'worm', n: 10, gap: 0.5, delay: 1 }],
      [{ t: 'beetle', n: 8, gap: 1.6 }, { t: 'bug', n: 12, gap: 0.6, delay: 1 }],
      [{ t: 'beetle', n: 10, gap: 1.3 }, { t: 'worm', n: 14, gap: 0.4, delay: 1 }, { t: 'mite', n: 20, gap: 0.18, delay: 1 }],
      [{ t: 'worm', n: 26, gap: 0.3 }, { t: 'beetle', n: 8, gap: 1.4, delay: 1 }, { t: 'mite', n: 24, gap: 0.15, delay: 1 }],
      [{ t: 'bug', n: 14, gap: 0.5 }, { t: 'rootkit', n: 1, gap: 1, delay: 2 }, { t: 'beetle', n: 10, gap: 1.2, delay: 3 }, { t: 'mite', n: 36, gap: 0.13, delay: 2 }, { t: 'worm', n: 18, gap: 0.35, delay: 1 }],
    ],
    lessons: EXAM1_LESSONS,
    hpBase: 1.0, hpGrowth: 0.15, bonus: w => 30 + 6 * w,
    unlock: { cannon: 1, pulse: 1, laser: 1, upgrades: 1 }, library: false,
    goal: { text: 'No turret ever browned out (capacitor never ran empty)', check: g => turretsOf(g).length > 0 && !g.stats.brownouts },
    starter: g => { g.addEntity('psu', 1, 5); },
  },
  {
    id: 'gpu', name: 'Graphics card', num: 3, label: '2A',
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
    unlock: { cannon: 1, pulse: 1, laser: 1, upgrades: 1 }, library: true,
    goal: { text: 'Every turret uses your Library (<code>import lib</code>)', check: g => turretsOf(g).length > 0 && turretsOf(g).every(t => /\bimport\s+[\w, ]*\blib\b|from\s+lib\s+import/.test(t.code)) },
    starter: g => { g.addEntity('psu', 1, 5); },
  },
  {
    id: 'gpu-x', name: 'Graphics card · Render farm', num: 4, label: '2B',
    desc: 'Exam for chapter 2: two lanes, forkbomb floods, Library skills.',
    paths: [
      [[-0.6, 2.5], [6.5, 2.5], [6.5, 5.5], [15.6, 5.5]],
      [[-0.6, 8.5], [10.5, 8.5], [10.5, 5.5], [15.6, 5.5]],
    ],
    core: { c: 15, r: 4, w: 3, h: 3 },
    start: { credits: 500, core: 20 },
    waves: [
      [{ t: 'bug', n: 10, gap: 1, p: 0 }, { t: 'bug', n: 10, gap: 1, p: 1, with: true, delay: 0.5 }],
      [{ t: 'worm', n: 14, gap: 0.6, p: 0 }, { t: 'forkbomb', n: 4, gap: 2.4, p: 1, with: true }],
      [{ t: 'beetle', n: 5, gap: 2.2, p: 1 }, { t: 'bug', n: 12, gap: 0.7, p: 0, with: true }, { t: 'mite', n: 16, gap: 0.22, p: 0, delay: 1 }],
      [{ t: 'forkbomb', n: 6, gap: 2.2, p: 0 }, { t: 'forkbomb', n: 5, gap: 2.4, p: 1, with: true, delay: 1.2 }],
      [{ t: 'mite', n: 30, gap: 0.15, p: 1 }, { t: 'worm', n: 16, gap: 0.5, p: 0, with: true }, { t: 'beetle', n: 6, gap: 1.8, p: 0, delay: 1 }],
      [{ t: 'forkbomb', n: 8, gap: 1.6, p: 1 }, { t: 'beetle', n: 6, gap: 1.9, p: 0, with: true }, { t: 'worm', n: 16, gap: 0.5, p: 0, delay: 1 }],
      [{ t: 'beetle', n: 8, gap: 1.5, p: 0 }, { t: 'beetle', n: 8, gap: 1.5, p: 1, with: true }, { t: 'mite', n: 30, gap: 0.15, p: 0, delay: 1 }, { t: 'forkbomb', n: 6, gap: 1.4, p: 1, with: true }],
      [{ t: 'rootkit', n: 1, gap: 1, p: 0 }, { t: 'forkbomb', n: 8, gap: 1.5, p: 1, with: true, delay: 2 }, { t: 'worm', n: 14, gap: 0.5, p: 0, delay: 2 }, { t: 'beetle', n: 6, gap: 1.6, p: 1, with: true }],
    ],
    lessons: EXAM2_LESSONS,
    hpBase: 0.8, hpGrowth: 0.12, bonus: w => 40 + 8 * w, bossMul: 0.7,
    unlock: { cannon: 1, pulse: 1, laser: 1, upgrades: 1 }, library: true,
    goal: { text: 'Every turret uses your Library and it has 3 or more functions', check: g => turretsOf(g).length > 0 && libUsers(g).length === turretsOf(g).length && libDefs(g) >= 3 },
    starter: g => { g.addEntity('psu', 2, 5); },
  },
  {
    id: 'ram', name: 'RAM', num: 5, label: '3A',
    desc: 'Lists in depth, while loops, shared memory (mem), the Slow field and memory leaks.',
    // a ring around the chip: enemies run along the outside, then cut in to the core in the middle
    paths: [[[-0.6, 1.5], [15.5, 1.5], [15.5, 9.5], [1.5, 9.5], [1.5, 5.5], [7.6, 5.5]]],
    core: { c: 7, r: 4, w: 3, h: 3 },
    start: { credits: 450, core: 20 },
    waves: [
      [{ t: 'bug', n: 14, gap: 0.8 }, { t: 'worm', n: 6, gap: 0.8, delay: 2 }],
      [{ t: 'worm', n: 16, gap: 0.5 }, { t: 'bug', n: 10, gap: 0.8, delay: 1 }],
      [{ t: 'beetle', n: 5, gap: 2 }, { t: 'bug', n: 14, gap: 0.6, delay: 1 }, { t: 'mite', n: 20, gap: 0.2, delay: 1 }],
      [{ t: 'forkbomb', n: 6, gap: 1.8 }, { t: 'worm', n: 14, gap: 0.5, delay: 1 }],
      [{ t: 'mite', n: 36, gap: 0.15 }, { t: 'beetle', n: 6, gap: 1.6, delay: 1 }, { t: 'worm', n: 12, gap: 0.5, delay: 1 }],
      [{ t: 'leak', n: 8, gap: 1.6 }, { t: 'bug', n: 14, gap: 0.6, delay: 1 }],
      [{ t: 'leak', n: 10, gap: 1.3 }, { t: 'mite', n: 30, gap: 0.15, delay: 1 }, { t: 'beetle', n: 6, gap: 1.6, delay: 1 }],
      [{ t: 'worm', n: 24, gap: 0.3 }, { t: 'leak', n: 10, gap: 1.2, delay: 1 }, { t: 'forkbomb', n: 6, gap: 1.5, delay: 1 }],
      [{ t: 'beetle', n: 10, gap: 1.2 }, { t: 'leak', n: 12, gap: 1.1, delay: 1 }, { t: 'mite', n: 36, gap: 0.12, delay: 1 }],
      [{ t: 'overflow', n: 1, gap: 1 }, { t: 'leak', n: 10, gap: 1.2, delay: 3 }, { t: 'worm', n: 16, gap: 0.4, delay: 1 }, { t: 'beetle', n: 6, gap: 1.5, delay: 1 }],
    ],
    lessons: RAM_LESSONS,
    hpBase: 1.35, hpGrowth: 0.16, bonus: w => 40 + 8 * w,
    unlock: { cannon: 1, pulse: 1, laser: 1, field: 2, upgrades: 1 }, library: true,
    goal: { text: 'At least two turrets share information through <code>mem</code> (one writes, one reads)', check: g => memWriters(g) >= 1 && memReaders(g) >= 1 && turretsOf(g).filter(t => /mem\.(read|write)\(/.test(t.code)).length >= 2 },
    starter: g => { g.addEntity('psu', 4, 7); },
  },
  {
    id: 'ram-x', name: 'RAM · Garbage collector', num: 6, label: '3B',
    desc: 'Exam for chapter 3: two lanes that merge, leaks everywhere, one skill per wave.',
    paths: [
      [[-0.6, 8.5], [2.5, 8.5], [2.5, 1.5], [6.5, 1.5], [6.5, 8.5], [10.5, 8.5], [10.5, 1.5], [15.6, 1.5]],
      [[-0.6, 4.5], [2.5, 4.5], [2.5, 1.5], [6.5, 1.5], [6.5, 8.5], [10.5, 8.5], [10.5, 1.5], [15.6, 1.5]],
    ],
    core: { c: 15, r: 0, w: 3, h: 3 },
    start: { credits: 500, core: 20 },
    waves: [
      [{ t: 'bug', n: 12, gap: 0.8, p: 0 }, { t: 'bug', n: 10, gap: 0.9, p: 1, with: true, delay: 0.5 }],
      [{ t: 'worm', n: 16, gap: 0.5, p: 1 }, { t: 'leak', n: 4, gap: 2, p: 0, with: true }],
      [{ t: 'beetle', n: 6, gap: 1.8, p: 0 }, { t: 'leak', n: 6, gap: 1.6, p: 1, with: true }, { t: 'mite', n: 24, gap: 0.18, p: 0, delay: 1 }],
      [{ t: 'forkbomb', n: 6, gap: 1.8, p: 1 }, { t: 'worm', n: 14, gap: 0.5, p: 0, with: true }, { t: 'leak', n: 6, gap: 1.5, p: 0, delay: 1 }],
      [{ t: 'leak', n: 10, gap: 1.3, p: 0 }, { t: 'mite', n: 30, gap: 0.15, p: 1, with: true }, { t: 'beetle', n: 6, gap: 1.6, p: 1, delay: 1 }],
      [{ t: 'worm', n: 22, gap: 0.35, p: 0 }, { t: 'leak', n: 10, gap: 1.2, p: 1, with: true }, { t: 'forkbomb', n: 6, gap: 1.5, p: 0, delay: 1 }],
      [{ t: 'beetle', n: 10, gap: 1.3, p: 1 }, { t: 'leak', n: 12, gap: 1.1, p: 0, with: true }, { t: 'mite', n: 30, gap: 0.14, p: 1, delay: 1 }],
      [{ t: 'overflow', n: 1, gap: 1, p: 0 }, { t: 'rootkit', n: 1, gap: 1, p: 1, with: true, delay: 10 }, { t: 'leak', n: 8, gap: 1.3, p: 1, delay: 2 }, { t: 'worm', n: 14, gap: 0.45, p: 0, with: true }],
    ],
    lessons: EXAM3_LESSONS,
    hpBase: 1.0, hpGrowth: 0.12, bonus: w => 45 + 8 * w, bossMul: 0.8,
    unlock: { cannon: 1, pulse: 1, laser: 1, field: 1, upgrades: 1 }, library: true,
    goal: { text: 'Use a Slow field, and no turret ever browned out', check: g => turretsOf(g, 'field').length > 0 && !g.stats.brownouts },
    starter: g => { g.addEntity('psu', 4, 5); },
  },
  {
    id: 'net', name: 'Network card', num: 7, label: '4A',
    desc: 'Three lanes, messages between turrets (net), the Arc turret, classes and objects.',
    // three lanes (top, middle, bottom) meet in the middle, then run to the core
    paths: [
      [[-0.6, 1.5], [8.5, 1.5], [8.5, 5.5], [15.6, 5.5]],
      [[-0.6, 5.5], [15.6, 5.5]],
      [[-0.6, 9.5], [8.5, 9.5], [8.5, 5.5], [15.6, 5.5]],
    ],
    core: { c: 15, r: 4, w: 3, h: 3 },
    start: { credits: 500, core: 20 },
    waves: [
      [{ t: 'bug', n: 8, gap: 1.1, p: 0 }, { t: 'bug', n: 8, gap: 1.1, p: 2, with: true, delay: 0.5 }],
      [{ t: 'worm', n: 10, gap: 0.6, p: 1 }, { t: 'bug', n: 10, gap: 0.9, p: 0, with: true }],
      [{ t: 'packet', n: 16, gap: 0.3, p: 2 }, { t: 'beetle', n: 4, gap: 2.2, p: 1, with: true }],
      [{ t: 'forkbomb', n: 5, gap: 2, p: 0 }, { t: 'worm', n: 12, gap: 0.5, p: 2, with: true }, { t: 'packet', n: 16, gap: 0.25, p: 1, delay: 1 }],
      [{ t: 'beetle', n: 5, gap: 1.9, p: 1 }, { t: 'leak', n: 5, gap: 1.8, p: 0, with: true }, { t: 'mite', n: 18, gap: 0.22, p: 2, with: true }],
      [{ t: 'router', n: 5, gap: 2, p: 0 }, { t: 'router', n: 5, gap: 2, p: 2, with: true, delay: 1 }, { t: 'worm', n: 12, gap: 0.5, p: 1, delay: 1 }],
      [{ t: 'packet', n: 30, gap: 0.2, p: 1 }, { t: 'router', n: 6, gap: 1.6, p: 0, with: true }, { t: 'beetle', n: 6, gap: 1.6, p: 2, with: true }],
      [{ t: 'router', n: 6, gap: 1.6, p: 2 }, { t: 'leak', n: 6, gap: 1.5, p: 0, with: true }, { t: 'worm', n: 16, gap: 0.45, p: 1, delay: 1 }],
      [{ t: 'beetle', n: 8, gap: 1.4, p: 0 }, { t: 'router', n: 8, gap: 1.4, p: 1, with: true }, { t: 'packet', n: 36, gap: 0.15, p: 2, with: true }],
      [{ t: 'rootkit', n: 1, gap: 1, p: 0 }, { t: 'router', n: 5, gap: 1.8, p: 1, with: true, delay: 2 }, { t: 'packet', n: 20, gap: 0.22, p: 2, with: true, delay: 2 }, { t: 'beetle', n: 4, gap: 1.8, p: 1 }],
    ],
    lessons: NET_LESSONS,
    hpBase: 0.85, hpGrowth: 0.14, bonus: w => 45 + 8 * w, bossMul: 0.7,
    unlock: { cannon: 1, pulse: 1, laser: 1, field: 1, arc: 3, upgrades: 1 }, library: true,
    goal: { text: 'Two turrets work together with <code>net</code> (one sends, one receives)', check: g => netSenders(g) >= 1 && netReceivers(g) >= 1 && turretsOf(g).filter(t => /net\.(send|receive)\(/.test(t.code)).length >= 2 },
    starter: g => { g.addEntity('psu', 6, 4); },
  },
  {
    id: 'net-x', name: 'Network card · Packet storm', num: 8, label: '4B',
    desc: 'Exam for chapter 4: three lanes, two merges, routers everywhere.',
    paths: [
      [[-0.6, 1.5], [12.5, 1.5], [12.5, 5.5], [15.6, 5.5]],
      [[-0.6, 5.5], [4.5, 5.5], [4.5, 9.5], [12.5, 9.5], [12.5, 5.5], [15.6, 5.5]],
      [[-0.6, 9.5], [4.5, 9.5], [12.5, 9.5], [12.5, 5.5], [15.6, 5.5]],
    ],
    core: { c: 15, r: 4, w: 3, h: 3 },
    start: { credits: 550, core: 20 },
    waves: [
      [{ t: 'bug', n: 10, gap: 0.9, p: 0 }, { t: 'packet', n: 12, gap: 0.35, p: 1, with: true }],
      [{ t: 'router', n: 4, gap: 2.2, p: 2 }, { t: 'worm', n: 12, gap: 0.55, p: 0, with: true }],
      [{ t: 'beetle', n: 5, gap: 2, p: 1 }, { t: 'packet', n: 20, gap: 0.25, p: 0, with: true }, { t: 'mite', n: 20, gap: 0.2, p: 2, delay: 1 }],
      [{ t: 'router', n: 6, gap: 1.8, p: 0 }, { t: 'router', n: 5, gap: 1.8, p: 2, with: true, delay: 1 }],
      [{ t: 'leak', n: 8, gap: 1.4, p: 1 }, { t: 'packet', n: 24, gap: 0.2, p: 2, with: true }, { t: 'beetle', n: 6, gap: 1.6, p: 0, delay: 1 }],
      [{ t: 'router', n: 8, gap: 1.5, p: 1 }, { t: 'worm', n: 18, gap: 0.4, p: 0, with: true }, { t: 'forkbomb', n: 5, gap: 1.8, p: 2, delay: 1 }],
      [{ t: 'beetle', n: 8, gap: 1.4, p: 2 }, { t: 'router', n: 8, gap: 1.4, p: 0, with: true }, { t: 'packet', n: 30, gap: 0.15, p: 1, with: true }],
      [{ t: 'rootkit', n: 1, gap: 1, p: 0 }, { t: 'rootkit', n: 1, gap: 1, p: 2, with: true, delay: 10 }, { t: 'router', n: 6, gap: 1.5, p: 1, delay: 2 }, { t: 'packet', n: 24, gap: 0.2, p: 0, with: true }],
    ],
    lessons: EXAM4_LESSONS,
    hpBase: 0.75, hpGrowth: 0.13, bonus: w => 50 + 8 * w, bossMul: 0.75,
    unlock: { cannon: 1, pulse: 1, laser: 1, field: 1, arc: 1, upgrades: 1 }, library: true,
    goal: { text: 'Use your own class (create objects from it) and an Arc', check: g => usesObjects(g) && turretsOf(g, 'arc').length > 0 },
    starter: g => { g.addEntity('psu', 8, 5); },
  },
  {
    id: 'cpu', name: 'CPU', num: 9, label: '5A',
    desc: 'Two lanes merge before the core. Polymorphic viruses, try/except, the scheduler, sorting and counting.',
    // top lane drops down early, bottom lane rises late: they merge at (10.5, 5.5)
    paths: [
      [[-0.6, 1.5], [6.5, 1.5], [6.5, 5.5], [14.6, 5.5]],
      [[-0.6, 9.5], [10.5, 9.5], [10.5, 5.5], [14.6, 5.5]],
    ],
    core: { c: 14, r: 4, w: 3, h: 3 },
    start: { credits: 550, core: 20 },
    waves: [
      [{ t: 'bug', n: 10, gap: 1.0, p: 0 }, { t: 'worm', n: 8, gap: 0.8, p: 1, with: true, delay: 1 }],
      [{ t: 'poly', n: 6, gap: 1.6, p: 0 }, { t: 'bug', n: 10, gap: 0.9, p: 1, with: true }],
      [{ t: 'poly', n: 6, gap: 1.4, p: 1 }, { t: 'forkbomb', n: 5, gap: 1.8, p: 0, with: true }, { t: 'worm', n: 12, gap: 0.5, p: 0, delay: 1 }],
      [{ t: 'beetle', n: 5, gap: 1.8, p: 0 }, { t: 'poly', n: 8, gap: 1.2, p: 1, with: true }, { t: 'mite', n: 20, gap: 0.2, p: 0, delay: 1 }],
      [{ t: 'leak', n: 6, gap: 1.5, p: 1 }, { t: 'router', n: 4, gap: 2, p: 0, with: true }, { t: 'poly', n: 6, gap: 1.3, p: 0, delay: 1 }],
      [{ t: 'poly', n: 12, gap: 0.9, p: 0 }, { t: 'packet', n: 24, gap: 0.2, p: 1, with: true }, { t: 'beetle', n: 4, gap: 2, p: 1, delay: 1 }],
      [{ t: 'router', n: 6, gap: 1.6, p: 1 }, { t: 'poly', n: 10, gap: 1.0, p: 0, with: true }, { t: 'leak', n: 6, gap: 1.4, p: 0, delay: 1 }],
      [{ t: 'beetle', n: 7, gap: 1.5, p: 0 }, { t: 'poly', n: 12, gap: 0.9, p: 1, with: true }, { t: 'forkbomb', n: 6, gap: 1.5, p: 1, delay: 1 }],
      [{ t: 'poly', n: 16, gap: 0.7, p: 0 }, { t: 'router', n: 6, gap: 1.5, p: 1, with: true }, { t: 'worm', n: 18, gap: 0.4, p: 0, delay: 1 }],
      [{ t: 'kernel', n: 1, gap: 1, p: 0 }, { t: 'poly', n: 8, gap: 1.4, p: 1, with: true, delay: 3 }, { t: 'beetle', n: 6, gap: 1.8, p: 1, delay: 1 }],
    ],
    lessons: CPU_LESSONS,
    hpBase: 0.9, hpGrowth: 0.13, bonus: w => 50 + 8 * w, bossMul: 0.6,
    unlock: { cannon: 1, pulse: 1, laser: 1, field: 1, arc: 1, upgrades: 1 }, library: true,
    goal: { text: 'Use <code>sched</code> and catch an error with <code>try</code> / <code>except</code>', check: g => schedUsers(g) >= 1 && usesTry(g) },
    starter: g => { g.addEntity('psu', 8, 3); },
  },
  {
    id: 'cpu-x', name: 'CPU · Kernel panic', num: 10, label: '5B',
    desc: 'The final exam: enemies from the left, the right and below, and the Kernel panic boss.',
    // the core sits in the middle: one lane from the left, one from the right, one from below
    paths: [
      [[-0.6, 1.5], [4.5, 1.5], [4.5, 5.5], [8.6, 5.5]],
      [[18.6, 1.5], [14.5, 1.5], [14.5, 5.5], [10.4, 5.5]],
      [[-0.6, 9.5], [9.5, 9.5], [9.5, 6.4]],
    ],
    core: { c: 8, r: 4, w: 3, h: 3 },
    start: { credits: 600, core: 20 },
    waves: [
      [{ t: 'bug', n: 6, gap: 1.2, p: 0 }, { t: 'bug', n: 6, gap: 1.2, p: 1, delay: 2 }, { t: 'worm', n: 6, gap: 0.8, p: 2, delay: 2 }],
      [{ t: 'poly', n: 6, gap: 1.5, p: 0 }, { t: 'poly', n: 6, gap: 1.5, p: 1, with: true }, { t: 'bug', n: 10, gap: 0.8, p: 2, with: true }],
      [{ t: 'forkbomb', n: 5, gap: 1.8, p: 2 }, { t: 'poly', n: 8, gap: 1.2, p: 0, with: true }, { t: 'packet', n: 20, gap: 0.25, p: 1, delay: 1 }],
      [{ t: 'router', n: 4, gap: 2, p: 1 }, { t: 'leak', n: 4, gap: 1.8, p: 2, with: true }, { t: 'poly', n: 6, gap: 1.3, p: 0, delay: 2 }],
      [{ t: 'beetle', n: 5, gap: 1.8, p: 0 }, { t: 'poly', n: 8, gap: 1.2, p: 1, with: true }, { t: 'mite', n: 18, gap: 0.22, p: 2, delay: 2 }],
      [{ t: 'poly', n: 12, gap: 0.8, p: 2 }, { t: 'router', n: 6, gap: 1.5, p: 0, with: true }, { t: 'leak', n: 6, gap: 1.4, p: 1, delay: 1 }],
      [{ t: 'beetle', n: 6, gap: 1.6, p: 1 }, { t: 'forkbomb', n: 6, gap: 1.5, p: 0, with: true }, { t: 'poly', n: 12, gap: 0.9, p: 2, with: true }, { t: 'packet', n: 24, gap: 0.2, p: 1, delay: 1 }],
      [{ t: 'kernel', n: 1, gap: 1, p: 0 }, { t: 'poly', n: 10, gap: 1.2, p: 1, with: true, delay: 3 }, { t: 'router', n: 5, gap: 1.8, p: 2, with: true, delay: 3 }],
    ],
    lessons: EXAM5_LESSONS,
    hpBase: 0.5, hpGrowth: 0.12, bonus: w => 60 + 8 * w, bossMul: 0.4,
    unlock: { cannon: 1, pulse: 1, laser: 1, field: 1, arc: 1, upgrades: 1 }, library: true,
    goal: { text: 'Win with 4 different turret types and the scheduler in 2 turrets', check: g => new Set(turretsOf(g).map(t => t.type)).size >= 4 && schedUsers(g) >= 2 },
    starter: g => { g.addEntity('psu', 9, 2); },
  },
];

// ---- endless mode ---------------------------------------------------------------------
// Any campaign map can be played endlessly: same board, generated waves from the enemies of that
// map (plus bugs and worms) that keep getting bigger and stronger; a boss every 10th wave
// (bosses get 35 % more health every 10 waves, see Game.spawn). Score = waves survived.
export const ENDLESS_WAVES = 100;
const _endless = {};
export function findMap(id) {
  if (typeof id === 'string' && id.startsWith('endless:')) {
    const base = MAPS.find(m => m.id === id.slice(8));
    return base ? (_endless[id] ||= makeEndless(base)) : null;
  }
  return MAPS.find(m => m.id === id) || null;
}
function makeEndless(base) {
  const types = [...new Set(base.waves.flat().map(g => g.t))];
  const pool = [...new Set(['bug', 'worm', ...types.filter(t => !ENEMIES[t].boss)])];
  const bosses = types.filter(t => ENEMIES[t].boss);
  if (!bosses.length) bosses.push('rootkit');
  const swarm = { mite: 2.5, packet: 2.5, worm: 1.5, bug: 1.2 };   // small enemies come in bigger groups
  let seed = [...base.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);   // same waves every time for a map
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const lanes = base.paths.length, waves = [];
  for (let w = 0; w < ENDLESS_WAVES; w++) {
    const groups = [], nG = Math.min(4, 2 + Math.floor(w / 6));
    if (w % 10 === 9) groups.push({ t: bosses[Math.floor(w / 10) % bosses.length], n: 1 + Math.floor(w / 30), gap: 8, p: Math.floor(rnd() * lanes) });
    for (let k = 0; k < nG; k++) {
      const t = pool[Math.floor(rnd() * pool.length)], s = swarm[t] || 0.7;
      const n = Math.min(60, Math.round((5 + w) * s / Math.sqrt(nG) + 1));
      const gap = Math.max(0.12, (1.3 / s) * (1 - Math.min(0.45, w * 0.01)));
      groups.push({ t, n, gap: +gap.toFixed(2), p: Math.floor(rnd() * lanes), ...(groups.length ? { with: rnd() < 0.5, delay: 1 } : {}) });
    }
    waves.push(groups);
  }
  const lesson = {
    title: 'Endless',
    body: `<b>Endless mode</b> on ${base.name}. Waves keep coming, and every wave is bigger and stronger than the last. Every 10th wave brings a boss, and bosses get tougher each time.
      <p>Your score is the number of waves you survive. Everything you learned in the campaign is allowed.</p>`,
    tasks: [],
    hint: 'Spend credits between waves: more turrets, PSU upgrades, and smarter code (targets by armor, slow fields on long lanes, arcs for swarms).',
    solution: 'There is no single solution: keep improving your defense and your code.',
  };
  return { ...base, id: `endless:${base.id}`, name: `${base.name} · Endless`, label: '∞', endless: true, waves,
    lessons: waves.map(() => lesson), goal: null, hpGrowth: Math.max(0.15, base.hpGrowth || 0.15),
    start: { ...base.start, credits: Math.max(base.start.credits, 450) },   // map 1 starts tiny for the tutorial
    starter: g => { base.starter?.(g); g.sockets().forEach(s => { if (s.turret) s.turret.code = TEMPLATES[s.turret.type]; }); },   // full program, not a lesson stub
    unlock: Object.fromEntries(Object.keys(base.unlock).map(k => [k, 1])) };
}
