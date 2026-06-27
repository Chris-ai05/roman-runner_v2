// ============================================================
//  Player – ein kleiner Legionär aus Three.js-Primitiven.
//  Laufzyklus, Sprung mit Sturzflug, Rutschen, Spurwechsel
//  mit Lean, Schild-Aura, Boost-Glühen und Sturz-Animation.
// ============================================================
import * as THREE from 'three';
import { CONFIG, clamp, laneToX, lerp } from './config.js';
import { SKINS, DEFAULT_SKIN, getSkin } from './skins.js';

// Effekt-Meshes (skin-unabhängig): Schild-Aura, Boost-Glühen, Blob-Schatten.
const FX = {
  aura: () => new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.05, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.85 })
  ),
  glow: () => new THREE.Mesh(
    new THREE.CircleGeometry(0.8, 20),
    new THREE.MeshBasicMaterial({ color: 0xffc04d, transparent: true, opacity: 0.35, depthWrite: false })
  ),
  blob: () => new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 18),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
  ),
};

export class Player {
  constructor(scene, effects, skinId) {
    this.effects = effects;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.skinId = null;
    this.cape = null;
    this._buildSkeleton();
    this.setSkin(skinId || DEFAULT_SKIN);
    this.reset();
  }

  // Skelett: bewegte Gruppen + Effekt-Meshes. Die sichtbaren Skin-Teile
  // hängen in eigenen „Art"-Containern, damit ein Skin-Wechsel nur diese
  // austauscht und die Animation (auf den Gruppen) unberührt bleibt.
  _buildSkeleton() {
    const g = this.group;

    // Rumpf-Anker (für Lean/Bob), Beine hängen direkt am Root
    this.body = new THREE.Group();
    g.add(this.body);
    this.bodyArt = new THREE.Group();
    this.body.add(this.bodyArt);

    // Arme (Pivot an der Schulter)
    this.armL = new THREE.Group(); this.armR = new THREE.Group();
    this.armL.position.set(-0.42, 1.42, 0);
    this.armR.position.set(0.42, 1.42, 0);
    this.body.add(this.armL, this.armR);
    this.armLArt = new THREE.Group(); this.armL.add(this.armLArt);
    this.armRArt = new THREE.Group(); this.armR.add(this.armRArt);

    // Beine (Pivot an der Hüfte) – am Root, damit Rutschen sauber aussieht
    this.legL = new THREE.Group(); this.legR = new THREE.Group();
    this.legL.position.set(-0.17, 0.72, 0);
    this.legR.position.set(0.17, 0.72, 0);
    g.add(this.legL, this.legR);
    this.legLArt = new THREE.Group(); this.legL.add(this.legLArt);
    this.legRArt = new THREE.Group(); this.legR.add(this.legRArt);

    // Schild-Aura (Power-up) – goldener Ring
    this.aura = FX.aura();
    this.aura.position.y = 1.0;
    this.aura.visible = false;
    g.add(this.aura);

    // Boost-Glühen um die Füße
    this.glow = FX.glow();
    this.glow.rotation.x = -Math.PI / 2;
    this.glow.position.y = 0.03;
    this.glow.visible = false;
    g.add(this.glow);

    // Weicher Blob-Schatten als Fallback-Verstärkung
    this.blob = FX.blob();
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.position.y = 0.02;
    g.add(this.blob);
  }

  /** Tauscht das sichtbare Erscheinungsbild (Skin) aus. */
  setSkin(id) {
    const skin = getSkin(id) || SKINS[0];
    this.skinId = skin.id;
    // Alte Skin-Meshes entfernen und ihre Geometrien freigeben
    // (Materialien sind in skins.js geteilt und bleiben bestehen).
    for (const art of [this.bodyArt, this.armLArt, this.armRArt, this.legLArt, this.legRArt]) {
      for (let i = art.children.length - 1; i >= 0; i--) {
        const c = art.children[i];
        art.remove(c);
        c.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
      }
    }
    const res = skin.build({
      body: this.bodyArt, armL: this.armLArt, armR: this.armRArt,
      legL: this.legLArt, legR: this.legRArt,
    });
    this.cape = (res && res.cape) || null;
  }

