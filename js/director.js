// ============================================================
//  Director – die „Spielleitung".
//  Wählt Muster (immer mit garantiert überlebbarem Pfad!),
//  skaliert Dichte & Tempo mit der Distanz und taktet
//  Power-ups sowie Streitwagen-Events.
// ============================================================
import { CONFIG, clamp, lerp, pick, randF, randI } from './config.js';
import { POWER_TYPES } from './collectibles.js';

const JUMPABLE = ['hurdle', 'crates', 'fire'];
const BLOCKERS = ['cart', 'statue'];

function shuffledLanes() {
  const l = [0, 1, 2];
  for (let i = 2; i > 0; i--) {
    const j = randI(0, i);
    [l[i], l[j]] = [l[j], l[i]];
  }
  return l;
}

export class Director {
  constructor(obstacles, coins, events = {}) {
    this.obs = obstacles;
    this.coins = coins;
    this.events = events;

    // Jedes Muster: {tier, build(z) -> Länge}
    this.patterns = [
      // ---------- Stufe 0: Aufwärmen ----------
      { tier: 0, build: (z) => { // einzelnes Sprung-Hindernis + Münzbogen
        const lane = randI(0, 2);
        this.obs.spawn(pick(JUMPABLE), lane, z);
        this.coins.arc(lane, z);
        return 10;
      }},
      { tier: 0, build: (z) => { // reine Münzreihe
        this.coins.line(randI(0, 2), z, 7);
        return 15;
      }},
      { tier: 0, build: (z) => { // Torbalken auf einer Spur + tiefe Münzen
        const lane = randI(0, 2);
        this.obs.spawn('beam', lane, z);
        this.coins.slideLine(lane, z);
        return 9;
      }},

      // ---------- Stufe 1 ----------
      { tier: 1, build: (z) => { // zwei Blocker, freie Spur belohnt
        const [a, b, free] = shuffledLanes();
        this.obs.spawn(pick(BLOCKERS), a, z);
        this.obs.spawn(pick(BLOCKERS), b, z);
        this.coins.line(free, z + 2, 6);
        return 13;
      }},
      { tier: 1, build: (z) => { // Balken über ALLE Spuren -> rutschen!
        for (const l of [0, 1, 2]) this.obs.spawn('beam', l, z);
        this.coins.slideLine(1, z);
        return 9;
      }},
      { tier: 1, build: (z) => { // riesige Säule über die ganze Straße
        this.obs.spawn('wide', 1, z);
        this.coins.arc(randI(0, 2), z);
        return 11;
      }},
      { tier: 1, build: (z) => { // Zickzack-Münzen (lädt zum Spurwechseln ein)
        this.coins.zigzag(z, 9);
        return 24;
      }},

      // ---------- Stufe 2 ----------
      { tier: 2, build: (z) => { // links/rechts dicht, Mitte springen
        const [a, b, mid] = shuffledLanes();
        this.obs.spawn(pick(BLOCKERS), a, z);
        this.obs.spawn(pick(BLOCKERS), b, z);
        this.obs.spawn(pick(JUMPABLE), mid, z);
        this.coins.arc(mid, z);
        return 13;
      }},
      { tier: 2, build: (z) => { // Slalom: versetzte Blocker
        const l1 = randI(0, 2);
        let l2 = randI(0, 2); if (l2 === l1) l2 = (l2 + 1) % 3;
        this.obs.spawn(pick(BLOCKERS), l1, z);
        this.obs.spawn(pick(BLOCKERS), l2, z - 8);
        this.coins.zigzag(z + 2, 7);
        return 21;
      }},
      { tier: 2, build: (z) => { // Kombo: erst springen, dann rutschen
        const [a, b, free] = shuffledLanes();
        this.obs.spawn(pick(BLOCKERS), a, z);
        this.obs.spawn(pick(BLOCKERS), b, z);
        this.obs.spawn(pick(JUMPABLE), free, z);
        this.obs.spawn(pick(BLOCKERS), a, z - 7.5);
        this.obs.spawn(pick(BLOCKERS), b, z - 7.5);
        this.obs.spawn('beam', free, z - 7.5);
        this.coins.arc(free, z);
        this.coins.slideLine(free, z - 7.5);
        return 17;
      }},

      // ---------- Stufe 3: Spießrutenlauf ----------
      { tier: 3, build: (z) => { // rutschen, dann alle springen
        for (const l of [0, 1, 2]) this.obs.spawn('beam', l, z);
        this.obs.spawn('wide', 1, z - 8.5);
        this.coins.slideLine(1, z);
        this.coins.arc(1, z - 8.5);
        return 19;
      }},
      { tier: 3, build: (z) => { // Slalom-Gasse über drei Stationen
        let lane = randI(0, 2);
        let zz = z;
        for (let k = 0; k < 3; k++) {
          for (const l of [0, 1, 2]) if (l !== lane) this.obs.spawn(pick(BLOCKERS), l, zz);
          this.coins.line(lane, zz + 1.5, 3, 1.8);
          const next = clamp(lane + pick([-1, 1]), 0, 2);
          lane = next === lane ? clamp(lane + pick([-1, 1]), 0, 2) : next;
          zz -= 9;
        }
        return 29;
      }},
      { tier: 3, build: (z) => { // Feuergasse (alles überspringbar, aber dicht)
        this.obs.spawn('fire', 0, z);
        this.obs.spawn('fire', 2, z);
        this.obs.spawn('fire', 1, z - 6);
        this.obs.spawn('fire', 0, z - 12);
        this.obs.spawn('fire', 1, z - 12);
        this.coins.arc(1, z - 6);
        return 17;
      }},
    ];
  }

  reset() {
    this.nextZ = -30;       // erstes Muster ~30 m voraus
    this.count = 0;
    this.lastIdx = -1;
    this.powerCd = randF(8, 12);
    this.chariotCd = randF(16, 22);
  }

  update(dt, playerZ, distance) {
    const d = clamp(distance / 1500, 0, 1); // Schwierigkeit 0..1
    this.powerCd -= dt;
    this.chariotCd -= dt;

    // Muster bis zum Spawn-Horizont auffüllen
    while (this.nextZ > playerZ - CONFIG.spawnAhead) {
      let len;

      if (this.powerCd <= 0) {
        // Power-up-Slot: freie Bahn, Lichtsäule, Münzring
        const lane = randI(0, 2);
        const type = pick(POWER_TYPES);
        this.coins.powerup(type, lane, this.nextZ);
        this.coins.ringAt(lane, this.nextZ);
        this.powerCd = randF(13, 20);
        len = 9;
      } else {
        const maxTier = this.count < 3 ? 0 : d < 0.18 ? 1 : d < 0.45 ? 2 : 3;
        const pool = this.patterns
          .map((p, i) => ({ p, i }))
          .filter(({ p, i }) => p.tier <= maxTier && i !== this.lastIdx);
        const { p, i } = pick(pool);
        this.lastIdx = i;
        len = p.build(this.nextZ);
      }

      const gap = lerp(26, 13, d) * randF(0.9, 1.15);
      this.nextZ -= len + gap;
      this.count++;
    }

    // Streitwagen-Event (ab mittlerer Schwierigkeit)
    if (this.chariotCd <= 0 && d > 0.22) {
      const lane = randI(0, 2);
      this.obs.spawnChariot(lane, playerZ - 95);
      this.events.chariot?.(lane);
      this.chariotCd = randF(14, 24) * (1 - d * 0.3);
    }
  }
}
