# Circuit Defense: design notes

A tower defense game that teaches programming. You build towers on a motherboard, wire them to power, and **program each turret in real Python**.

## Decisions so far

| Topic | Decision | Why |
|---|---|---|
| Platform | Web (HTML5 canvas + JS), installable as a PWA | Runs on PC, tablet and phone with no install. |
| Language | **Python first** (real CPython 3.12 via Pyodide/WebAssembly) | It's No. 1 on TIOBE and the most common first language. JavaScript (No. 1 in developer usage) is the natural second language because it runs natively. |
| Code model | `setup()` runs once at upload; `update()` runs 10×/s | Easy for beginners, with enough depth for experts (state, prediction). |
| Modules | `radar`, `motor`, `cannon`, `pulse`, `laser`, `power`, `meter` (free energy-trend badge: ▲ gaining, = even, ▼ draining), plus `math` and `random` | This is the "someone else's module" idea: you import a module and decide how to use it. A turret type decides which modules are installed. |
| Electricity | Real units: **P = V × I**, joules, a 5 A wire limit, a 100 J capacitor per socket | You learn real basics, and there's a strategy layer on top. |
| Module power | Every setting costs power: radar `0.3×range²` W, motor `0.04×speed` W while turning, shot `1.2×damage` J, laser `power` W, pulse `strength×(2+0.5×range²)` J, CPU 2 mJ per executed line | This matches the request that range, speed and damage each draw power. |
| Brownout | Capacitor empty → turret stops until it's back to 25% | Overdrawing has a visible, understandable cost. |
| CPU budget | 150 executed lines per tick per socket | Endless loops can't freeze the game, and efficient code is rewarded. |
| Modes | **Plan mode** (the editor pauses the game) or **Live mode** (code while it runs), set in Settings | Answers the "maybe 2 modes?" question. |
| Visual style | Vector-drawn neon PCB: animated bugs, worms, mites, beetles and a Rootkit boss; glow, particles, flowing electrons in wires | Polished without needing an art pipeline yet. |

## What's in the prototype

- **Campaign with 2 maps** (🗺 button). Each map has its own paths, waves, lessons and unlocks. Map 2 unlocks after clearing map 1, or via "Play anyway".
  - **1 · Motherboard**: 11 waves, each matched to its lesson (functions, wires, if, energy in/out, variables, a second PSU, loops, targeting, laser + saving energy, global/prediction).
  - **2 · Graphics card**: 8 waves, **two enemy lanes**, the new **Forkbomb** enemy (splits into 3 mites), and lessons on writing your own functions, the **shared Library**, return values, dictionaries, sorting, default parameters and f-strings.
