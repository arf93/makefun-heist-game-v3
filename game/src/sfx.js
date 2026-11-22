// sfx.js — tiny WebAudio bleeps, all synthesised in code (no audio files).
// Every sound is a short oscillator blip. If the browser has no audio
// (or the player muted with M), every call is a silent no-op.

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  // Lazily create the context on first user gesture (browsers demand it).
  ensure() {
    if (this.ctx || typeof window === 'undefined') return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // One blip: `freq` Hz, `dur` seconds, `type` waveform, `gain` volume.
  blip(freq, dur, type = 'sine', gain = 0.08) {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const amp = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      amp.gain.setValueAtTime(gain, t);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(amp);
      amp.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
    } catch {
      // Audio is decoration; never let it break the game.
    }
  }

  // A two-note rising chirp (a watcher just noticed something).
  alert() {
    this.blip(660, 0.09, 'square', 0.05);
    setTimeout(() => this.blip(880, 0.12, 'square', 0.05), 90);
  }

  // A soft chime when the Sunstone is pocketed.
  pickup() {
    this.blip(523, 0.1, 'sine', 0.09);
    setTimeout(() => this.blip(784, 0.16, 'sine', 0.09), 100);
  }

  // A low buzz when the alarm fills and the thief is caught.
  caught() {
    this.blip(180, 0.35, 'sawtooth', 0.08);
  }

  // A little fanfare for the clean getaway.
  win() {
    this.blip(523, 0.12, 'sine', 0.09);
    setTimeout(() => this.blip(659, 0.12, 'sine', 0.09), 120);
    setTimeout(() => this.blip(784, 0.22, 'sine', 0.09), 240);
  }

  // A soft puff when a smoke bomb pops.
  puff() {
    this.blip(220, 0.18, 'triangle', 0.06);
  }
}
