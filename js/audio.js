// ---------------------------------------------------------------------------
// Tiny synthesized sound effects (WebAudio, no files). Rate-limited per sound.
// ---------------------------------------------------------------------------

function tone(c, out, t, { type = 'sine', f = 440, f2 = null, dur = 0.12, vol = 0.3, attack = 0.004 }) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t); o.stop(t + dur + 0.02);
}

let noiseBuf = null;
function noise(c, out, t, { dur = 0.2, vol = 0.3, freq = 1200, q = 0.8 }) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noiseBuf;
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(out);
  s.start(t); s.stop(t + dur);
}

const SOUNDS = {
  shoot: (c, o, t) => { tone(c, o, t, { type: 'square', f: 880, f2: 220, dur: 0.07, vol: 0.08 }); noise(c, o, t, { dur: 0.05, vol: 0.08, freq: 3000 }); },
  pulse: (c, o, t) => { tone(c, o, t, { type: 'sine', f: 160, f2: 50, dur: 0.35, vol: 0.35 }); noise(c, o, t, { dur: 0.25, vol: 0.12, freq: 400 }); },
  laser: (c, o, t) => tone(c, o, t, { type: 'sawtooth', f: 1400, f2: 1300, dur: 0.12, vol: 0.03 }),
  kill: (c, o, t) => { tone(c, o, t, { type: 'triangle', f: 520, f2: 900, dur: 0.08, vol: 0.12 }); noise(c, o, t, { dur: 0.12, vol: 0.1, freq: 1800 }); },
  boss: (c, o, t) => { noise(c, o, t, { dur: 0.9, vol: 0.4, freq: 300, q: 0.5 }); tone(c, o, t, { type: 'sine', f: 90, f2: 30, dur: 0.9, vol: 0.4 }); },
  leak: (c, o, t) => { tone(c, o, t, { type: 'sawtooth', f: 140, f2: 70, dur: 0.3, vol: 0.18 }); },
  build: (c, o, t) => { tone(c, o, t, { type: 'triangle', f: 660, dur: 0.05, vol: 0.12 }); tone(c, o, t + 0.05, { type: 'triangle', f: 990, dur: 0.06, vol: 0.1 }); },
  sell: (c, o, t) => { tone(c, o, t, { type: 'triangle', f: 700, f2: 300, dur: 0.12, vol: 0.12 }); },
  upload: (c, o, t) => { [523, 659, 784].forEach((f, i) => tone(c, o, t + i * 0.05, { type: 'square', f, dur: 0.06, vol: 0.06 })); },
  error: (c, o, t) => { tone(c, o, t, { type: 'square', f: 200, dur: 0.1, vol: 0.08 }); tone(c, o, t + 0.12, { type: 'square', f: 150, dur: 0.14, vol: 0.08 }); },
  wave: (c, o, t) => { [220, 277, 330, 440].forEach((f, i) => tone(c, o, t + i * 0.07, { type: 'sawtooth', f, dur: 0.12, vol: 0.06 })); },
  clear: (c, o, t) => { [523, 659, 784, 1047].forEach((f, i) => tone(c, o, t + i * 0.08, { type: 'triangle', f, dur: 0.18, vol: 0.12 })); },
  brownout: (c, o, t) => { tone(c, o, t, { type: 'sawtooth', f: 400, f2: 60, dur: 0.45, vol: 0.12 }); },
  task: (c, o, t) => { tone(c, o, t, { type: 'sine', f: 880, dur: 0.1, vol: 0.12 }); tone(c, o, t + 0.09, { type: 'sine', f: 1320, dur: 0.16, vol: 0.12 }); },
  lost: (c, o, t) => { [392, 330, 262, 196].forEach((f, i) => tone(c, o, t + i * 0.18, { type: 'sawtooth', f, dur: 0.25, vol: 0.1 })); },
  won: (c, o, t) => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, o, t + i * 0.1, { type: 'triangle', f, dur: 0.3, vol: 0.14 })); },
};

// minimum ms between two plays of the same sound (busy waves stay pleasant)
const RATE = { shoot: 70, kill: 60, laser: 220, pulse: 120, leak: 150 };

export class Sfx {
  constructor() {
    this.ctx = null;
    this.last = {};
    this.quiet = false;   // set by the balance bots
    try { this.muted = localStorage.getItem('cd.mute') === '1'; } catch { this.muted = false; }
    // browsers only allow audio after a user gesture
    const unlock = () => { this.ensure(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  play(name) {
    if (this.muted || this.quiet || !this.ctx || this.ctx.state !== 'running') return;
    const now = performance.now();
    if (now - (this.last[name] || 0) < (RATE[name] ?? 40)) return;
    this.last[name] = now;
    SOUNDS[name]?.(this.ctx, this.master, this.ctx.currentTime);
  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('cd.mute', m ? '1' : '0'); } catch { /* ignore */ }
  }
}
