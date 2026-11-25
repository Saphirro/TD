import { PyRuntime } from './python.js';
import { Game } from './game.js';
import { Renderer } from './render.js';
import { UI } from './ui.js';
import { installPhone } from './phone.js';

// any script error during start-up is shown on the loading screen (so phone users can screenshot it)
const bootErrors = [];
const showBootError = msg => {
  bootErrors.push(msg);
  const b = document.querySelector('#boot span');
  if (b && !document.querySelector('#boot.done')) b.innerHTML = `Problem while starting:<br><small>${String(msg).replace(/[<>&]/g, '')}</small>`;
};
window.addEventListener('error', e => showBootError(e.message || e.error));
window.addEventListener('unhandledrejection', e => showBootError(e.reason?.message || e.reason));

export const VERSION = '2026.11.25-14';   // shown on the loading screen and in Settings (helps spot old cached copies)
window.CD_VERSION = VERSION;
const py = new PyRuntime();
const game = new Game(py);
const renderer = new Renderer(document.getElementById('board'), game);
const ui = new UI(game, renderer, py);
renderer.ui = ui;
// these must never stop Python from loading
try { installPhone(ui); } catch (e) { console.error(e); showBootError(`phone layout: ${e.message}`); }
try { ui.boot(); } catch (e) { console.error(e); showBootError(`start screen: ${e.message}`); }

new ResizeObserver(() => renderer.resize()).observe(document.getElementById('stage'));

function startPython() {
  const slow = setTimeout(() => {
    const b = document.querySelector('#boot span');
    if (b && !py.ready) b.innerHTML += '<br><small>This is taking long (slow connection or a browser that blocks it).</small><br><button class="ghost" id="boot-retry">Reload</button>';
    document.getElementById('boot-retry')?.addEventListener('click', () => location.reload());
  }, 30000);
  py.load(s => ui.bootStatus(s))
    .then(() => {
      clearTimeout(slow);
      try { game.onPythonReady(); } catch (e) { console.error(e); ui.toast(`Problem preparing turrets: ${e.message}`, 'bad'); }
      ui.bootDone();
    })
    .catch(e => { clearTimeout(slow); ui.bootFailed(e); });
}
startPython();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  try {
    if (!ui.paused) game.advance(dt * ui.speed);
    renderer.draw(dt);
    ui.frame(dt);
  } catch (e) {
    if (!frame.failed) { frame.failed = true; console.error(e); ui.toast(`Error: ${e.message}`, 'bad'); }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__cd = { game, ui, py, bootErrors }; // handy for debugging in the console
