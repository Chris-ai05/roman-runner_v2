// ============================================================
//  Effects – Partikel (Sprites mit Pooling) & Kamera-Shake.
//  Klares visuelles Feedback: Staub beim Laufen, Funken bei
//  Münzen, Trümmer beim Crash, Gold-Trail beim Tempo-Boost.
// ============================================================
import * as THREE from 'three';
import { softCircleTexture } from './textures.js';

const POOL = 150;

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.map = softCircleTexture();
    this.pool = [];
    this.cursor = 0;
    this.trauma = 0;          // Screen-Shake-Intensität
    this._shakeT = 0;

    for (let i = 0; i < POOL; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.map, transparent: true, depthWrite: false, opacity: 0,
      });
      const s = new THREE.Sprite(mat);
      s.visible = false;
      scene.add(s);
      this.pool.push({
        sprite: s, vel: new THREE.Vector3(),
        life: 0, max: 1, size: 0.3, gravity: 0, drag: 0, additive: false,
      });
    }
  }

  _spawn(pos, { color = 0xffffff, size = 0.3, life = 0.6, vel, gravity = 0, drag = 0, additive = false, opacity = 1 }) {
    const p = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % POOL;
    p.sprite.visible = true;
    p.sprite.position.copy(pos);
    p.sprite.material.color.setHex(color);
    p.sprite.material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    p.sprite.material.opacity = opacity;
    p.vel.copy(vel);
    p.life = p.max = life;
    p.size = size;
    p.gravity = gravity;
    p.drag = drag;
    p.sprite.scale.set(size, size, 1);
  }

  burst(pos, { count = 10, color = 0xffd76a, speed = 4, size = 0.3, life = 0.6, gravity = 4, additive = true, up = 1.5 } = {}) {
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      v.set((Math.random() - 0.5) * speed, Math.random() * speed * 0.6 + up, (Math.random() - 0.5) * speed);
      this._spawn(pos, { color, size: size * (0.6 + Math.random() * 0.8), life: life * (0.6 + Math.random() * 0.7), vel: v, gravity, drag: 1.5, additive });
    }
  }

  // Staubwölkchen unter den Füßen
  dust(pos) {
    const v = new THREE.Vector3((Math.random() - 0.5) * 1.2, 0.6 + Math.random() * 0.6, 1.5 + Math.random());
    this._spawn(pos, { color: 0xcdbb98, size: 0.35 + Math.random() * 0.25, life: 0.45, vel: v, gravity: -1.2, drag: 2.5, additive: false, opacity: 0.45 });
  }

  // Funkeln bei Münzen
  sparkle(pos) {
    this.burst(pos, { count: 7, color: 0xffe28a, speed: 3, size: 0.26, life: 0.45, gravity: 2 });
  }

  // Trümmer beim Zerschmettern / Crash
  debris(pos, color = 0x9a8466) {
    const v = new THREE.Vector3();
    for (let i = 0; i < 14; i++) {
      v.set((Math.random() - 0.5) * 7, Math.random() * 5 + 2, (Math.random() - 0.5) * 5 + 2);
      this._spawn(pos, { color, size: 0.22 + Math.random() * 0.3, life: 0.8, vel: v, gravity: 12, drag: 0.6, additive: false, opacity: 0.95 });
    }
    this.burst(pos, { count: 8, color: 0xffd9a0, speed: 5, size: 0.3, life: 0.35 });
  }

  // Goldspur bei Merkurs Sandalen
  trail(pos) {
    const v = new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.4 + Math.random() * 0.8, 2.2);
    this._spawn(pos, { color: 0xffcf5e, size: 0.34, life: 0.5, vel: v, gravity: -0.5, drag: 1.2, additive: true });
  }

  // Aura-Puls (Power-up eingesammelt)
  pulse(pos, color = 0xffd76a) {
    this.burst(pos, { count: 16, color, speed: 5.5, size: 0.4, life: 0.6, gravity: 0.5 });
  }

  shake(amount) { this.trauma = Math.min(1, this.trauma + amount); }

  /** Liefert {x,y}-Versatz für die Kamera */
  shakeOffset() {
    const t = this.trauma * this.trauma;
    const s = this._shakeT;
    return {
      x: t * 0.5 * Math.sin(s * 47.3) * Math.sin(s * 13.1),
      y: t * 0.4 * Math.sin(s * 39.7 + 2),
    };
  }

  update(dt) {
    this._shakeT += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    for (const p of this.pool) {
      if (!p.sprite.visible) continue;
      p.life -= dt;
      if (p.life <= 0) { p.sprite.visible = false; p.sprite.material.opacity = 0; continue; }
      p.vel.y -= p.gravity * dt;
      const d = Math.max(0, 1 - p.drag * dt);
      p.vel.multiplyScalar(d);
      p.sprite.position.addScaledVector(p.vel, dt);
      const k = p.life / p.max;
      p.sprite.material.opacity = Math.min(1, k * 1.6) * (p.additive ? 1 : 0.9);
      const sc = p.size * (0.5 + 0.5 * k);
      p.sprite.scale.set(sc, sc, 1);
    }
  }

  reset() {
    this.trauma = 0;
    for (const p of this.pool) { p.sprite.visible = false; p.life = 0; }
  }
}
