// @ts-check
// FM-synth music in the spirit of AdLib / Sound Blaster cards.
// Tunes are note lists from banks.yaml: "C5:1 E5:1 G5:2 -:1".
// On iPhone/iPad, Web Audio stays quiet while the ringer switch is on silent.

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function freq(name) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(name);
  if (!m) return 0;
  let n = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const midi = (Number(m[3]) + 1) * 12 + n;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class Sound {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;
    this.muted = false;
    this.tunes = {};
    /** @type {GainNode|null} */
    this.master = null;
  }

  /** Must be called from a tap (browsers require a gesture to start audio). */
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.18;
    this.master.connect(this.ctx.destination);
  }

  setMuted(m) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.18, this.ctx.currentTime, 0.02);
  }

  /** Two-operator FM voice: a modulator wobbles the carrier's pitch. */
  voice(f, t, dur, bright = 1) {
    const ctx = this.ctx; if (!ctx || !this.master || !f) return;
    const car = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const amp = ctx.createGain();
    car.type = 'sine'; mod.type = 'sine';
    car.frequency.value = f;
    mod.frequency.value = f * 2;          // 2:1 ratio, a bright organ-like tone
    modGain.gain.setValueAtTime(f * 2.2 * bright, t);
    modGain.gain.exponentialRampToValueAtTime(f * 0.3 * bright + 1, t + dur);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(0.9, t + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.35, t + Math.min(0.12, dur * 0.5));
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    mod.connect(modGain); modGain.connect(car.frequency);
    car.connect(amp); amp.connect(this.master);
    car.start(t); mod.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
  }

  /** Bass under the melody: one octave down, softer, on note starts. */
  bass(f, t, dur) {
    this.voice(f / 2, t, dur, 0.5);
  }

  /**
   * Play a named tune. Returns how long it lasts, in ms.
   * @param {string} name
   * @param {{music?: boolean}} [opts] music:true adds a bass line
   */
  play(name, opts = {}) {
    const tune = this.tunes[name];
    if (!tune || !this.ctx || this.muted) return 0;
    const eighth = 60 / (tune.tempo || 140) / 2;
    let t = this.ctx.currentTime + 0.05;
    const start = t;
    for (const tok of String(tune.notes).trim().split(/\s+/)) {
      const [n, len] = tok.split(':');
      const d = eighth * (Number(len) || 1);
      if (n !== '-') {
        const f = freq(n);
        this.voice(f, t, d * 0.95);
        if (opts.music) this.bass(f, t, d * 0.9);
      }
      t += d;
    }
    return (t - start) * 1000;
  }
}
