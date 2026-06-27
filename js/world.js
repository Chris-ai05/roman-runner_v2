// ============================================================
//  World – goldene Stunde über der Via Romana.
//  Endlos recycelte Straßensegmente, Seiten-Deko aus Pools,
//  Triumphbögen alle 500 m, flackernde Feuerschalen.
// ============================================================
import * as THREE from 'three';
import { CONFIG, randF, randI, pick } from './config.js';
import {
  stoneRoadTexture, marbleTexture, brickTexture, awningTexture,
  skyTexture, sunTexture, spqrTexture,
} from './textures.js';

const SEG = CONFIG.segLen;

class TemplatePool {
  constructor(builder) { this.builder = builder; this.free = []; }
  acquire() { const g = this.free.pop() || this.builder(); g.visible = true; return g; }
  release(g) { g.visible = false; this.free.push(g); }
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this._t = 0;
    this.flames = [];          // {mesh, glow, phase, seg}

    // ---------- Texturen & Materialien ----------
    const roadTex = stoneRoadTexture();
    roadTex.repeat.set(2, SEG / 4.4);
    const marbleTex = marbleTexture();
    const brickTex = brickTexture();
    brickTex.repeat.set(3, 2);

    this.M = {
      road:    new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.95 }),
      marble:  new THREE.MeshStandardMaterial({ map: marbleTex, color: 0xfaf2e0, roughness: 0.7 }),
      stone:   new THREE.MeshStandardMaterial({ color: 0xcbb692, roughness: 0.95 }),
      brick:   new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.95 }),
      wood:    new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.95 }),
      terra:   new THREE.MeshStandardMaterial({ color: 0xb45f3c, roughness: 0.9 }),
      green:   new THREE.MeshStandardMaterial({ color: 0x33502f, roughness: 0.95 }),
      green2:  new THREE.MeshStandardMaterial({ color: 0x4a6b3a, roughness: 0.95 }),
      gold:    new THREE.MeshStandardMaterial({ color: 0xd9a93e, roughness: 0.35, metalness: 0.7 }),
      bronzeD: new THREE.MeshStandardMaterial({ color: 0x6e552c, roughness: 0.5, metalness: 0.5 }),
      flame:   new THREE.MeshBasicMaterial({ color: 0xffa133 }),
      awnA:    new THREE.MeshStandardMaterial({ map: awningTexture('#b8332f', '#efe3c8'), roughness: 0.9, side: THREE.DoubleSide }),
      awnB:    new THREE.MeshStandardMaterial({ map: awningTexture('#3f6b4f', '#efe3c8'), roughness: 0.9, side: THREE.DoubleSide }),
      hill:    new THREE.MeshBasicMaterial({ color: 0xdcb78c }),
      gable:   new THREE.MeshStandardMaterial({ color: 0xefe4cd, roughness: 0.8, side: THREE.DoubleSide }),
    };

    // ---------- Himmel, Sonne, Nebel ----------
    scene.fog = new THREE.Fog(0xf2c28b, CONFIG.fogNear, CONFIG.fogFar);
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(235, 24, 14),
      new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false, depthWrite: false })
    );
    scene.add(this.sky);

    this.sun = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sunTexture(), transparent: true, depthWrite: false, fog: false,
    }));
    this.sun.scale.set(85, 85, 1);
    scene.add(this.sun);

    // ---------- Licht ----------
    scene.add(new THREE.HemisphereLight(0xffe7c4, 0x705c40, 0.55));

    this.key = new THREE.DirectionalLight(0xffd9a8, 1.7); // tiefe Sonne von vorn links
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    const sc = this.key.shadow.camera;
    sc.left = -18; sc.right = 18; sc.top = 22; sc.bottom = -12;
    sc.near = 2; sc.far = 90;
    this.key.shadow.bias = -0.0006;
    scene.add(this.key, this.key.target);

    this.fill = new THREE.DirectionalLight(0xffeede, 0.55); // weiches Gegenlicht
    scene.add(this.fill, this.fill.target);

    // ---------- Boden & Hügel ----------
    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(320, 420),
      new THREE.MeshStandardMaterial({ color: 0xb3a07c, roughness: 1 })
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.04;
    this.ground.receiveShadow = true;
    scene.add(this.ground);

    this.hills = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const h = new THREE.Mesh(new THREE.ConeGeometry(randF(26, 55), randF(14, 26), 7), this.M.hill);
      h.position.set((i - 3) * 32 + randF(-10, 10), 0, randF(-15, 15));
      h.scale.y = randF(0.6, 1);
      this.hills.add(h);
    }
    scene.add(this.hills);

    // ---------- Deko-Vorlagen (gepoolt) ----------
    this.pools = this._buildTemplatePools();

    // ---------- Straßensegmente ----------
    this.segments = [];
    const roadGeo = new THREE.PlaneGeometry(CONFIG.roadW, SEG);
    const curbGeo = new THREE.BoxGeometry(0.5, 0.34, SEG);
    for (let i = 0; i < CONFIG.segCount; i++) {
      const g = new THREE.Group();
      const road = new THREE.Mesh(roadGeo, this.M.road);
      road.rotation.x = -Math.PI / 2;
      road.receiveShadow = true;
      const curbL = new THREE.Mesh(curbGeo, this.M.marble);
      curbL.position.set(-CONFIG.roadW / 2 - 0.25, 0.13, 0);
      curbL.castShadow = curbL.receiveShadow = true;
      const curbR = curbL.clone();
      curbR.position.x = -curbL.position.x;
      g.add(road, curbL, curbR);
      g.userData.deco = [];   // [{pool, group}]
      g.userData.props = [];  // frei platzierte Kleinteile
      this.scene.add(g);
      this.segments.push(g);
    }

    // ---------- Triumphbögen ----------
    this.archPool = [this._buildArch(), this._buildArch()];
    this.archPool.forEach(a => { a.position.z = 5000; scene.add(a); });
    this.archIdx = 0;

    this.reset();
  }

  // ============ Vorlagen-Bauer ============
  _buildTemplatePools() {
    const M = this.M;
    const col = (h = 3.8) => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.4, 1.05), M.marble);
      base.position.y = 0.2;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, h, 10), M.marble);
      shaft.position.y = 0.4 + h / 2;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.32, 0.95), M.marble);
      cap.position.y = 0.4 + h + 0.16;
      [base, shaft, cap].forEach(m => { m.castShadow = true; g.add(m); });
      return g;
    };

    const builders = [
      // 0 — Kolonnade entlang der Straße
      () => {
        const g = new THREE.Group();
        for (let i = 0; i < 4; i++) {
          const c = col(); c.position.z = -9 + i * 6; g.add(c);
        }
        const arch = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.5, SEG - 4), M.marble);
        arch.position.y = 4.6; arch.castShadow = true;
        g.add(arch);
        return g;
      },
      // 1 — Tempelfront (steht weiter hinten, Front zeigt zur Straße)
      () => {
        const g = new THREE.Group();
        const podium = new THREE.Mesh(new THREE.BoxGeometry(7.6, 1.2, 5.4), M.stone);
        podium.position.y = 0.6; podium.castShadow = podium.receiveShadow = true;
        g.add(podium);
        for (let i = 0; i < 4; i++) {
          const c = col(3.0);
          c.position.set(-2.7 + i * 1.8, 1.2, -2.0);
          g.add(c);
        }
        const beam = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.45, 1.2), M.marble);
        beam.position.set(0, 4.85, -2.0); beam.castShadow = true;
        const roofL = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.2, 6.0), M.terra);
        roofL.position.set(-1.85, 5.7, 0.4); roofL.rotation.z = 0.42; roofL.castShadow = true;
        const roofR = roofL.clone(); roofR.position.x = 1.85; roofR.rotation.z = -0.42;
        const tri = new THREE.Shape();
        tri.moveTo(-3.7, 0); tri.lineTo(3.7, 0); tri.lineTo(0, 1.55); tri.closePath();
        const gable = new THREE.Mesh(new THREE.ShapeGeometry(tri), M.gable);
        gable.position.set(0, 5.07, -2.55);
        g.add(beam, roofL, roofR, gable);
        return g;
      },
      // 2 — Aquädukt-Mauer (Ziegel)
      () => {
        const g = new THREE.Group();
        for (const z of [-8, 0, 8]) {
          const pier = new THREE.Mesh(new THREE.BoxGeometry(1.3, 4.6, 1.5), M.brick);
          pier.position.set(0, 2.3, z); pier.castShadow = true;
          g.add(pier);
        }
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.0, SEG - 2), M.brick);
        top.position.y = 5.1; top.castShadow = true;
        const cap = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.25, SEG - 2), M.stone);
        cap.position.y = 5.72; cap.castShadow = true;
        g.add(top, cap);
        return g;
      },
      // 3 — Statuen auf Sockeln
      () => {
        const g = new THREE.Group();
        for (const z of [-6, 6]) {
          const ped = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 1.1), M.marble);
          ped.position.set(0, 0.65, z);
          const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.4, 1.45, 8), M.marble);
          body.position.set(0, 2.0, z);
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), M.marble);
          head.position.set(0, 2.95, z);
          const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.8, 0.16), M.marble);
          arm.position.set(-0.32, 2.65, z); arm.rotation.z = 0.8;
          [ped, body, head, arm].forEach(m => { m.castShadow = true; g.add(m); });
        }
        return g;
      },
      // 4 — Zypressen-Gruppe
      () => {
        const g = new THREE.Group();
        for (const [x, z, s] of [[-1, -7, 1], [0.8, 0, 1.25], [-0.4, 7, 0.85]]) {
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.8, 6), M.wood);
          trunk.position.set(x, 0.4, z);
          const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.62 * s, 2.6 * s, 7), M.green);
          c1.position.set(x, 0.8 + 1.3 * s, z);
          const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.42 * s, 1.6 * s, 7), M.green2);
          c2.position.set(x, 0.8 + 2.3 * s, z);
          [trunk, c1, c2].forEach(m => { m.castShadow = true; g.add(m); });
        }
        return g;
      },
      // 5 — Marktstand mit gestreifter Markise
      () => {
        const g = new THREE.Group();
        const awn = pick([M.awnA, M.awnB]);
        for (const [x, z] of [[-1.5, -1.2], [1.5, -1.2], [-1.5, 1.2], [1.5, 1.2]]) {
          const pole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.3, 0.1), M.wood);
          pole.position.set(x, 1.15, z); pole.castShadow = true;
          g.add(pole);
        }
        const table = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.16, 2.0), M.wood);
        table.position.y = 0.95; table.castShadow = true;
        const roof = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.0), awn);
        roof.position.set(0, 2.45, 0);
        roof.rotation.x = -Math.PI / 2 + 0.28;
        g.add(table, roof);
        for (let i = 0; i < 3; i++) {
          const amph = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), M.terra);
          amph.scale.set(1, 1.4, 1);
          amph.position.set(-0.9 + i * 0.9, 1.25, 0.2);
          amph.castShadow = true;
          g.add(amph);
        }
        const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), M.wood);
        crate.position.set(1.6, 0.35, 1.6); crate.castShadow = true;
        g.add(crate);
        return g;
      },
      // 6 — Ruinenfeld (Säulenstümpfe)
      () => {
        const g = new THREE.Group();
        const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 1.1, 9), M.marble);
        s1.position.set(-0.8, 0.55, -4); s1.rotation.z = 0.06;
        const s2 = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 1.9, 9), M.marble);
        s2.position.set(0.7, 0.95, 1); s2.rotation.x = -0.05;
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.4, 9), M.marble);
        drum.position.set(-0.2, 0.38, 5); drum.rotation.z = Math.PI / 2; drum.rotation.y = 0.5;
        const slab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 1.1), M.stone);
        slab.position.set(1.2, 0.15, 4.2); slab.rotation.y = 0.4;
        [s1, s2, drum, slab].forEach(m => { m.castShadow = true; g.add(m); });
        return g;
      },
    ];
    return builders.map(b => new TemplatePool(b));
  }

  // Feuerschale (Kleinteil direkt am Straßenrand)
  _makeBrazier() {
    const g = new THREE.Group();
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.9, 6), this.M.bronzeD);
    stand.position.y = 0.45;
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.18, 0.22, 8), this.M.bronzeD);
    bowl.position.y = 1.0;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 6), this.M.flame);
    flame.position.y = 1.32;
    stand.castShadow = bowl.castShadow = true;
    g.add(stand, bowl, flame);
    g.userData.flame = flame;
    return g;
  }

  _buildArch() {
    const M = this.M;
    const g = new THREE.Group();
    for (const x of [-4.1, 4.1]) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(1.7, 5.4, 1.7), M.marble);
      pier.position.set(x, 2.7, 0); pier.castShadow = true;
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.5, 2.1), M.marble);
      base.position.set(x, 0.25, 0);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 2.0), M.gold);
      cap.position.set(x, 5.6, 0);
      g.add(pier, base, cap);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(11.6, 1.2, 1.9), M.marble);
    beam.position.y = 6.4; beam.castShadow = true;
    const attic = new THREE.Mesh(new THREE.BoxGeometry(9.6, 1.7, 1.6), M.marble);
    attic.position.y = 7.85; attic.castShadow = true;
    const trim = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.18, 2.0), M.gold);
    trim.position.y = 7.05;
    g.add(beam, attic, trim);

    const spqr = spqrTexture();
    const plateGeo = new THREE.PlaneGeometry(5.6, 1.5);
    const plateMat = new THREE.MeshBasicMaterial({ map: spqr });
    const pF = new THREE.Mesh(plateGeo, plateMat);
    pF.position.set(0, 7.85, 0.82);
    const pB = pF.clone(); pB.position.z = -0.82; pB.rotation.y = Math.PI;
    g.add(pF, pB);

    for (const x of [-4.4, 4.4]) {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), M.gold);
      orb.position.set(x, 8.95, 0);
      g.add(orb);
    }
    return g;
  }

  // ============ Segment-Befüllung ============
  _clearSegment(seg) {
    for (const d of seg.userData.deco) {
      seg.remove(d.group);
      d.pool.release(d.group);
    }
    seg.userData.deco = [];
    // Kleinteile werden bei jeder Befüllung frisch gebaut (nicht gepoolt) –
    // darum hier ihre Geometrien freigeben, sonst lecken GPU-Buffers über die
    // Zeit. Materialien sind geteilt (this.M.*) und bleiben erhalten.
    for (const p of seg.userData.props) {
      seg.remove(p);
      p.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    }
    seg.userData.props = [];
    this.flames = this.flames.filter(f => f.seg !== seg);
  }

  _populateSegment(seg) {
    this._clearSegment(seg);

    // Pro Seite eine Vorlage
    for (const side of [-1, 1]) {
      const idx = randI(0, this.pools.length - 1);
      const pool = this.pools[idx];
      const g = pool.acquire();
      const dist = [6.4, 13, 11, 6.2, 9, 6.8, 7.5][idx];
      g.position.set(side * dist, 0, randF(-2, 2));
      // Vorlagen sind für die rechte Seite gebaut (Front -> -x).
      g.rotation.y = side === 1 ? 0 : Math.PI;
      seg.add(g);
      seg.userData.deco.push({ pool, group: g });
    }

    // Kleinteile direkt am Straßenrand
    if (Math.random() < 0.55) {
      const side = pick([-1, 1]);
      const z = randF(-SEG / 2 + 2, SEG / 2 - 2);
      if (Math.random() < 0.5) {
        const b = this._makeBrazier();
        b.position.set(side * 4.95, 0, z);
        seg.add(b);
        seg.userData.props.push(b);
        this.flames.push({ flame: b.userData.flame, phase: Math.random() * 6, seg });
      } else {
        const bush = new THREE.Mesh(new THREE.SphereGeometry(randF(0.35, 0.55), 7, 6), this.M.green2);
        bush.position.set(side * randF(4.9, 5.5), 0.3, z);
        bush.scale.y = 0.8;
        bush.castShadow = true;
        seg.add(bush);
        seg.userData.props.push(bush);
      }
    }
  }

  // ============ Öffentliche API ============
  reset() {
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      seg.position.z = -i * SEG;
      this._populateSegment(seg);
    }
    this.nextArchZ = -CONFIG.milestoneEvery;
    this.archPool.forEach(a => { a.position.z = 5000; });
    this._t = 0;
  }

  update(dt, playerZ, camera) {
    this._t += dt;

    // Himmel & Sonne folgen der Kamera
    this.sky.position.copy(camera.position);
    this.sun.position.set(camera.position.x - 55, camera.position.y + 36, camera.position.z - 185);

    // Lichter folgen dem Spieler
    this.key.position.set(-12, 18, playerZ - 16);
    this.key.target.position.set(0, 0, playerZ - 2);
    this.fill.position.set(8, 12, playerZ + 14);
    this.fill.target.position.set(0, 1, playerZ);

    // Boden & Hügel mitziehen
    this.ground.position.z = playerZ - 110;
    this.hills.position.z = playerZ - 195;

    // Segmente recyceln
    for (const seg of this.segments) {
      if (seg.position.z - SEG / 2 > playerZ + CONFIG.behind) {
        seg.position.z -= SEG * CONFIG.segCount;
        this._populateSegment(seg);
      }
    }

    // Triumphbogen platzieren, wenn der nächste Meilenstein naht
    if (this.nextArchZ > playerZ - 175) {
      const arch = this.archPool[this.archIdx % 2];
      this.archIdx++;
      arch.position.z = this.nextArchZ;
      this.nextArchZ -= CONFIG.milestoneEvery;
    }

    // Feuer flackern lassen
    for (const f of this.flames) {
      const s = 1 + 0.3 * Math.sin(this._t * 13 + f.phase) + 0.1 * Math.sin(this._t * 31 + f.phase * 2);
      f.flame.scale.set(1, Math.max(0.5, s), 1);
    }
  }
}