  reset() {
    this.lane = 1;
    this.x = 0;
    this.y = 0;            // Sprunghöhe
    this.vy = 0;
    this.sliding = false;
    this.slideT = 0;
    this.queueSlide = false;
    this.jumpBuffer = 0;
    this.dead = false;
    this.runT = 0;
    this.deathT = 0;
    this.group.position.set(0, 0, 0);
    this.group.rotation.set(0, 0, 0);
    this.body.rotation.set(0, 0, 0);
    this.body.position.set(0, 0, 0);
    this.aura.visible = false;
    this.glow.visible = false;
  }

  setZ(z) { this.group.position.z = z; }
  get z() { return this.group.position.z; }
  get airborne() { return this.y > 0.05; }
  get centerY() { return (this.sliding ? 0.45 : 0.9) + this.y; }

  setShield(on) { this.aura.visible = on; }
  setBoost(on) { this.glow.visible = on; }

  // ---------- Eingaben ----------
  left()  { if (!this.dead) this.lane = clamp(this.lane - 1, 0, 2); }
  right() { if (!this.dead) this.lane = clamp(this.lane + 1, 0, 2); }

  jump() {
    if (this.dead) return false;
    if (!this.airborne && this.vy <= 0.01) {
      this.vy = CONFIG.jumpV;
      this.y = Math.max(this.y, 0.001);
      this.sliding = false;
      return true;
    }
    this.jumpBuffer = 0.14; // kurz vor der Landung gedrückt -> wird nachgeholt
    return false;
  }

  slide() {
    if (this.dead) return false;
    if (this.airborne) {           // Sturzflug, dann rutschen
      this.vy = CONFIG.fastFallV;
      this.queueSlide = true;
      return false;
    }
    this.sliding = true;
    this.slideT = CONFIG.slideTime;
    return true;
  }

  die() {
    this.dead = true;
    this.deathT = 0;
    this.sliding = false;
  }

  /** Achsen-Box für Kollisionen */
  hitbox() {
    const h = this.sliding ? CONFIG.slideH : CONFIG.playerH;
    return {
      x: this.x,
      z: this.z,
      halfW: CONFIG.playerHalfW,
      halfD: CONFIG.playerHalfD,
      y0: this.y,
      y1: this.y + h,
    };
  }

  // ---------- Update ----------
  update(dt, speed, running) {
    const g = this.group;

    if (this.dead) {
      // Sturz nach vorn, kurz aufprallen
      this.deathT += dt;
      const t = Math.min(1, this.deathT * 2.2);
      this.body.rotation.x = lerp(this.body.rotation.x, 1.5, t * 0.2);
      this.y = Math.max(0, this.y - 9 * dt);
      g.position.y = this.y;
      g.position.x = this.x;
      return;
    }

    // Spur ansteuern (weich, mit Lean)
    const targetX = laneToX(this.lane);
    const prevX = this.x;
    this.x = lerp(this.x, targetX, Math.min(1, CONFIG.laneLerp * dt));
    const vx = (this.x - prevX) / Math.max(dt, 0.0001);
    g.position.x = this.x;
    g.rotation.z = clamp(-vx * 0.035, -0.35, 0.35);

    // Sprung / Schwerkraft
    if (this.airborne || this.vy > 0) {
      this.vy -= CONFIG.gravity * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0; this.vy = 0;
        this.effects.dust(new THREE.Vector3(this.x, 0.05, this.z + 0.3));
        if (this.queueSlide) { this.queueSlide = false; this.slide(); }
        else if (this.jumpBuffer > 0) { this.jumpBuffer = 0; this.jump(); }
      }
    }
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    g.position.y = this.y;

    // Rutschen
    if (this.sliding) {
      this.slideT -= dt;
      if (this.slideT <= 0) this.sliding = false;
    }

