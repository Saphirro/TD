import { PyRuntime } from './python.js';
import { Game } from './game.js';
import { Renderer } from './render.js';
import { UI } from './ui.js';
import { installPhone } from './phone.js';

const py = new PyRuntime();
const game = new Game(py);
const renderer = new Renderer(document.getElementById('board'), game);
const ui = new UI(game, renderer, py);
renderer.ui = ui;
installPhone(ui);
ui.boot();

new ResizeObserver(() => renderer.resize()).observe(document.getElementById('stage'));

py.load(s => ui.bootStatus(s))
  .then(() => { game.onPythonReady(); ui.bootDone(); })
  .catch(e => ui.bootFailed(e));

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!ui.paused) game.advance(dt * ui.speed);
  renderer.draw(dt);
  ui.frame(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__cd = { game, ui, py }; // handy for debugging in the console
