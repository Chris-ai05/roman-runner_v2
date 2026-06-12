// ============================================================
//  Player – ein kleiner Legionär aus Three.js-Primitiven.
//  Laufzyklus, Sprung mit Sturzflug, Rutschen, Spurwechsel
//  mit Lean, Schild-Aura, Boost-Glühen und Sturz-Animation.
// ============================================================
import * as THREE from 'three';
import { CONFIG, clamp, laneToX, lerp } from './config.js';

const M = {
  skin:    new THREE.MeshStandardMaterial({ color: 0xc98e5a, roughness: 0.8 }),
  tunic:   new THREE.MeshStandardMaterial({ color: 0x8e1f2f, roughness: 0.85 }),
  gold:    new THREE.MeshStandardMaterial({ color: 0xd9a93e, roughness: 0.35, metalness: 0.7 }),
  bronze:  new THREE.MeshStandardMaterial({ color: 0xa07a3a, roughness: 0.4, metalness: 0.6 }),
  leather: new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 }),
  plume:   new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.8 }),
  cape:    new THREE.MeshStandardMaterial({ color: 0x7a1624, roughness: 0.9, side: THREE.DoubleSide }),
};

function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  return m;
}

export class Player {
  constructor(scene, effects) {
    this.effects = effects;
    this.group = new THREE.Group();
    scene.add(this.group);
    this._build();
    this.reset();
  }

  _build() {
    const g = this.group;

    // Rumpf-Anker (für Lean/Bob), Beine hängen direkt am Root
    this.body = new THREE.Group();
    g.add(this.body);

    // Torso & Tunika
    const torso = box(0.62, 0.62, 0.36, M.tunic);
    torso.position.y = 1.18;
    this.body.add(torso);
    const belt = box(0.66, 0.12, 0.4, M.gold);
    belt.position.y = 0.92;
    this.body.add(belt);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.3, 8), M.leather);
    skirt.position.y = 0.76; skirt.castShadow = true;
    this.body.add(skirt);

    // Kopf + Helm mit rotem Kamm
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), M.skin);
    head.position.y = 1.72; head.castShadow = true;
    this.body.add(head);
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.235, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), M.bronze);
    helm.position.y = 1.76; helm.castShadow = true;
    this.body.add(helm);
    const crest = box(0.07, 0.16, 0.42, M.plume);
    crest.position.set(0, 1.97, 0);
    this.body.add(crest);

    // Arme (Pivot an der Schulter)
    this.armL = new THREE.Group(); this.armR = new THREE.Group();
    this.armL.position.set(-0.42, 1.42, 0);
    this.armR.position.set(0.42, 1.42, 0);
    for (const [grp, side] of [[this.armL, -1], [this.armR, 1]]) {
      const upper = box(0.16, 0.34, 0.16, M.skin); upper.position.y = -0.16;
      const lower = box(0.14, 0.3, 0.14, M.skin); lower.position.y = -0.46;
      const cuff = box(0.17, 0.08, 0.17, M.bronze); cuff.position.y = -0.3;
      grp.add(upper, lower, cuff);
      this.body.add(grp);
      void side;
    }

    // Beine (Pivot an der Hüfte) – am Root, damit Rutschen sauber aussieht
    this.legL = new THREE.Group(); this.legR = new THREE.Group();
    this.legL.position.set(-0.17, 0.72, 0);
    this.legR.position.set(0.17, 0.72, 0);
    for (const grp of [this.legL, this.legR]) {
      const thigh = box(0.2, 0.36, 0.2, M.skin); thigh.position.y = -0.18;
      const shin = box(0.17, 0.34, 0.17, M.bronze); shin.position.y = -0.52; // Beinschienen
      const foot = box(0.18, 0.1, 0.3, M.leather); foot.position.set(0, -0.7, 0.05);
      grp.add(thigh, shin, foot);
      g.add(grp);
    }

    // Kleiner Rundschild auf dem Rücken + Gladius an der Hüfte (Silhouette!)
    const parma = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 14), M.leather);
    parma.rotation.x = Math.PI / 2;
    parma.position.set(0, 1.25, 0.26);
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), M.gold);
    boss.position.set(0, 1.25, 0.3);
    this.body.add(parma, boss);
    const sword = box(0.05, 0.4, 0.08, M.bronze);
    sword.position.set(0.36, 0.95, 0.1); sword.rotation.z = 0.15;
    this.body.add(sword);

    // Wehender Umhang
    this.cape = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), M.cape);
    this.cape.position.set(0, 1.45, 0.22);
    this.cape.rotation.x = 0.3;
    this.cape.castShadow = true;
    this.body.add(this.cape);

    // Schild-Aura (Power-up) – goldener Ring
    this.aura = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.05, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.85 })
    );
    this.aura.position.y = 1.0;
    this.aura.visible = false;
    g.add(this.aura);

    // Boost-Glühen um die Füße
    this.glow = new THREE.Mesh(
      new THREE.CircleGeometry(0.8, 20),
      new THREE.MeshBasicMaterial({ color: 0xffc04d, transparent: true, opacity: 0.35, depthWrite: false })
    );
    this.glow.rotation.x = -Math.PI / 2;
    this.glow.position.y = 0.03;
    this.glow.visible = false;
    g.add(this.glow);

    // Weicher Blob-Schatten als Fallback-Verstärkung
    this.blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 18),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
    );
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.position.y = 0.02;
    g.add(this.blob);
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

    // Umhang flattert mit dem Tempo
    this.cape.rotation.x = 0.35 + Math.sin(this.runT * 1.7) * 0.12 + speed * 0.012;

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
