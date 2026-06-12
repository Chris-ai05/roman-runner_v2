// ============================================================
//  Obstacles – alle Hindernisse mit Pooling & Kollision.
//  Arten:
//   'hurdle'  umgestürzte Säule   -> springen
//   'crates'  Kistenstapel (tief) -> springen
//   'fire'    Feuerschalen        -> springen
//   'beam'    Torbalken           -> rutschen
//   'wide'    Säule über ALLE Spuren -> springen
//   'cart'    Marktkarren         -> Spur wechseln
//   'statue'  Statue auf Sockel   -> Spur wechseln
//   'chariot' entgegenkommender Streitwagen -> ausweichen!
// ============================================================
import * as THREE from 'three';
import { CONFIG, laneToX, randF } from './config.js';

const FORGIVE = 0.1; // Kollisions-Toleranz (gefühlte Fairness)

export class Obstacles {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
    this.pools = new Map(); // kind -> mesh[]
    this._t = 0;

    this.M = {
      marble: new THREE.MeshStandardMaterial({ color: 0xece2cc, roughness: 0.75 }),
      stone:  new THREE.MeshStandardMaterial({ color: 0xc4b08c, roughness: 0.95 }),
      wood:   new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.95 }),
      woodD:  new THREE.MeshStandardMaterial({ color: 0x5c3c22, roughness: 0.95 }),
      terra:  new THREE.MeshStandardMaterial({ color: 0xb45f3c, roughness: 0.9 }),
      bronze: new THREE.MeshStandardMaterial({ color: 0x8a6532, roughness: 0.45, metalness: 0.55 }),
      red:    new THREE.MeshStandardMaterial({ color: 0x8e1f2f, roughness: 0.85 }),
      gold:   new THREE.MeshStandardMaterial({ color: 0xd9a93e, roughness: 0.35, metalness: 0.7 }),
      flame:  new THREE.MeshBasicMaterial({ color: 0xffa133 }),
      horse:  new THREE.MeshStandardMaterial({ color: 0x4a3526, roughness: 0.9 }),
    };
  }

  // ---------- Mesh-Fabriken ----------
  _build(kind) {
    const M = this.M;
    const g = new THREE.Group();
    const add = (mesh) => { mesh.castShadow = true; g.add(mesh); return mesh; };

    switch (kind) {
      case 'hurdle': { // liegende Säule auf Trümmern
        const col = add(new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.9, 10), M.marble));
        col.rotation.z = Math.PI / 2;
        col.position.y = 0.55;
        const r1 = add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.5), M.stone));
        r1.position.set(-0.6, 0.16, 0.25); r1.rotation.y = 0.4;
        const r2 = add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.26, 0.4), M.stone));
        r2.position.set(0.55, 0.13, -0.2); r2.rotation.y = -0.3;
        break;
      }
      case 'crates': {
        const c1 = add(new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), M.wood));
        c1.position.set(-0.35, 0.42, 0);
        const c2 = add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), M.woodD));
        c2.position.set(0.5, 0.35, 0.1); c2.rotation.y = 0.3;
        const amph = add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), M.terra));
        amph.scale.set(1, 1.35, 1);
        amph.position.set(-0.35, 1.1, 0);
        break;
      }
      case 'fire': {
        for (const x of [-0.55, 0.55]) {
          const bowl = add(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.2, 0.3, 8), M.bronze));
          bowl.position.set(x, 0.45, 0);
          const leg = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.4, 6), M.bronze));
          leg.position.set(x, 0.18, 0);
          const fl = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 6), M.flame);
          fl.position.set(x, 0.85, 0);
          g.add(fl);
          (g.userData.flames ??= []).push(fl);
        }
        break;
      }
      case 'beam': { // Torbalken: drunter durchrutschen
        for (const x of [-0.95, 0.95]) {
          const post = add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 2.25, 0.26), M.stone));
          post.position.set(x, 1.12, 0);
        }
        const beam = add(new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.55, 0.5), M.marble));
        beam.position.y = 1.62;
        const trim = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.08, 0.54), M.gold);
        trim.position.y = 1.92; g.add(trim);
        // rotes Banner hängt herab – signalisiert deutlich: RUTSCHEN
        const ban = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.45),
          new THREE.MeshStandardMaterial({ color: 0x8e1f2f, roughness: 0.9, side: THREE.DoubleSide }));
        ban.position.y = 1.18; g.add(ban);
        break;
      }
      case 'wide': { // riesige Säule über die ganze Straße
        const col = add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 7.6, 12), M.marble));
        col.rotation.z = Math.PI / 2;
        col.position.y = 0.55;
        for (const x of [-2.4, 0.4, 2.6]) {
          const r = add(new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.3, 0.45), M.stone));
          r.position.set(x, 0.15, randF(-0.35, 0.35));
          r.rotation.y = randF(-0.5, 0.5);
        }
        break;
      }
      case 'cart': {
        const bed = add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 1.1), M.wood));
        bed.position.y = 0.85;
        for (const [x, z] of [[-0.65, 0.62], [0.65, 0.62], [-0.65, -0.62], [0.65, -0.62]]) {
          const wheel = add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 10), M.woodD));
          wheel.rotation.x = Math.PI / 2;
          wheel.position.set(x, 0.42, z);
        }
        const sack1 = add(new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), M.stone));
        sack1.position.set(-0.3, 1.35, 0); sack1.scale.y = 0.8;
        const sack2 = add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), M.terra));
        sack2.position.set(0.4, 1.32, 0.15); sack2.scale.set(1, 1.3, 1);
        const post = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.1), M.woodD));
        post.position.set(0, 1.7, -0.45);
        const awn = add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 1.0), M.red));
        awn.position.set(0, 2.25, 0); awn.rotation.x = 0.15;
        break;
      }
      case 'statue': {
        const ped = add(new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.3, 1.25), M.stone));
        ped.position.y = 0.65;
        const body = add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 1.5, 9), M.marble));
        body.position.y = 2.05;
        const head = add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 9, 9), M.marble));
        head.position.y = 3.0;
        const arm = add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.85, 0.18), M.marble));
        arm.position.set(0.34, 2.7, 0); arm.rotation.z = -0.7;
        const wreath = add(new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.05, 6, 14), M.gold));
        wreath.position.y = 3.06; wreath.rotation.x = Math.PI / 2.3;
        break;
      }
      case 'chariot': {
        const body = add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.9), M.red));
        body.position.set(0, 0.85, 0.4);
        const trimF = add(new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.12, 0.94), M.gold));
        trimF.position.set(0, 1.22, 0.4);
        const wheels = [];
        for (const x of [-0.68, 0.68]) {
          const w = add(new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.12, 12), M.gold));
          w.rotation.x = Math.PI / 2;
          w.position.set(x, 0.46, 0.55);
          wheels.push(w);
        }
        g.userData.wheels = wheels;
        // Pferd (stark vereinfacht, aber lesbar)
        const horse = new THREE.Group();
        const trunk = add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 1.15), M.horse));
        trunk.position.set(0, 1.0, 0);
        const neck = add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.35), M.horse));
        neck.position.set(0, 1.45, -0.55); neck.rotation.x = 0.5;
        const head = add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.55), M.horse));
        head.position.set(0, 1.78, -0.85);
        const mane = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.4), M.red));
        mane.position.set(0, 1.7, -0.55); mane.rotation.x = 0.5;
        for (const [x, z] of [[-0.2, 0.4], [0.2, 0.4], [-0.2, -0.4], [0.2, -0.4]]) {
          const leg = add(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.75, 0.13), M.horse));
          leg.position.set(x, 0.38, z);
          (g.userData.legs ??= []).push(leg);
        }
        [trunk, neck, head, mane].forEach(m => horse.add(m));
        horse.position.z = -1.5;
        // Beine sind über add() schon in g – Gruppe nur fürs Galopp-Nicken
        g.add(horse);
        g.userData.horse = horse;
        break;
      }
    }
    g.visible = false;
    this.scene.add(g);
    return g;
  }

  _acquire(kind) {
    const pool = this.pools.get(kind) || [];
    this.pools.set(kind, pool);
    const mesh = pool.pop() || this._build(kind);
    mesh.visible = true;
    return mesh;
  }

  _release(ob) {
    ob.mesh.visible = false;
    this.pools.get(ob.kind).push(ob.mesh);
  }

  // ---------- Kollisionsboxen je Typ ----------
  _boxes(kind) {
    switch (kind) {
      case 'hurdle': return [{ x: 0, halfW: 0.95, halfD: 0.42, y0: 0, y1: 0.95 }];
      case 'crates': return [{ x: 0, halfW: 0.95, halfD: 0.5, y0: 0, y1: 0.9 }];
      case 'fire':   return [{ x: 0, halfW: 0.92, halfD: 0.36, y0: 0, y1: 0.8 }];
      case 'beam':   return [
        { x: -0.95, halfW: 0.14, halfD: 0.16, y0: 0, y1: 2.25 },
        { x: 0.95, halfW: 0.14, halfD: 0.16, y0: 0, y1: 2.25 },
        { x: 0, halfW: 1.15, halfD: 0.28, y0: 1.18, y1: 2.3 },
      ];
      case 'wide':   return [{ x: 0, halfW: 3.8, halfD: 0.45, y0: 0, y1: 0.95 }];
      case 'cart':   return [{ x: 0, halfW: 0.85, halfD: 0.62, y0: 0, y1: 2.3 }];
      case 'statue': return [{ x: 0, halfW: 0.68, halfD: 0.68, y0: 0, y1: 3.2 }];
      case 'chariot':return [{ x: 0, halfW: 0.72, halfD: 1.6, y0: 0, y1: 2.2 }];
      default:       return [];
    }
  }

  // ---------- Spawning ----------
  spawn(kind, lane, z) {
    const mesh = this._acquire(kind);
    const x = kind === 'wide' ? 0 : laneToX(lane);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = 0;
    const ob = {
      kind, lane, mesh,
      x, z,
      boxes: this._boxes(kind),
      moving: kind === 'chariot',
      speed: kind === 'chariot' ? 11 : 0,
      passed: false, dead: false,
      flames: mesh.userData.flames || null,
      smashColor: { hurdle: 0xece2cc, crates: 0x8a6034, fire: 0xffa133, beam: 0xece2cc, wide: 0xece2cc, cart: 0x8a6034, statue: 0xece2cc, chariot: 0xb03434 }[kind],
    };
    this.active.push(ob);
    return ob;
  }

  spawnChariot(lane, z) { return this.spawn('chariot', lane, z); }

  // ---------- Update & Recycling ----------
  /**
   * @param {Function} onPass  (ob, nearMiss:boolean) – Hindernis passiert
   */
  update(dt, playerZ, playerState, onPass) {
    this._t += dt;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const ob = this.active[i];

      if (ob.moving) {
        ob.z += ob.speed * dt;          // rollt dem Spieler entgegen (+z)
        ob.mesh.position.z = ob.z;
        const gal = this._t * 16;
        ob.mesh.userData.wheels?.forEach(w => { w.rotation.y -= dt * 10; });
        ob.mesh.userData.legs?.forEach((l, k) => { l.rotation.x = Math.sin(gal + k * 1.7) * 0.7; });
        if (ob.mesh.userData.horse) ob.mesh.userData.horse.position.y = Math.abs(Math.sin(gal)) * 0.08;
      }

      if (ob.flames) {
        for (const fl of ob.flames) fl.scale.y = 1 + 0.35 * Math.sin(this._t * 14 + fl.position.x * 5);
      }

      // Passiert? (für Near-Miss-Bonus)
      if (!ob.passed && ob.z > playerZ + 0.9) {
        ob.passed = true;
        if (!ob.dead) {
          const sameLane = ob.kind === 'wide' || ob.lane === playerState.lane;
          let near = false;
          if (sameLane) {
            const k = ob.kind;
            if ((k === 'hurdle' || k === 'crates' || k === 'fire' || k === 'wide') && playerState.airborne) near = true;
            if (k === 'beam' && playerState.sliding) near = true;
          }
          onPass?.(ob, near);
        }
      }

      // Hinter dem Spieler: zurück in den Pool
      if (ob.z > playerZ + CONFIG.behind) {
        this._release(ob);
        this.active.splice(i, 1);
      }
    }
  }

  /** AABB-Test gegen die Spieler-Hitbox. Liefert das getroffene Hindernis oder null. */
  collide(hb) {
    for (const ob of this.active) {
      if (ob.dead) continue;
      const dz0 = ob.z - hb.z;
      if (dz0 > 4 || dz0 < -4) continue; // grober Vorfilter
      for (const b of ob.boxes) {
        const bx = ob.x + b.x;
        const overlapX = Math.abs(hb.x - bx) < (hb.halfW + b.halfW - FORGIVE);
        const overlapZ = Math.abs(hb.z - ob.z) < (hb.halfD + b.halfD - FORGIVE * 0.6);
        const overlapY = hb.y0 < b.y1 - 0.04 && hb.y1 > b.y0 + 0.04;
        if (overlapX && overlapZ && overlapY) return ob;
      }
    }
    return null;
  }

  /** Hindernis „zerschmettern" (Schild/Boost) */
  smash(ob) {
    ob.dead = true;
    const idx = this.active.indexOf(ob);
    if (idx >= 0) this.active.splice(idx, 1);
    this._release(ob);
  }

  reset() {
    for (const ob of this.active) this._release(ob);
    this.active.length = 0;
    this._t = 0;
  }
}
