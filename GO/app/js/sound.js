// Little WebAudio blips so pieces "feel" alive (no words needed).
export class Sound {
  constructor() { this.ctx = null; }
  unlock() { try { this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); } catch (e) { this.ctx = null; } }
  _tone(freq, ms = 90, type = 'sine', gain = 0.08) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = gain;
    o.connect(g); g.connect(this.ctx.destination);
    const t = this.ctx.currentTime; o.start(t); g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000); o.stop(t + ms / 1000 + 0.02);
  }
  pop() { this._tone(660, 70, 'triangle'); }
  tick() { this._tone(520, 60, 'square', 0.05); }
  start() { this._tone(440, 80); setTimeout(() => this._tone(660, 120), 90); }
  finish() { this._tone(523, 90); setTimeout(() => this._tone(659, 90), 100); setTimeout(() => this._tone(784, 160), 200); }
  stop() { this._tone(330, 160, 'sawtooth', 0.05); }
  nope() { this._tone(200, 180, 'square', 0.06); }
}