- **Shared Library** (📚 / L key, map 2+): player-written Python module that every turret can `import lib`. Each turret gets its own copy built with its own modules; library lines count toward the CPU budget, and errors inside library functions name the library line. Uploading the library re-uploads every turret that uses it.
- **Save / load**: automatic, in the browser (localStorage), between waves and while building. Saves include layout, wire routes, code, unsaved drafts and the library.
- **Player profiles** ("Who's playing?", no login): each player on a device has a name, an avatar and their own saves (`cd.p.<id>.*`). Shown at start; switch with the avatar button or from the campaign screen. Older saves move into "Player 1". Saves are per device and browser; a transfer code between devices is a possible next step.
- **Phone mode** (touch screens): landscape layout ("turn your phone" hint when upright, with a "play upright anyway" option). No toolbar: tapping the board opens **ring menus** (empty tile: Socket / PSU / Splitter; socket: turrets, Power, Info, Unplug, Sell; turret: Code, Wire out, ...). One-line **coach bubble** with the current task (tap for the full lesson card); lesson highlights glow on ring buttons. Big round Start wave button. The code editor is full screen with tabs (Code, Power, Docs, Lesson, Console) and **code chips** (tap to insert; the keyboard only opens with ⌨). `?phone=1` forces phone mode for testing.
- **Half-lessons**: a lesson with `half: true` (shown as e.g. 3½) belongs to the wave of the lesson before it and appears as soon as that lesson's tasks are done. Lesson 3½ "Your own function" teaches `def` / `return` (meter example) by writing `in_range(target, max_dist)`; with `keeps: 'in_range'` the finished function is saved to the player's profile and put into their map 2 Library.- **Ghost-line hints**: tasks can list `ghost` steps (`after` / `before` / `change` + text). Each 💡 Hint shows the next line faintly at the right place in the editor; it disappears once typed. The player always types it themselves.- **Upgrades** (map 1 from wave 6, map 2 from the start): PSU 100 → 140 → 180 W (60, 90 credits). Socket: charging 30 → 40 → 50 W, capacitor 100 → 130 → 160 J, module slots 1 → 2 → 3, CPU 150 → 200 → 250 lines (35, 55 credits). Gold dots show the level.- **Module slots**: radar, motor and the weapon are built in; `power`, `meter` and `lib` each need a slot on the socket. Importing more than the socket has fails to upload with a clear message.- **Pulse surge**: a pulse that hits 0 or 1 enemy drains 15 J from every other socket on the same PSU (teaches checking the count first).- **Economy**: map 1 wave bonus 23 + 6 × wave (tighter early than the old 30 + 5 × wave). Phone code chips are words and symbols, not finished lines.
- **Wires cost 1 credit per tile** (refunded 60% when removed). **Daisy-chained sockets**: a socket has 1 power output. Building a socket or splitter on a tile a wire runs over **splices it into that wire**: the part nearer the source keeps the old wire (free), and a **new paid wire** runs on to the next part so the chain stays connected. The gold preview shows "joins wire · new wire +N = total cr" and where the new wire will run. A PSU can't be built on a wire. Everything after a wire shares its 5 A (60 W), so 2 sockets per wire charge at full speed and longer chains get less each. Selling or **unplugging** a socket in the middle of a chain reconnects its neighbours, so the rest of the chain keeps power; the unplugged socket runs down what is left in its capacitor. The selected wire shows "W / 60 W" on the board.
- **Wire routes are switchable**: tap a wire (or a socket/splitter) → **Route ↻**, or press **R**. Cycles through the possible routes; routes that cross other parts are offered last.
- **Context tips** (💡): one hint about what to do next, e.g. "socket has no power", "turret has a code problem", "PSU overloaded", or "you have enough credits for a new tower". Shown in the lesson panel, or over the board when the panel is hidden.
- **Lessons can have several tasks**, each with its own checkmark. **Lesson highlights**: the first unfinished task makes the things it is about glow gold: parts on the board (ring + arrow), toolbar buttons (step by step: Socket → Wire → Cannon), rows of the info card (e.g. PSU Output/Demand), lines in the code editor and buttons like Upload. Defined per task as `focus(g)` in data.js.
- **Worst-case power colours**: every wire edge and PSU frame is green / yellow (75–100%) / red (overloaded) for the case where every socket behind it charges at full 30 W at once, visible even while paused. Wire and PSU cards show this as "Peak". Code comments show what each setting costs (radar 0.3 × range² W always on, motor 0.04 × speed W while turning).
- **Sound effects** synthesized with WebAudio (no files), mute with 🔊 or **M**.
- 6 enemy types including a shielded boss and the splitting Forkbomb.
- 11 lessons (map 1): function calls → wires, power and a 2nd cannon → `if` (fire only when aimed) → energy: joules in and out (`meter`) → variables and tuning → a second PSU (peak power) → lists and `for` loops (Pulse, wave 7) → targeting → Laser (wave 9) and saving energy (`power.percent`) → `global` state and target prediction → boss.
- A code editor with syntax highlighting, error line highlighting, friendly hints for common errors, a console for `print()`, a Power tab that calculates your turret's energy budget from your settings, a Docs tab, and "Copy from…" to reuse code between turrets.
- Safety rails: line budget, import allow-list, no bare `except:`, failed uploads keep the old program running.

## How to run