    // ---------- Animation ----------
    const moving = running && speed > 0.5;
    if (moving) this.runT += dt * (6 + speed * 0.65);

    const s = Math.sin(this.runT), c = Math.sin(this.runT + Math.PI);

    if (this.sliding) {
      this.body.rotation.x = lerp(this.body.rotation.x, -1.05, Math.min(1, 14 * dt));
      this.body.position.y = lerp(this.body.position.y, -0.42, Math.min(1, 14 * dt));
      this.body.position.z = lerp(this.body.position.z, 0.25, Math.min(1, 14 * dt));
      this.legL.rotation.x = lerp(this.legL.rotation.x, -1.4, Math.min(1, 14 * dt));
      this.legR.rotation.x = lerp(this.legR.rotation.x, -1.2, Math.min(1, 14 * dt));
      this.armL.rotation.x = -2.2; this.armR.rotation.x = -2.2;
    } else if (this.airborne) {
      this.body.rotation.x = lerp(this.body.rotation.x, 0.1, Math.min(1, 10 * dt));
      this.body.position.y = lerp(this.body.position.y, 0, Math.min(1, 10 * dt));
      this.body.position.z = lerp(this.body.position.z, 0, Math.min(1, 10 * dt));
      this.legL.rotation.x = lerp(this.legL.rotation.x, -0.9, Math.min(1, 12 * dt)); // angezogen
      this.legR.rotation.x = lerp(this.legR.rotation.x, 0.5, Math.min(1, 12 * dt));
      this.armL.rotation.x = lerp(this.armL.rotation.x, -2.6, Math.min(1, 12 * dt));
      this.armR.rotation.x = lerp(this.armR.rotation.x, -2.6, Math.min(1, 12 * dt));
    } else if (moving) {
      const lean = 0.12 + speed * 0.006;
      this.body.rotation.x = lerp(this.body.rotation.x, lean, Math.min(1, 10 * dt));
      this.body.position.y = Math.abs(Math.sin(this.runT)) * 0.06;
      this.body.position.z = lerp(this.body.position.z, 0, Math.min(1, 10 * dt));
      this.legL.rotation.x = s * 0.95;
      this.legR.rotation.x = c * 0.95;
      this.armL.rotation.x = c * 0.75;
      this.armR.rotation.x = s * 0.75;
      // Fußstaub im Takt
      if (Math.abs(s) > 0.985 && Math.random() < 0.5) {
        this.effects.dust(new THREE.Vector3(this.x + (s > 0 ? -0.15 : 0.15), 0.05, this.z + 0.4));
      }
    } else {
      // Idle (Menü): Atmen
      this.runT += dt * 1.6;
      this.body.rotation.x = lerp(this.body.rotation.x, 0, Math.min(1, 6 * dt));
      this.body.position.y = Math.sin(this.runT) * 0.02;
      this.legL.rotation.x = lerp(this.legL.rotation.x, 0, Math.min(1, 6 * dt));
      this.legR.rotation.x = lerp(this.legR.rotation.x, 0, Math.min(1, 6 * dt));
      this.armL.rotation.x = lerp(this.armL.rotation.x, 0.1, Math.min(1, 6 * dt));
      this.armR.rotation.x = lerp(this.armR.rotation.x, -0.1, Math.min(1, 6 * dt));
    }

    // Umhang flattert mit dem Tempo (nur Skins mit Umhang)
    if (this.cape) this.cape.rotation.x = 0.35 + Math.sin(this.runT * 1.7) * 0.12 + speed * 0.012;

    // Aura & Glow leicht pulsieren lassen
    if (this.aura.visible) {
      this.aura.rotation.x += dt * 1.2;
      this.aura.rotation.y += dt * 2.0;
      this.aura.material.opacity = 0.6 + Math.sin(this.runT * 3) * 0.25;
    }
    if (this.glow.visible) {
      const k = 1 + Math.sin(this.runT * 6) * 0.15;
      this.glow.scale.set(k, k, 1);
    }
    this.blob.scale.setScalar(1 - Math.min(0.55, this.y * 0.18));
  }
}
