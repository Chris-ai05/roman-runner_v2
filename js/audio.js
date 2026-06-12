// ============================================================
//  AudioManager – alle Sounds werden live per WebAudio
//  synthetisiert (Münzen, Sprung, Crash, Fanfare, Musik).
//  Keine externen Dateien, kein Preload.
// ============================================================
import { store } from './config.js';

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuf = null;
    this.muted = store.get('vr_muted', false);
    this._musicTimer = null;
    this._step = 0;
    this._nextT = 0;
  }

  // Muss durch eine Nutzergeste aufgerufen werden (Autoplay-Regeln)
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
      // Rausch-Puffer für Crash/Rutschen vorbereiten
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.startMusic();
  }

  setMuted(m) {
    this.muted = m;
    store.set('vr_muted', m);
    if (this.master) this.master.gain.value = m ? 0 : 0.9;
  }
  toggle() { this.setMuted(!this.muted); return this.muted; }

  // ---------- Bausteine ----------
  _tone({ f = 440, f2 = null, t = 0, dur = 0.15, type = 'sine', vol = 0.2, attack = 0.004 }) {
    if (!this.ctx) return;
    const start = this.ctx.currentTime + t;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, start);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(vol, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(this.master);
    o.start(start); o.stop(start + dur + 0.05);
  }

  _noise({ t = 0, dur = 0.25, vol = 0.25, freq = 800, q = 0.8, type = 'bandpass' }) {
    if (!this.ctx) return;
    const start = this.ctx.currentTime + t;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const fl = this.ctx.createBiquadFilter();
    fl.type = type; fl.frequency.value = freq; fl.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(fl).connect(g).connect(this.master);
    src.start(start); src.stop(start + dur + 0.05);
  }

  // ---------- Effekte ----------
  play(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'click':
        this._tone({ f: 660, dur: 0.06, type: 'triangle', vol: 0.12 });
        break;
      case 'coin':
        this._tone({ f: 1318, dur: 0.09, type: 'sine', vol: 0.16 });
        this._tone({ f: 1760, t: 0.06, dur: 0.12, type: 'sine', vol: 0.14 });
        break;
      case 'jump':
        this._tone({ f: 300, f2: 640, dur: 0.18, type: 'triangle', vol: 0.16 });
        break;
      case 'slide':
        this._noise({ dur: 0.28, vol: 0.14, freq: 600, q: 0.6 });
        break;
      case 'hit':
        this._noise({ dur: 0.35, vol: 0.4, freq: 350, q: 0.5 });
        this._tone({ f: 160, f2: 50, dur: 0.45, type: 'sawtooth', vol: 0.3 });
        break;
      case 'smash':
        this._noise({ dur: 0.22, vol: 0.3, freq: 900, q: 0.4 });
        this._tone({ f: 220, f2: 90, dur: 0.2, type: 'square', vol: 0.12 });
        break;
      case 'power':
        [523, 659, 784, 1046].forEach((f, i) =>
          this._tone({ f, t: i * 0.07, dur: 0.16, type: 'triangle', vol: 0.16 }));
        break;
      case 'shield':
        this._tone({ f: 880, f2: 440, dur: 0.25, type: 'square', vol: 0.14 });
        this._noise({ dur: 0.2, vol: 0.18, freq: 2400, q: 1.2 });
        break;
      case 'milestone':
        [392, 523, 659, 784].forEach((f, i) =>
          this._tone({ f, t: i * 0.1, dur: 0.3, type: 'triangle', vol: 0.15 }));
        this._tone({ f: 784, t: 0.4, dur: 0.5, type: 'triangle', vol: 0.16 });
        break;
      case 'horn': // Warnung: Streitwagen!
        this._tone({ f: 196, f2: 175, dur: 0.55, type: 'sawtooth', vol: 0.2 });
        this._tone({ f: 392, f2: 350, dur: 0.55, type: 'sawtooth', vol: 0.1 });
        break;
      case 'record':
        [659, 784, 988, 1318, 1568].forEach((f, i) =>
          this._tone({ f, t: i * 0.09, dur: 0.35, type: 'triangle', vol: 0.15 }));
        break;
    }
  }

  // ---------- Generative Hintergrund-„Lyra" ----------
  startMusic() {
    if (!this.ctx || this._musicTimer) return;
    this._nextT = this.ctx.currentTime + 0.15;
    this._step = 0;
    this._musicTimer = setInterval(() => this._scheduleMusic(), 110);
  }

  stopMusic() {
    if (this._musicTimer) { clearInterval(this._musicTimer); this._musicTimer = null; }
  }

  _scheduleMusic() {
    if (!this.ctx) return;
    const beat = 60 / 92 / 2; // Achtel bei 92 BPM
    while (this._nextT < this.ctx.currentTime + 0.4) {
      this._musicStep(this._step, this._nextT);
      this._nextT += beat;
      this._step = (this._step + 1) % 32;
    }
  }

  _musicStep(i, t0) {
    // A-Moll-Pentatonik, „gezupfte" Dreiecksklänge mit Echo
    const scale = [220, 261.6, 293.7, 329.6, 392, 440, 523.3];
    const seq = [0, -1, 2, -1, 4, -1, 3, -1, 5, -1, 4, -1, 2, -1, 1, -1,
                 0, -1, 2, 4, -1, 5, -1, 4, 3, -1, 2, -1, 1, -1, 0, -1];
    const dt = t0 - this.ctx.currentTime;
    const n = seq[i];
    if (n >= 0) {
      this._tone({ f: scale[n], t: dt, dur: 0.5, type: 'triangle', vol: 0.045 });
      this._tone({ f: scale[n] * 2, t: dt + 0.19, dur: 0.4, type: 'triangle', vol: 0.018 });
    }
    if (i % 8 === 0) this._tone({ f: 110, t: dt, dur: 0.9, type: 'sine', vol: 0.05 });
    if (i % 4 === 2) this._noise({ t: dt, dur: 0.05, vol: 0.012, freq: 5000, q: 1 });
  }
}
