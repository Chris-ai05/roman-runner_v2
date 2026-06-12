// ============================================================
//  VIA ROMANA – zentrale Konfiguration & kleine Helfer
//  Alle Stellschrauben fürs Gameplay-Tuning an einem Ort.
// ============================================================

export const CONFIG = {
  // Spuren
  laneX: 2.2,            // Abstand der Spuren von der Mitte
  lanes: 3,

  // Welt
  segLen: 26,            // Länge eines Straßensegments
  segCount: 11,          // Anzahl recycelter Segmente
  roadW: 8,              // Straßenbreite
  fogNear: 38,
  fogFar: 165,
  camFar: 260,

  // Tempo & Schwierigkeit
  baseSpeed: 11,
  maxSpeed: 25,
  accel: 0.16,           // Tempo-Zuwachs pro Sekunde
  boostMult: 1.5,        // Merkurs Sandalen

  // Spieler-Physik
  gravity: 28,
  jumpV: 11.6,
  fastFallV: -22,        // "Runter" in der Luft -> Sturzflug
  slideTime: 0.85,
  laneLerp: 13,          // Wie schnell der Spurwechsel zieht
  playerH: 1.8,
  slideH: 0.85,
  playerHalfW: 0.42,
  playerHalfD: 0.35,

  // Spawning
  spawnAhead: 135,       // Wie weit voraus Muster erzeugt werden
  behind: 16,            // Ab hier wird hinter dem Spieler recycelt

  // Power-ups (Dauer in Sekunden)
  magnetTime: 8,
  boostTime: 4.5,
  laurelTime: 10,
  magnetRadius: 7,

  // Punkte
  coinScore: 25,
  nearMissScore: 15,
  smashScore: 15,
  milestoneEvery: 500,
  milestoneScore: 250,
};

// ---------- Mathe-Helfer ----------
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const randF = (a, b) => a + Math.random() * (b - a);
export const randI = (a, b) => Math.floor(randF(a, b + 1));
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];

export const laneToX = (lane) => (lane - 1) * CONFIG.laneX; // lane 0..2 -> -x..+x

// Römische Zahlen für Meilensteine & Multiplikator
export function toRoman(n) {
  const M = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let s = '';
  for (const [v, r] of M) while (n >= v) { s += r; n -= v; }
  return s || 'N';
}

// ---------- localStorage mit Schutz (Privatmodus etc.) ----------
export const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* egal */ }
  },
};
