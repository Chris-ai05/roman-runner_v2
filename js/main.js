// ============================================================
//  VIA ROMANA – Hauptmodul / Spielsteuerung
//  Verdrahtet Welt, Spieler, Hindernisse, Sammelobjekte,
//  Direktor, Effekte, Audio, Eingabe & UI zu einem Spiel.
// ============================================================
import * as THREE from 'three';
import { CONFIG, lerp, pick, store, toRoman } from './config.js';
import { AudioManager } from './audio.js';
import { InputManager } from './input.js';
import { Effects } from './effects.js';
import { Player } from './player.js';
import { World } from './world.js';
import { Obstacles } from './obstacles.js';
import { Collectibles } from './collectibles.js';
import { Director } from './director.js';
import { UI, POWER_LABELS } from './ui.js';

const TIPS = [
  'Unter Torbalken mit rotem Banner musst du rutschen.',
  'In der Luft „runter" drücken = Sturzflug und sofort rutschen.',
  'Mit Merkurs Sandalen rennst du durch jedes Hindernis hindurch.',
  'Knapp gemeisterte Hindernisse bringen Bonuspunkte.',
  'Der Lorbeer verdoppelt alle Punkte – auch Meilenstein-Boni.',
  'Der Schild der Legion verzeiht genau einen Fehler.',
  'Rom wurde nicht an einem Tag erbaut. Dein Rekord auch nicht.',
  'Selbst Cäsar ist einmal gestolpert. Ave atque vale!',
];

const POWER_COLORS = { shield: 0xe2543f, magnet: 0x7fa0ff, boost: 0xffd76a, laurel: 0x9fd06a };

class Game {
  constructor() {
    // ---------- Renderer / Szene / Kamera ----------
    this.canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas, antialias: true, powerPreference: 'high-performance',
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, CONFIG.camFar);
    this.camLook = new THREE.Vector3(0, 1.4, -6);
    this.baseFov = 62;

    // ---------- Module ----------
    this.audio = new AudioManager();
    this.effects = new Effects(this.scene);
    this.world = new World(this.scene);
    this.player = new Player(this.scene, this.effects);
    this.obstacles = new Obstacles(this.scene);
    this.coins = new Collectibles(this.scene);
    this.director = new Director(this.obstacles, this.coins, {
      chariot: () => {
        this.audio.play('horn');
        this.ui.toast('⚠ Streitwagen von vorn!');
      },
    });

    this.ui = new UI({
      start: () => { this.audio.play('click'); this.startRun(); },
      retry: () => { this.audio.play('click'); this.startRun(); },
      menu: () => { this.audio.play('click'); this.toMenu(); },
      resume: () => { this.audio.play('click'); this.resume(); },
      toggleMute: () => this.audio.toggle(),
    });

    this.input = new InputManager(document.getElementById('touch-layer'), {
      any: () => this.audio.unlock(),
      left: () => { if (this.state === 'running') this.player.left(); },
      right: () => { if (this.state === 'running') this.player.right(); },
      jump: () => {
        if (this.state === 'running') { if (this.player.jump()) this.audio.play('jump'); }
        else if (this.state === 'menu') this.startRun();
      },
      slide: () => {
        if (this.state === 'running') { if (this.player.slide()) this.audio.play('slide'); }
      },
      pause: () => {
        if (this.state === 'running') this.pause();
        else if (this.state === 'paused') this.resume();
      },
    });

    // ---------- Persistente Daten ----------
    this.best = store.get('vr_best', 0);
    this.totalCoins = store.get('vr_total', 0);

    // ---------- Laufvariablen ----------
    this.state = 'menu';
    this.playerZ = 0;
    this.menuAngle = 0.6;
    this.timeScale = 1;
    this._tmpV = new THREE.Vector3();
    this._fpsAcc = 0; this._fpsN = 0; this._tuned = false;

    this.resetRun();
    this.toMenu();