The game needs to be served over http (browsers block ES modules and WebAssembly on `file://`).

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 8080
```
Then open http://localhost:8080. The first load downloads the Python runtime (about 10 MB) from the jsDelivr CDN.

For phones, host the folder on any static host (GitHub Pages, Netlify, etc.) and open it there. It can be installed to the home screen.

## Code layout

| File | Purpose |
|---|---|
| `js/data.js` | All tuning: power constants, turrets, enemies, maps (paths, waves, lessons, unlocks), templates, docs |
| `js/python.js` | Pyodide loader + Python sandbox (module classes, line-budget tracer, compile/tick) |
| `js/game.js` | Simulation: grid, power network allocation, turrets, enemies, waves |
| `js/render.js` | Canvas renderer (all vector art) |
| `js/ui.js` | HUD, toolbar, info card, editor (turrets + Library), lessons, tips, campaign, save/load |
| `js/audio.js` | Synthesized sound effects |
| `js/phone.js` | Phone mode: ring menus, coach bubble, code chips, rotate hint |
| `tools/sim.js` | Balance bots (see Balance) |

## Balance

Tuned with the bot harness in `tools/sim.js`. With the game open in a browser, run this in the console:
```js
const S = await import('./tools/sim.js'); await S.report();
```
The bots always pick the best-coverage tile, so they are stronger than a new player.

| Bot | Meaning | Target | Current (2026-11-25) |
|---|---|---|---|
| learner | applies each lesson, spends all credits | wins with some damage | wins, core 10/20 |
| learnerHalf | applies lessons, spends only 60% | struggles late | loses at wave 9 |
| templatesOnly | never edits the starter code | loses mid-late | loses at wave 9 |
| naive | fires without aiming, no tuning | loses mid | loses at wave 8 |

(The bots move a wire out of the way with Route ↻ before building on its tile, so they never chain sockets. They pay for wires and place new PSUs near their towers. Re-checked 2026-11-25 after wire costs.)

Map 2 (run `S.report('gpu')`), same bots; the learner bots also add a PSU when supply runs short:

| Bot | Current |
|---|---|
| learner | wins, core 10/20 |
| learnerHalf | loses at wave 6 |
| templatesOnly | loses at wave 8 |
| naive | loses at wave 7 |

Map 2 numbers: start 400 credits, HP +10% per wave, wave bonus 35 + 8 × wave.

The main point: **learning the lessons is what wins**. Armored beetles (from wave 4) need raised damage. Raised damage costs more energy, so capacitors run low (the ⚡ "low power" badge appears about 20–30% of the time), which sets up the energy-management lesson.

Key numbers: PSU 100 W, socket charge 30 W, shot 1.5 J per damage point, HP +14% per wave, kill rewards 1–10 (boss 100), wave bonus 30 + 5 × wave (raised by 5 when wires started costing credits), wires 1 credit per tile.

## Ideas for next steps

1. **Map 3+**: e.g. "Server rack" (classes and objects, while loops, a new module such as a slowing field or chain lightning). Star ratings for efficiency (lines used, energy used).
2. **Library files**: several library modules instead of one, and sharing libraries between maps.
3. **Upgrades**: socket CPU upgrades (more lines/tick), bigger capacitors, 5 V / 3.3 V rails with voltage regulators, fuses that trip.
4. **More realism (optional layer)**: wire resistance and voltage drop (V = I × R), so long wires lose power.
5. **Second language**: JavaScript, using the same module API and per-turret language choice.
6. **Challenge mode for experts**: fixed budget, "fewest lines" leaderboards, sandbox/free-build.
7. **Save/load** of progress and programs (localStorage first, accounts later).
8. **Sound and music**, richer enemy death animations, sprite art if desired.
9. Move Python into a Web Worker for many turrets on slow phones.

## Campaign roadmap (proposal, 2026-11-25)

The campaign is a tour through a computer. Each **chapter** is one part of the machine, teaches one block of Python and adds **one new module** (plus sometimes a turret or enemy). Each chapter has **2 maps**:
- **Map A (lesson map)**: lessons wave by wave, like the motherboard now (~10-11 waves).
- **Map B (exam map)**: short lessons, harder waves, must use what map A taught (~8 waves, like the graphics card now).

| Ch. | Part of the computer | Python it teaches | New module / turret | New enemy |
|---|---|---|---|---|
| 1 | Motherboard (1A built, 1B = new short map) | calling functions, `if`, own functions (3½), variables, `for`, targeting, `global` | radar, motor, cannon, pulse, laser, power, meter | bug, worm, mite, beetle, Rootkit boss |
| 2 | Graphics card (2A = current map 2, 2B new) | functions with return values, the Library, dictionaries, sorting, default parameters, f-strings | `lib` (your own module) | forkbomb |
| 3 | RAM | lists in depth (append, remove, slices), `while`, list comprehensions, simple state (modes) | `mem`: shared memory, turrets can write/read values for each other · **Slow field** turret | memory leak (grows over time) |
| 4 | Network card | classes and objects, methods, messages between turrets | `net`: send/receive messages · **Arc** turret (lightning that jumps between enemies) | packet swarm (splits across lanes) |
| 5 | CPU / Server room | algorithms (search, sort by several keys), `try/except`, recursion light, efficiency (CPU budget) | `sched`: share CPU lines between sockets | polymorphic virus (changes armor type) + final boss |

**10 maps in total**, about 90-100 waves. More chapters (sound card, power plant, quantum chip...) can be added later without changing the system.

### Stars (3 per map, 30 in total)
- ★ clear the map
- ★★ clear it with the core at 15/20 or more
- ★★★ the map's **code goal** (e.g. 1A: every cannon uses `in_range` and no pulse surges; 2A: every turret uses `lib`)
- each star is earned once; replaying can only add the missing ones (no grinding)

### Lab (spend stars between maps, per player, can be reset)
Permanent but **small** boosts. All of them together cost **35 stars**; 6 exist today (2 maps), 30 when all 10 maps exist. Maps are balanced so they are winnable with **no** boosts and clearly easier with the expected set (about 2 stars per finished map).

| Boost | Per level | Levels | Stars per level |
|---|---|---|---|
| Library capacity: your own functions/modules you can bring into the next map (basic modules never count) | +1 function (start: 1) | 3 | 2 |
| Core shield | +2 core | 3 | 1 |
| Socket CPU | +1 module slot on new sockets | 2 | 3 |
| PSU efficiency | +10 W per PSU | 3 | 1 |
| Thicker wires | +1 A per wire (+12 W) | 2 | 2 |
| Starting budget | +20 credits at map start | 3 | 1 |
| Wave bonus | +5% credits after each wave | 3 | 2 |
| Fast charging | +5 W socket charging | 2 | 2 |

**Library capacity** ties the chapters together: functions you write (in_range in 1A, pick_target in 2A, ...) are kept in your profile; at the start of a map you choose which of them come along, up to your capacity. More capacity = more of your own tools. Writing them is always required the first time (the lesson's "Show solution" stays for people who don't want to).

### Balancing across chapters
- Each map is tuned with the bots twice: **no boosts** (must still be winnable by the learner bot) and **expected boosts for that point** (stars available so far ≈ 2 per map before it).
- Total boost power stays under about +25% by chapter 5, so later maps never become trivial for players who bought everything.
- In-map upgrades (PSU/socket ⬆) reset every map; the Lab is the only thing that carries over.

### Built so far (2026-11-25)
- Stars (3 per map, goals in `MAPS[].goal`), shown on campaign cards and the win screen ("new!" for stars earned this time).
- Lab (`LAB` + `labBoost()` in data.js, 🧪 button on the campaign screen and the win screen), per player, with reset. Boosts are applied when a map starts or restarts (`game.boost`).
- Library capacity: functions kept with `keeps:` are offered on maps with a Library; with more functions than capacity a "Pack your Library" window lets the player choose.
- Bots: `S.report(map, boost)` tests with a boost set, e.g. `labBoost({ core: 1, budget: 1, psu: 1 })`.
- Map 2 results: no boosts: learner wins (core 10/20), others lose. 3 stars (core, budget, psu): learner 12/22, others still lose. **All boosts maxed (35 stars): even templatesOnly wins**, so maps in later chapters must be tuned for the stars a player can have by then.

### Chapters 1 and 2 complete (2026-11-25)
- **1B Motherboard · Overclock** (`motherboard-x`): 8 waves, one skill check per wave (careful cannons, in_range again, pulse discipline, power plan, laser + power, beetles first, lead the target, Rootkit). ★★★: no turret ever browned out. Bots: learner wins (core 8/20), others lose at waves 6-8.
- **2B Graphics card · Render farm** (`gpu-x`): 8 waves, two lanes that merge late, Library checks (lib everywhere, True/False helper, dictionary, sorted, defaults, f-string, 3 helpers). ★★★: every turret uses lib and the Library has 3+ functions. `bossMul: 0.7` (new per-map boss strength) because towers spread over two separate lanes. Bots: learner wins (core 8/20), others lose at waves 6-7.
- Campaign order: 1A → 1B → 2A → 2B (each unlocks the next; "Play anyway" still works). Cards show labels like "1B".

### Chapter 3 complete (2026-11-25): RAM
- New module **`mem`** (shared notebook for all turrets: write/read/keys/clear; needs a module slot; emptied when a map starts).
- New turret **Slow field** (`field`): `field.on()/off()`, setting `field.slow` 10-60 %, uses slow × 0.45 W while on, no damage; enemies inside move slower (also their reported vx/vy).
- New enemies: **Memory leak** (grows 10 %/s up to 3× its starting health) and boss **Stack overflow** (grows up to 1.5×, bursts into 4 leaks). Growth caps use `growCap`.
- **3A RAM** (`ram`, 10 waves, ring path around a central CPU): append, Slow field, `in`, mem, while, leaks first, list comprehensions, modes, slices, boss. ★★★: two turrets share info via mem. Bots: learner wins (core 8/20), others lose.
- **3B RAM · Garbage collector** (`ram-x`, 8 waves, two merging lanes): exam. ★★★: use a Slow field and never brown out. Bots: learner wins (12/20), others lose.

### Chapter 4 complete (2026-11-25): Network card
- New module **`net`** (messages between turrets: `net.send(channel, value)`, `net.receive(channel)`, `net.channels()`; a message arrives on the next tick; needs a module slot).
- New turret **Arc** (`arc`): `arc.fire(target)` hits the target, then jumps to nearby enemies (each jump does 75 % of the last); energy per shot = damage × (1 + jumps) × 0.9 J; `arc.jumps` 1-5 (max jump distance 1.8 tiles).
- New enemies: **Packet** (fast, weak, comes in bursts) and **Router** (armor 2, sends out 3 packets when destroyed).
- Python topics: classes, `__init__`, methods, lists of objects, a simple protocol between turrets, objects that keep state.
- **4A Network card** (`net`, 10 waves, three lanes into one CPU). ★★★: two turrets work together with net. Bots: learner wins (12/20), others lose.
- **4B Network card · Packet storm** (`net-x`, 8 waves): exam. ★★★: use your own class and an Arc. Bots: learner wins (13/20), others lose.
- Sim fix: a bot that cannot afford a turret after building its socket now stops instead of crashing.

### Chapter 5 complete (2026-11-25): CPU (campaign finale)
- New module **`sched`** (scheduler): `sched.tick` (ticks this turret has run), `sched.every(n)` (True every n-th tick), `sched.spare()` (CPU lines left this tick). Needs a module slot. Teaches doing heavy work less often. (Sharing CPU lines between sockets from the roadmap was left out: it would need cross-turret CPU accounting for little teaching value.)
- New enemies: **Polymorphic virus** (`poly`, switches every 3 s between fast/no armor and slow/armor 8; `target.armor` shows the current form) and the final boss **Kernel panic** (`kernel`: armor 4, regenerating shield, calls in a virus every 6 s, bursts into 4 viruses, 15 core damage). Engine: `morph` and `spawns` on enemy definitions.
- Python topics: try/except, sorting with `key=lambda`, counting with dictionaries (`d.get(k, 0) + 1`), `break`, returning two values, efficiency with sched.
- **5A CPU** (`cpu`, 10 waves, two lanes that merge). ★★★: use sched and try/except. Bots: learner wins (5/20), others lose.
- **5B CPU · Kernel panic** (`cpu-x`, 8 waves, lanes from the left, the right and below into a central core). ★★★: 4 turret types and sched in 2 turrets. Bots: learner wins (6/20), others lose. The finale is meant to be tight.
- Lanes can now start on the right edge (spawn portal and glow follow the start side).
- Sim bots now give triple weight to a lane no turret covers yet (otherwise they never defended the right lane). Chapters 1-4 results did not change.

### Endless mode (2026-11-25)
- Every cleared campaign map gets an **∞ Endless** button on the campaign screen (with the player's best score).
- `findMap('endless:<id>')` in data.js builds the endless version of a map: same board, starter and unlocks (all unlocked from wave 1), at least 450 starting credits, starter turrets get the full template instead of a lesson stub.
- Waves are generated once per map (fixed seed, so every run of a map has the same waves): enemies from that map plus bugs and worms, 2-4 groups on random lanes, bigger groups and shorter gaps every wave, health +15 % per wave (linear, never less than the map's own growth). Every 10th wave adds the map's boss (or a Rootkit), +1 boss every 30 waves, boss health +35 % every 10 waves (`Game.bossMul`). 100 waves in total.
- Score = waves survived, saved per player (`cd.p.<pid>.endless`). No stars, no wave replay in endless.
- Bots with template code reach waves 9-23 depending on the map, so better code and upgrades go clearly further.
- Fix on the way: the wave preview now shows a boss's real health (with the map's boss multiplier).
