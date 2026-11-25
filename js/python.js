// ---------------------------------------------------------------------------
// Real Python (CPython via Pyodide/WebAssembly) running turret programs.
// One JS->Python call per code tick; Python returns commands as JSON.
// ---------------------------------------------------------------------------
import { LIMITS, POWER, TURRETS } from './data.js';

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';

const KIND_MODULES = Object.fromEntries(Object.entries(TURRETS).map(([k, v]) => [k, v.modules]));

const PRELUDE = String.raw`
import sys, json, math, builtins, ast, traceback, types

_LIMITS = json.loads(${JSON.stringify(JSON.stringify(LIMITS))})
_P = json.loads(${JSON.stringify(JSON.stringify(POWER))})
_KIND_MODULES = json.loads(${JSON.stringify(JSON.stringify(KIND_MODULES))})
_ALLOWED = {'math', 'random'}
_ALL_MODS = {'radar', 'motor', 'cannon', 'laser', 'pulse', 'power', 'meter', 'field', 'mem', 'arc', 'net'}
_FILE = '<turret>'
_LIB = '<lib>'
_TRACED = (_FILE, _LIB)
_lib = {'code': None, 'enabled': False}
_world = {'enemies': [], 'time': 0.0}

class _Budget(BaseException):
    pass

class Enemy:
    __slots__ = ('id', 'kind', 'x', 'y', 'hp', 'max_hp', 'armor', 'shield',
                 'speed', 'progress', 'vx', 'vy', 'distance')
    def __init__(self, d, tx, ty):
        self.id = d['id']; self.kind = d['kind']; self.x = d['x']; self.y = d['y']
        self.hp = d['hp']; self.max_hp = d['max_hp']; self.armor = d['armor']
        self.shield = d['shield']; self.speed = d['speed']; self.progress = d['progress']
        self.vx = d['vx']; self.vy = d['vy']
        self.distance = math.hypot(self.x - tx, self.y - ty)
    def __repr__(self):
        return f"<{self.kind} #{self.id} hp={self.hp:.0f} distance={self.distance:.1f}>"

def _num(name, v, lo, hi, t):
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        raise TypeError(f"{name} must be a number, not {type(v).__name__}")
    if v < lo or v > hi:
        t.warn(f"{name} = {v} is outside {lo}..{hi}, clamped")
    return float(max(lo, min(hi, v)))

def _need_enemy(fn, target):
    if not isinstance(target, Enemy):
        extra = " (did radar.scan() return an empty list?)" if target is None else ""
        raise TypeError(f"{fn} needs an enemy, got {type(target).__name__}{extra}")

def _angle_to(t, x, y):
    return math.degrees(math.atan2(y - t.y, x - t.x))

def _adiff(a, b):
    return (a - b + 180) % 360 - 180

class _Module:
    _name = '?'
    _keys = ()
    def __init__(self, t):
        object.__setattr__(self, '_t', t)
    def __setattr__(self, k, v):
        if k in self._keys:
            lo, hi, _d = _LIMITS[k]
            self._t.cfg[k] = _num(f"{self._name}.{k}", v, lo, hi, self._t)
        else:
            raise AttributeError(f"'{self._name}' has no setting called '{k}'")
    def __getattr__(self, k):
        if k in type(self)._keys:
            return self._t.cfg[k]
        raise AttributeError(f"module '{self._name}' has no attribute '{k}'")
    def __repr__(self):
        return f"<module {self._name}>"

class _Radar(_Module):
    _name = 'radar'; _keys = ('range',)
    def scan(self):
        t = self._t; r = t.cfg['range']; out = []
        for d in _world['enemies']:
            e = Enemy(d, t.x, t.y)
            if e.distance <= r:
                out.append(e)
        out.sort(key=lambda e: -e.progress)
        return out
    def first(self, enemies):
        return max(enemies, key=lambda e: e.progress) if enemies else None
    def closest(self, enemies):
        return min(enemies, key=lambda e: e.distance) if enemies else None
    def weakest(self, enemies):
        return min(enemies, key=lambda e: e.hp + e.shield) if enemies else None
    def strongest(self, enemies):
        return max(enemies, key=lambda e: e.hp + e.shield) if enemies else None

class _Motor(_Module):
    _name = 'motor'; _keys = ('speed',)
    @property
    def angle(self):
        return self._t.angle
    def aim(self, target):
        _need_enemy('motor.aim()', target)
        self._t.cmds['aim'] = target.id
        self._t.cmds.pop('aim_at', None)
    def aim_at(self, x, y):
        self._t.cmds['aim_at'] = [float(x), float(y)]
        self._t.cmds.pop('aim', None)
    def aimed(self, target, tolerance=6):
        _need_enemy('motor.aimed()', target)
        return abs(_adiff(_angle_to(self._t, target.x, target.y), self._t.angle)) <= tolerance

class _Cannon(_Module):
    _name = 'cannon'; _keys = ('damage',)
    def shot_cost(self):
        return self._t.cfg['damage'] * _P['shotJPerDmg']
    def ready(self):
        t = self._t
        return t.reload <= 0 and t.energy >= self.shot_cost() and not t.cmds.get('fire')
    def fire(self):
        if self.ready():
            self._t.cmds['fire'] = True
            return True
        t = self._t
        if t.reload <= 0 and t.energy < self.shot_cost():
            t.cmds['starved'] = round(self.shot_cost(), 1)
        return False

class _Laser(_Module):
    _name = 'laser'; _keys = ('power',)
    def fire(self, target):
        _need_enemy('laser.fire()', target)
        self._t.cmds['laser'] = target.id
    def stop(self):
        self._t.cmds['laser'] = None
    @property
    def dps(self):
        return self._t.cfg['power'] * _P['laserDpsPerW']

class _Pulse(_Module):
    _name = 'pulse'; _keys = ('strength',)
    def cost(self):
        r = self._t.cfg['range']
        return self._t.cfg['strength'] * (_P['pulseBase'] + _P['pulseRangeK'] * r * r)
    def ready(self):
        t = self._t
        return t.reload <= 0 and t.energy >= self.cost() and not t.cmds.get('pulse')
    def fire(self):
        if self.ready():
            self._t.cmds['pulse'] = True
            return True
        t = self._t
        if t.reload <= 0 and t.energy < self.cost():
            t.cmds['starved'] = round(self.cost(), 1)
        return False

class _Power(_Module):
    _name = 'power'
    @property
    def energy(self):
        return self._t.energy
    @property
    def capacity(self):
        return self._t.capacity
    @property
    def percent(self):
        c = self._t.capacity
        return 100.0 * self._t.energy / c if c else 0.0

class _Meter(_Module):
    """Energy meter: importing it shows a small badge on the tower (free, uses no power).
    Read-only values for your code: meter.net (watts in minus watts used) and meter.trend."""
    _name = 'meter'
    @property
    def net(self):
        return self._t.net
    @property
    def trend(self):
        return {1: 'charging', 0: 'steady', -1: 'draining'}[self._t.trend]

class _Field(_Module):
    """Slow field: while on, every enemy in radar range moves slower. Uses watts while on."""
    _name = 'field'; _keys = ('slow',)
    def on(self):
        self._t.cmds['field'] = True
    def off(self):
        self._t.cmds['field'] = False
    def cost(self):
        return self._t.cfg['slow'] * _P['fieldWPerPct']

# shared memory: one notebook that every turret on the map can read and write
_SHARED = {}
def reset_shared():
    _NET['out'] = {}; _NET['in'] = {}
    _SHARED.clear()

class _Mem(_Module):
    """mem.write(key, value), mem.read(key, default), mem.keys(), mem.clear(key): shared between all turrets."""
    _name = 'mem'
    def write(self, key, value):
        if len(_SHARED) >= 200 and str(key) not in _SHARED:
            raise ValueError('mem is full (200 keys). Use mem.clear(key) for keys you no longer need.')
        _SHARED[str(key)] = value
    def read(self, key, default=None):
        return _SHARED.get(str(key), default)
    def keys(self):
        return list(_SHARED.keys())
    def clear(self, key=None):
        if key is None:
            raise ValueError('mem.clear() needs a key, e.g. mem.clear("target"), so you never wipe other turrets\' notes by accident.')
        _SHARED.pop(str(key), None)

class _Arc(_Module):
    """Arc: lightning hits the target, then jumps to up to arc.jumps nearby enemies (each jump does less)."""
    _name = 'arc'; _keys = ('damage', 'jumps')
    def cost(self):
        c = self._t.cfg
        return c['damage'] * (1 + c['jumps']) * _P['arcJPerDmg']
    def ready(self):
        t = self._t
        return t.reload <= 0 and t.energy >= self.cost() and not t.cmds.get('arc')
    def fire(self, target):
        _need_enemy('arc.fire()', target)
        if self.ready():
            self._t.cmds['arc'] = target.id
            return True
        t = self._t
        if t.reload <= 0 and t.energy < self.cost():
            t.cmds['starved'] = round(self.cost(), 1)
        return False

# net: messages between turrets. What is sent during one tick can be received during the next tick.
_NET = {'out': {}, 'in': {}}
def _net_swap():
    _NET['in'] = _NET['out']; _NET['out'] = {}

class _Net(_Module):
    """net.send(channel, value) and net.receive(channel) -> list of values sent on that channel last tick."""
    _name = 'net'
    def send(self, channel, value):
        box = _NET['out'].setdefault(str(channel), [])
        if len(box) >= 50:
            raise ValueError('too many messages on one channel in one tick (max 50)')
        box.append(value)
    def receive(self, channel):
        return list(_NET['in'].get(str(channel), []))
    def channels(self):
        return list(_NET['in'].keys())

_MOD_CLASSES = {'radar': _Radar, 'motor': _Motor, 'cannon': _Cannon,
                'laser': _Laser, 'pulse': _Pulse, 'power': _Power, 'meter': _Meter,
                'field': _Field, 'mem': _Mem, 'arc': _Arc, 'net': _Net}

class _T:
    def __init__(self, tid, kind):
        self.id = tid; self.kind = kind
        self.x = self.y = self.angle = 0.0
        self.energy = 0.0; self.capacity = 100.0; self.reload = 0.0; self.net = 0.0; self.trend = 0
        self.cfg = {k: float(v[2]) for k, v in _LIMITS.items()}
        self.cmds = {}; self.out = []; self.warns = []
        self.mods = {n: _MOD_CLASSES[n](self) for n in _KIND_MODULES[kind]}
        self.ns = None
    def warn(self, msg):
        if msg not in self.warns:
            self.warns.append(msg)

_turrets = {}
_BLOCK = {'open', 'input', 'exit', 'quit', 'help', 'breakpoint', 'compile', 'exec',
          'eval', 'globals', 'locals', 'vars', 'memoryview', '__import__', 'copyright',
          'credits', 'license'}

def _make_builtins(t):
    b = {k: v for k, v in builtins.__dict__.items() if k not in _BLOCK}
    def _import(name, globals=None, locals=None, fromlist=(), level=0):
        base = name.split('.')[0]
        if base == 'lib':
            return _lib_module(t)
        if base in t.mods:
            return t.mods[base]
        if base in _ALLOWED:
            return builtins.__import__(name, globals, locals, fromlist, level)
        if base in _ALL_MODS:
            raise ImportError(f"a {t.kind} turret has no '{base}' module. Installed: {', '.join(t.mods)}")
        raise ImportError(f"module '{name}' is not available on turrets. Available: {', '.join(list(t.mods) + sorted(_ALLOWED))}")
    def _print(*args, sep=' ', end='\n'):
        if len(t.out) < 20:
            t.out.append(sep.join(str(a) for a in args))
    b['__import__'] = _import
    b['print'] = _print
    return b

_MODULE_NAMES = {'radar', 'motor', 'cannon', 'pulse', 'laser', 'power', 'field', 'mem', 'arc', 'net'}
_TICK_ACTIONS = {'fire', 'stop', 'aim', 'aim_at', 'scan', 'first', 'closest', 'weakest', 'strongest'}

def _check_ast(tree, fname=_FILE):
    for node in ast.walk(tree):
        if isinstance(node, ast.ExceptHandler):
            if node.type is None or (isinstance(node.type, ast.Name) and node.type.id == 'BaseException'):
                raise SyntaxError("use 'except Exception:' instead of a bare 'except:' on turrets",
                                  (fname, node.lineno, 1, ''))
        if isinstance(node, ast.Attribute) and node.attr.startswith('__'):
            raise SyntaxError("names starting with '__' are not allowed on turrets",
                              (fname, node.lineno, 1, ''))
    # beginner trap: a module call that is not inside update() runs only once (or never per tick)
    def calls(stmts):
        for st in stmts:
            for n in ast.walk(st):
                if (isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute)
                        and isinstance(n.func.value, ast.Name) and n.func.value.id in _MODULE_NAMES):
                    yield n
    for st in tree.body:
        if isinstance(st, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            if fname == _FILE and st.name == 'setup':
                for n in calls(st.body):
                    if n.func.attr in _TICK_ACTIONS:
                        raise SyntaxError(f"{n.func.value.id}.{n.func.attr}() is inside setup(), which runs only once at Upload. "
                                          f"Move it into update(), which runs 10 times a second.",
                                          (fname, n.lineno, 1, ''))
            continue
        for n in calls([st]):
            raise SyntaxError(f"{n.func.value.id}.{n.func.attr}() is outside any function, so it would run only once at Upload. "
                              f"Indent it with 4 spaces so it belongs to update(), like the lines above it.",
                              (fname, n.lineno, 1, ''))

def _fmt_error(e):
    if isinstance(e, SyntaxError) and e.filename in _TRACED:
        where = 'lib' if e.filename == _LIB else 'turret'
        return {'msg': f"{type(e).__name__}: {e.msg}", 'line': e.lineno, 'file': where}
    line = None; where = 'turret'; lib_line = None
    for fr in traceback.extract_tb(e.__traceback__):
        if fr.filename == _FILE:
            line = fr.lineno
        elif fr.filename == _LIB:
            lib_line = fr.lineno
    msg = f"{type(e).__name__}: {e}"
    # error happened inside a library function: say where in the library
    tb = traceback.extract_tb(e.__traceback__)
    if tb and tb[-1].filename == _LIB or (lib_line and not line):
        msg = f"{msg}  (in the Library, line {lib_line})"
    return {'msg': msg, 'line': line, 'file': where, 'lib_line': lib_line}

def _lib_module(t):
    """Each turret gets its own copy of the player's library, built with that turret's modules."""
    if not _lib['enabled']:
        raise ImportError("the shared library unlocks on map 2")
    if _lib['code'] is None:
        raise ImportError("the Library has an error. Open 📚 Library and fix it first")
    if t.libmod is None:
        mod = types.ModuleType('lib')
        mod.__dict__['__builtins__'] = _make_builtins(t)
        t.libmod = mod
        exec(_lib['code'], mod.__dict__)
    return t.libmod

def set_library(src):
    if src is None:
        _lib['enabled'] = False; _lib['code'] = None
        return json.dumps({'ok': True})
    _lib['enabled'] = True
    try:
        tree = ast.parse(src, _LIB, 'exec')
        _check_ast(tree, _LIB)
        code = compile(tree, _LIB, 'exec')
    except SyntaxError as e:
        return json.dumps({'ok': False, 'error': _fmt_error(e)})
    # dry run in a scratch turret so top-level mistakes show up now
    probe = _T('__lib_probe__', 'cannon')
    probe.libmod = None
    old = _lib['code']
    _lib['code'] = code
    ops, over, err = _guarded(lambda: _lib_module(probe), 5000)
    if over:
        err = {'msg': "The library took too long to load (endless loop?)", 'line': None}
    if err:
        _lib['code'] = old
        return json.dumps({'ok': False, 'error': err, 'out': probe.out})
    names = [k for k, v in probe.libmod.__dict__.items() if callable(v) and not k.startswith('_')]
    return json.dumps({'ok': True, 'functions': names, 'out': probe.out})

def _guarded(fn, limit):
    """Run fn while counting executed lines of turret code (the CPU budget)."""
    count = [0]
    def local(frame, event, arg):
        if event == 'line':
            count[0] += 1
            if count[0] > limit:
                raise _Budget()
        return local
    def glob(frame, event, arg):
        if frame.f_code.co_filename in _TRACED:
            return local
        return None
    err = None; over = False
    sys.settrace(glob)
    try:
        fn()
    except _Budget:
        over = True
    except Exception as e:
        err = _fmt_error(e)
    finally:
        sys.settrace(None)
    return min(count[0], limit), over, err

def compile_turret(tid, kind, src):
    t = _turrets.get(tid)
    if t is None or t.kind != kind:
        t = _T(tid, kind)
        _turrets[tid] = t
    t.out = []; t.warns = []; t.cmds = {}; t.libmod = None
    try:
        tree = ast.parse(src, _FILE, 'exec')
        _check_ast(tree)
        code = compile(tree, _FILE, 'exec')
    except SyntaxError as e:
        return json.dumps({'ok': False, 'error': _fmt_error(e), 'out': [], 'warns': []})
    old_cfg = dict(t.cfg)
    t.cfg = {k: float(v[2]) for k, v in _LIMITS.items()}
    ns = {'__builtins__': _make_builtins(t), '__name__': 'turret'}
    ops, over, err = _guarded(lambda: exec(code, ns), 5000)
    if not err and not over and not callable(ns.get('update')):
        err = {'msg': "Your program needs a function called update(). It runs 10 times per second.", 'line': None}
    if not err and not over and callable(ns.get('setup')):
        ops, over, err = _guarded(ns['setup'], 5000)
    if over:
        err = {'msg': "Your program took too long to start (endless loop?)", 'line': None}
    if err:
        t.cfg = old_cfg
        return json.dumps({'ok': False, 'error': err, 'out': t.out, 'warns': t.warns})
    t.ns = ns
    return json.dumps({'ok': True, 'cfg': t.cfg, 'out': t.out, 'warns': t.warns})

def run_tick(world_json):
    w = json.loads(world_json)
    _net_swap()   # messages sent last tick can be received now
    _world['enemies'] = w['enemies']
    _world['time'] = w['time']
    res = {}
    for tid, s in w['turrets'].items():
        t = _turrets.get(tid)
        if t is None or t.ns is None:
            continue
        t.x = s['x']; t.y = s['y']; t.angle = s['angle']
        t.energy = s['energy']; t.capacity = s['capacity']; t.reload = s['reload']; t.net = s.get('net', 0.0); t.trend = s.get('trend', 0)
        t.cmds = {}; t.out = []; t.warns = []
        ops, over, err = _guarded(t.ns['update'], int(s['cpu']))
        res[tid] = {'cmds': t.cmds, 'out': t.out, 'ops': ops, 'over': over,
                    'error': err, 'warns': t.warns, 'cfg': t.cfg}
    return json.dumps(res)

def remove_turret(tid):
    _turrets.pop(tid, None)
`;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not download ' + src));
    document.head.appendChild(s);
  });
}

