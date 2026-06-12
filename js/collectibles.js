// ============================================================
//  Collectibles – Denare & Power-ups.
//  Power-ups: 'shield' Schild der Legion (1 Treffer frei)
//             'magnet' Magnet-Amulett (zieht Münzen an)
//             'boost'  Merkurs Sandalen (Tempo + unverwundbar)
//             'laurel' Lorbeer des Ruhms (×2 Punkte)
// ============================================================
import * as THREE from 'three';
import { CONFIG, laneToX } from './config.js';

const COIN_POOL = 90;
export const POWER_TYPES = ['shield', 'magnet', 'boost', 'laurel'];

export class Collectibles {
  constructor(scene) {
    this.scene = scene;
    this._t = 0;

    // ---------- Münzen ----------
    const coinGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.09, 16);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xf2b234, metalness: 0.85, roughness: 0.25,
      emissive: 0x59390a, emissiveIntensity: 0.55,
    });
    this.coins = [];
    for (let i = 0; i < COIN_POOL; i++) {
      const m = new THREE.Mesh(coinGeo, coinMat);
      m.rotation.x = Math.PI / 2; // Fläche zum Spieler
      m.visible = false;
      m.castShadow = true;
      scene.add(m);
      this.coins.push({ mesh: m, alive: false, collectAnim: 0, x: 0, y: 0, z: 0, spin: Math.random() * 6 });
    }

    // ---------- Power-ups ----------
    this.powerMats = {
      shield: new THREE.MeshStandardMaterial({ color: 0xb8332f, roughness: 0.5, metalness: 0.3, emissive: 0x3a0d0d, emissiveIntensity: 0.6 }),
      magnet: new THREE.MeshStandardMaterial({ color: 0x4661a8, roughness: 0.3, metalness: 0.6, emissive: 0x16224a, emissiveIntensity: 0.8 }),
      boost:  new THREE.MeshStandardMaterial({ color: 0xf6f1e3, roughness: 0.4, metalness: 0.2, emissive: 0x6b5a2a, emissiveIntensity: 0.4 }),
      laurel: new THREE.MeshStandardMaterial({ color: 0x5d8a3a, roughness: 0.5, metalness: 0.2, emissive: 0x1d3310, emissiveIntensity: 0.5 }),
      gold:   new THREE.MeshStandardMaterial({ color: 0xd9a93e, roughness: 0.3, metalness: 0.8 }),
    };
    this.beamMat = new THREE.MeshBasicMaterial({
      color: 0xffd76a, transparent: true, opacity: 0.22,
      depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    });
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd76a, transparent: true, opacity: 0.5, depthWrite: false,
    });

    this.powerPool = { shield: [], magnet: [], boost: [], laurel: [] };
    this.powers = []; // aktive
  }

  // ---------- Power-up-Meshes ----------
  _buildPower(type) {
    const M = this.powerMats;
    const g = new THREE.Group();
    const item = new THREE.Group();

    switch (type) {
      case 'shield': { // kleines Scutum mit goldenem Buckel
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.12), M.shield);
        const boss = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), M.gold);
        boss.position.z = 0.1;
        const rim = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.93, 0.06), M.gold);
        rim.position.z = -0.05;
        item.add(rim, plate, boss);
        break;
      }
      case 'magnet': { // Amulett: goldener Ring mit blauem Stein
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.09, 10, 22), M.gold);
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), M.magnet);
        item.add(ring, gem);
        break;
      }
      case 'boost': { // Merkurs Sandale mit Flügeln
        const sole = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.72), M.gold);
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.16), M.shield);
        strap.position.set(0, 0.12, 0.1);
        const wingGeo = new THREE.PlaneGeometry(0.42, 0.26);
        const wingMat = M.boost;
        const wL = new THREE.Mesh(wingGeo, wingMat);
        wL.position.set(-0.22, 0.2, -0.18); wL.rotation.set(0, 0.5, 0.5);
        const wR = new THREE.Mesh(wingGeo, wingMat);
        wR.position.set(0.22, 0.2, -0.18); wR.rotation.set(0, -0.5, -0.5);
        wingMat.side = THREE.DoubleSide;
        item.add(sole, strap, wL, wR);
        break;
      }
      case 'laurel': { // Lorbeerkranz mit Goldband
        const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.1, 8, 20), M.laurel);
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 6, 20), M.gold);
        band.rotation.y = 0.4;
        for (let i = 0; i < 8; i++) {
          const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 5), M.laurel);
          const a = (i / 8) * Math.PI * 2;
          leaf.position.set(Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0);
          leaf.rotation.z = a - Math.PI / 2;
          item.add(leaf);
        }
        item.add(wreath, band);
        break;
      }
    }
    item.position.y = 1.35;
    item.traverse(m => { if (m.isMesh) m.castShadow = true; });

    // Lichtsäule + Bodenring – aus der Ferne klar erkennbar
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 5.5, 12, 1, true), this.beamMat);
    beam.position.y = 2.75;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.85, 22), this.ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;

    g.add(beam, ring, item);
    g.userData.item = item;
    g.userData.ring = ring;
    g.visible = false;
    this.scene.add(g);
    return g;
  }

  // ---------- Spawning ----------
  _coin(x, y, z) {
    const c = this.coins.find(c => !c.alive && c.collectAnim <= 0);
    if (!c) return;
    c.alive = true;
    c.collectAnim = 0;
    c.x = x; c.y = y; c.z = z;
    c.mesh.position.set(x, y, z);
    c.mesh.scale.setScalar(1);
    c.mesh.visible = true;
  }

  line(lane, z, count = 6, spacing = 2.1, y = 1.05) {
    const x = laneToX(lane);
    for (let i = 0; i < count; i++) this._coin(x, y, z - i * spacing);
  }

  /** Münzbogen über einem Sprung-Hindernis bei zCenter */
  arc(lane, zCenter, count = 7) {
    const x = laneToX(lane);
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const dz = (t - 0.5) * 9.5;
      const y = 1.0 + Math.sin(t * Math.PI) * 1.9;
      this._coin(x, y, zCenter - dz);
    }
  }

  /** Niedrige Münzreihe unter einem Torbalken (Belohnung fürs Rutschen) */
  slideLine(lane, z, count = 4) {
    const x = laneToX(lane);
    for (let i = 0; i < count; i++) this._coin(x, 0.55, z + 1.5 - i * 1.5);
  }

  /** Zickzack über die Spuren – lädt zu Spurwechseln ein */
  zigzag(z, count = 9) {
    const seq = [0, 1, 2, 1];
    for (let i = 0; i < count; i++) {
      this._coin(laneToX(seq[i % 4]), 1.05, z - i * 2.4);
    }
  }

  /** Münzring um ein Power-up */
  ringAt(lane, z) {
    const x = laneToX(lane);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this._coin(x + Math.cos(a) * 1.1 * 0.001, 1.2 + Math.sin(a) * 0.7, z + Math.cos(a) * 1.4);
    }
  }

  powerup(type, lane, z) {
    const pool = this.powerPool[type];
    const mesh = pool.pop() || this._buildPower(type);
    mesh.visible = true;
    mesh.position.set(laneToX(lane), 0, z);
    this.powers.push({ type, mesh, lane, z, alive: true });
  }

  // ---------- Update ----------
  /**
   * @param {Object} pc        Spielerzentrum {x,y,z}
   * @param {boolean} magnet   Magnet aktiv?
   * @param {Function} onCoin  (pos:Vector3)
   * @param {Function} onPower (type, pos:Vector3)
   */
  update(dt, playerZ, pc, magnet, onCoin, onPower) {
    this._t += dt;

    for (const c of this.coins) {
      if (c.collectAnim > 0) { // Einsammel-Animation: hochziehen & schrumpfen
        c.collectAnim -= dt;
        c.mesh.position.y += dt * 4;
        const s = Math.max(0.01, c.collectAnim / 0.18);
        c.mesh.scale.setScalar(s);
        if (c.collectAnim <= 0) c.mesh.visible = false;
        continue;
      }
      if (!c.alive) continue;

      // Magnet zieht heran
      if (magnet) {
        const dx = pc.x - c.x, dy = pc.y - c.y, dz = pc.z - c.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < CONFIG.magnetRadius * CONFIG.magnetRadius) {
          const pull = Math.min(1, (16 / Math.max(0.5, Math.sqrt(d2))) * dt);
          c.x += dx * pull; c.y += dy * pull; c.z += dz * pull;
        }
      }

      c.spin += dt * 4;
      c.mesh.position.set(c.x, c.y + Math.sin(this._t * 3 + c.x) * 0.05, c.z);
      c.mesh.rotation.z = c.spin; // dreht um die Hochachse (Mesh ist x-rotiert)

      // Einsammeln?
      const cdx = Math.abs(pc.x - c.x), cdy = Math.abs(pc.y - c.y), cdz = Math.abs(pc.z - c.z);
      if (cdz < 0.95 && cdx < 1.0 && cdy < 1.15) {
        c.alive = false;
        c.collectAnim = 0.18;
        onCoin?.(c.mesh.position.clone());
        continue;
      }

      // hinter dem Spieler -> weg
      if (c.z > playerZ + CONFIG.behind) { c.alive = false; c.mesh.visible = false; }
    }

    for (let i = this.powers.length - 1; i >= 0; i--) {
      const p = this.powers[i];
      const item = p.mesh.userData.item;
      item.rotation.y += dt * 1.6;
      item.position.y = 1.35 + Math.sin(this._t * 2.4 + p.z) * 0.12;
      p.mesh.userData.ring.rotation.z += dt * 0.8;

      const dx = Math.abs(pc.x - p.mesh.position.x);
      const dz = Math.abs(pc.z - p.z);
      if (dz < 1.3 && dx < 1.15 && pc.y < 3) {
        onPower?.(p.type, item.getWorldPosition(new THREE.Vector3()));
        this._releasePower(p, i);
        continue;
      }
      if (p.z > playerZ + CONFIG.behind) this._releasePower(p, i);
    }
  }

  _releasePower(p, idx) {
    p.mesh.visible = false;
    this.powerPool[p.type].push(p.mesh);
    this.powers.splice(idx, 1);
  }

  reset() {
    for (const c of this.coins) { c.alive = false; c.collectAnim = 0; c.mesh.visible = false; }
    for (let i = this.powers.length - 1; i >= 0; i--) this._releasePower(this.powers[i], i);
    this._t = 0;
  }
}
