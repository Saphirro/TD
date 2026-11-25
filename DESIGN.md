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