export class PyRuntime {
  constructor() {
    this.ready = false;
    this.py = null;
  }

  async load(onStatus = () => {}) {
    onStatus('Downloading Python interpreter…');
    await loadScript(PYODIDE_URL + 'pyodide.js');
    onStatus('Starting Python…');
    // eslint-disable-next-line no-undef
    this.py = await loadPyodide({ indexURL: PYODIDE_URL });
    onStatus('Installing turret modules…');
    this.py.runPython(PRELUDE);
    this._compile = this.py.globals.get('compile_turret');
    this._tick = this.py.globals.get('run_tick');
    this._remove = this.py.globals.get('remove_turret');
    this._setLib = this.py.globals.get('set_library');
    this._resetShared = this.py.globals.get('reset_shared');
    this.version = this.py.runPython('import sys; sys.version.split()[0]');
    this.ready = true;
  }

  compile(id, kind, src) {
    return JSON.parse(this._compile(String(id), kind, src));
  }

  tick(world) {
    return JSON.parse(this._tick(JSON.stringify(world)));
  }

  // mem: start every map (and replay) with an empty shared notebook
  resetShared() { if (this._resetShared) this._resetShared(); }

  // src = null turns the library off (maps without it)
  setLibrary(src) {
    return JSON.parse(this._setLib(src));
  }

  remove(id) {
    if (this.ready) this._remove(String(id));
  }
}