    window.addEventListener('resize', () => this.resize());
    this.resize();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'running') this.pause();
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(0.05, this.clock.getDelta());
      this.tick(dt);
    });
  }

  // ============ Zustände ============
  resetRun() {
    this.playerZ = 0;
    this.dist = 0;
    this.score = 0;
    this.runCoins = 0;
    this.runTime = 0;
    this.nextMile = CONFIG.milestoneEvery;
    this.invulnT = 0;
    this.deathT = 0;
    this.timeScale = 1;
    this.trailT = 0;
    this.power = { shield: false, magnet: 0, boost: 0, laurel: 0 };

    this.player.reset();
    this.player.setZ(0);
    this.obstacles.reset();
    this.coins.reset();
    this.director.reset();
    this.effects.reset();
    this.world.reset();
    this.player.group.visible = true;
  }

  toMenu() {
    this.resetRun();
    this.state = 'menu';
    this.ui.showMenu({
      best: this.best,
      totalCoins: this.totalCoins,
      muted: this.audio.muted,
      isTouch: this.input.isTouch,
    });
  }

  startRun() {
    this.resetRun();
    this.state = 'running';
    this.ui.showHUD();
    this.ui.hint(this.input.isTouch ? 'Wischen zum Steuern — LOS!' : 'LOS!');
  }

  pause() {
    this.state = 'paused';
    this.ui.showPause(true);
  }

  resume() {
    this.ui.showPause(false);
    this.state = 'running';
    this.clock.getDelta(); // großen dt nach Pause verwerfen
  }

  crash(ob) {
    this.state = 'dying';
    this.deathT = 0;
    this.player.die();
    this.audio.play('hit');
    this.effects.shake(0.9);
    this.ui.flash('hit');
    const p = this._tmpV.set(this.player.x, 1.0, this.playerZ);
    this.effects.debris(p, ob ? ob.smashColor : 0x9a8466);
  }

  finishRun() {
    const record = this.score > this.best;
    if (record) { this.best = Math.floor(this.score); store.set('vr_best', this.best); }
    this.totalCoins += this.runCoins;
    store.set('vr_total', this.totalCoins);
    if (record) this.audio.play('record');
    this.state = 'over';
    this.ui.showOver({
      score: this.score,
      coins: this.runCoins,
      best: this.best,
      record,
      tip: pick(TIPS),
    });
  }

  // ============ Power-ups ============
  applyPower(type, pos) {
    this.audio.play('power');
    this.effects.pulse(pos, POWER_COLORS[type]);
    this.ui.flash('gold');
    const sp = this.project(pos);
    if (sp) this.ui.popupAt(sp.x, sp.y, POWER_LABELS[type], 'gold big');

    switch (type) {
      case 'shield': this.power.shield = true; this.player.setShield(true); break;
      case 'magnet': this.power.magnet = CONFIG.magnetTime; break;
      case 'boost': this.power.boost = CONFIG.boostTime; this.player.setBoost(true); break;
      case 'laurel': this.power.laurel = CONFIG.laurelTime; break;
    }
  }

  get mult() { return this.power.laurel > 0 ? 2 : 1; }

  smashOb(ob) {
    const p = this._tmpV.set(ob.x, 1.1, ob.z);
    this.effects.debris(p, ob.smashColor);
    this.effects.shake(0.22);
    this.audio.play('smash');
    this.obstacles.smash(ob);
    this.score += CONFIG.smashScore * this.mult;
    const sp = this.project(p);
    if (sp) this.ui.popupAt(sp.x, sp.y, '+' + CONFIG.smashScore * this.mult, 'gold');
  }

  // ============ Haupt-Tick ============
  tick(dt) {
    switch (this.state) {
      case 'menu': this.tickMenu(dt); break;
      case 'running': this.tickRun(dt); break;
      case 'dying': this.tickDying(dt); break;
      case 'over': this.tickOver(dt); break;
      case 'paused': break; // eingefroren, nur rendern
    }
    this.renderer.render(this.scene, this.camera);
    this.adapt(dt);
  }

  tickMenu(dt) {
    this.menuAngle += dt * 0.22;
    const r = 7.6;
    const cx = Math.sin(this.menuAngle) * r;
    const cz = this.playerZ + Math.cos(this.menuAngle) * r;
    this.camera.position.lerp(this._tmpV.set(cx, 3.1, cz), Math.min(1, 4 * dt));
    this.camLook.lerp(new THREE.Vector3(0, 1.3, this.playerZ), Math.min(1, 4 * dt));
    this.camera.lookAt(this.camLook);
    this.setFov(58, dt);

    this.player.update(dt, 0, false);
    this.world.update(dt, this.playerZ, this.camera);
    this.effects.update(dt);
  }

  tickRun(dt) {
    this.runTime += dt;
    const baseSpd = Math.min(CONFIG.maxSpeed, CONFIG.baseSpeed + CONFIG.accel * this.runTime);
    const speed = baseSpd * (this.power.boost > 0 ? CONFIG.boostMult : 1);

    this.dist += speed * dt;
    this.playerZ -= speed * dt;
    this.player.setZ(this.playerZ);
    this.score += speed * dt * this.mult;

    // Power-up-Timer
    for (const k of ['magnet', 'boost', 'laurel']) {
      if (this.power[k] > 0) this.power[k] = Math.max(0, this.power[k] - dt);
    }
    if (this.power.boost <= 0 && this.player.glow.visible) this.player.setBoost(false);
    this.invulnT = Math.max(0, this.invulnT - dt);
    this.player.group.visible = this.invulnT <= 0 || Math.floor(this.invulnT * 16) % 2 === 0;

    // Goldspur bei Boost
    if (this.power.boost > 0) {
      this.trailT -= dt;
      if (this.trailT <= 0) {
        this.trailT = 0.03;
        this.effects.trail(this._tmpV.set(this.player.x, 0.35 + this.player.y, this.playerZ + 0.5));
      }
    }

    // Module
    this.player.update(dt, speed, true);
    this.director.update(dt, this.playerZ, this.dist);
    this.obstacles.update(dt, this.playerZ, {
      lane: this.player.lane,
      airborne: this.player.airborne,
      sliding: this.player.sliding,
    }, (ob, near) => {
      if (!near) return;
      this.score += CONFIG.nearMissScore * this.mult;
      const sp = this.project(this._tmpV.set(ob.x, 1.8, ob.z));
      if (sp) this.ui.popupAt(sp.x, sp.y, 'Knapp! +' + CONFIG.nearMissScore * this.mult, 'gold');
    });

    const pc = { x: this.player.x, y: this.player.centerY, z: this.playerZ };
    this.coins.update(dt, this.playerZ, pc, this.power.magnet > 0,
      (pos) => { // Münze
        this.runCoins++;
        this.score += CONFIG.coinScore * this.mult;
        this.audio.play('coin');
        this.effects.sparkle(pos);
      },
      (type, pos) => this.applyPower(type, pos),
    );

    // Kollision
    const hit = this.obstacles.collide(this.player.hitbox());
    if (hit) {
      if (this.power.boost > 0 || this.invulnT > 0) {
        this.smashOb(hit);
      } else if (this.power.shield) {
        this.power.shield = false;
        this.player.setShield(false);
        this.audio.play('shield');
        this.ui.flash('gold');
        this.invulnT = 1.2;
        this.smashOb(hit);
      } else {
        this.crash(hit);
      }
    }

    // Meilensteine
    if (this.dist >= this.nextMile) {
      this.audio.play('milestone');
      this.score += CONFIG.milestoneScore * this.mult;
      this.ui.banner(toRoman(this.nextMile), this.nextMile + ' Meter — das Tempo steigt!');
      this.effects.burst(this._tmpV.set(this.player.x, 1.5, this.playerZ - 1), {
        count: 18, color: 0xffd76a, speed: 6, size: 0.4, life: 0.8,
      });
      this.nextMile += CONFIG.milestoneEvery;
    }

    this.world.update(dt, this.playerZ, this.camera);
    this.effects.update(dt);
    this.followCam(dt, speed);

    // HUD
    this.ui.updateHUD({
      score: this.score,
      coins: this.runCoins,
      best: Math.max(this.best, Math.floor(this.score)),
      speed01: (baseSpd - CONFIG.baseSpeed) / (CONFIG.maxSpeed - CONFIG.baseSpeed),
      mult: this.mult,
    });
    const chips = [];
    if (this.power.shield) chips.push({ type: 'shield', frac: 1 });
    if (this.power.magnet > 0) chips.push({ type: 'magnet', frac: this.power.magnet / CONFIG.magnetTime });
    if (this.power.boost > 0) chips.push({ type: 'boost', frac: this.power.boost / CONFIG.boostTime });
    if (this.power.laurel > 0) chips.push({ type: 'laurel', frac: this.power.laurel / CONFIG.laurelTime });
    this.ui.setChips(chips);
  }

  tickDying(dt) {
    this.deathT += dt;
    this.timeScale = lerp(this.timeScale, 0.14, Math.min(1, 6 * dt));
    const sdt = dt * this.timeScale;

    this.player.update(sdt, 0, false);
    this.obstacles.update(sdt, this.playerZ, { lane: -1, airborne: false, sliding: false }, null);
    this.coins.update(sdt, this.playerZ, { x: 99, y: 99, z: 99 }, false, null, null);
    this.world.update(sdt, this.playerZ, this.camera);
    this.effects.update(dt);

    // Kamera hebt sich leicht – kleiner Kino-Moment
    const sh = this.effects.shakeOffset();
    this.camera.position.lerp(
      this._tmpV.set(this.player.x * 0.5 + sh.x, 5.2 + this.deathT * 1.4 + sh.y, this.playerZ + 8.2),
      Math.min(1, 3 * dt));
    this.camLook.lerp(new THREE.Vector3(this.player.x, 0.8, this.playerZ), Math.min(1, 5 * dt));
    this.camera.lookAt(this.camLook);

    if (this.deathT > 1.15) this.finishRun();
  }

  tickOver(dt) {
    this.player.update(dt * 0.3, 0, false);
    this.world.update(dt * 0.5, this.playerZ, this.camera);
    this.effects.update(dt);
    this.camera.lookAt(this.camLook);
  }

  // ============ Kamera & Helfer ============
  followCam(dt, speed) {
    const sh = this.effects.shakeOffset();
    const target = this._tmpV.set(
      this.player.x * 0.55 + sh.x,
      4.5 + sh.y,
      this.playerZ + 7.4,
    );
    this.camera.position.lerp(target, Math.min(1, 7 * dt));
    this.camLook.lerp(
      new THREE.Vector3(this.player.x * 0.8, 1.4 + this.player.y * 0.3, this.playerZ - 6),
      Math.min(1, 8 * dt));
    this.camera.lookAt(this.camLook);

    const fovTarget = this.baseFov
      + (speed / CONFIG.maxSpeed) * 9
      + (this.power.boost > 0 ? 6 : 0);
    this.setFov(fovTarget, dt);
  }

  setFov(target, dt) {
    const f = lerp(this.camera.fov, target, Math.min(1, 5 * dt));
    if (Math.abs(f - this.camera.fov) > 0.01) {
      this.camera.fov = f;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Weltposition -> Bildschirmkoordinaten (für Popups) */
  project(pos) {
    const v = pos.clone().project(this.camera);
    if (v.z > 1) return null;
    return { x: (v.x * 0.5 + 0.5) * this.w, y: (-v.y * 0.5 + 0.5) * this.h };
  }

  resize() {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
    const cap = this.input.isTouch ? 1.8 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
    this.renderer.setSize(this.w, this.h);
  }

  /** Einfache adaptive Qualität: ruckelt es anfangs, Schatten aus + Auflösung runter */
  adapt(dt) {
    if (this._tuned) return;
    this._fpsAcc += dt; this._fpsN++;
    if (this._fpsN >= 240) {
      const avg = this._fpsN / this._fpsAcc;
      if (avg < 38) {
        this.world.key.castShadow = false;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      }
      this._tuned = true;
    }
  }
}

new Game();
