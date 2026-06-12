// ============================================================
//  InputManager – Tastatur & Touch unter einem Dach.
//  Wischen: links/rechts = Spur, hoch = Sprung, runter = Rutschen.
//  Kurzes Tippen = Sprung. Tastatur: Pfeile/WASD/Leertaste, P/Esc.
// ============================================================

export class InputManager {
  /**
   * @param {HTMLElement} touchLayer  Vollflächiges Element für Gesten
   * @param {Object} h  Callbacks: left,right,jump,slide,pause,any
   */
  constructor(touchLayer, h) {
    this.h = h;
    this.isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    this._bindKeyboard();
    this._bindTouch(touchLayer);
  }

  _fire(name) {
    this.h.any?.();
    this.h[name]?.();
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.code;
      const block = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'];
      if (block.includes(k)) e.preventDefault();
      switch (k) {
        case 'ArrowLeft': case 'KeyA': this._fire('left'); break;
        case 'ArrowRight': case 'KeyD': this._fire('right'); break;
        case 'ArrowUp': case 'KeyW': case 'Space': this._fire('jump'); break;
        case 'ArrowDown': case 'KeyS': this._fire('slide'); break;
        case 'KeyP': case 'Escape': this._fire('pause'); break;
        default: this.h.any?.();
      }
    }, { passive: false });
  }

  _bindTouch(el) {
    if (!el) return;
    let sx = 0, sy = 0, st = 0, active = false;
    const THRESH = 26;     // Mindestweg in px für einen Swipe
    const TAP_T = 260;     // max. Dauer für ein Tippen (ms)
    const TAP_D = 12;      // max. Bewegung für ein Tippen (px)

    el.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      sx = t.clientX; sy = t.clientY; st = performance.now();
      active = true;
      this.h.any?.();
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
      if (!active) return;
      const t = e.touches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      // Sobald die Schwelle gerissen ist, sofort auslösen (fühlt sich direkter an)
      if (Math.abs(dx) > THRESH || Math.abs(dy) > THRESH) {
        active = false;
        if (Math.abs(dx) > Math.abs(dy)) this._fire(dx > 0 ? 'right' : 'left');
        else this._fire(dy > 0 ? 'slide' : 'jump');
      }
      e.preventDefault();
    }, { passive: false });

    el.addEventListener('touchend', (e) => {
      if (!active) return;
      active = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      const dt = performance.now() - st;
      if (dt < TAP_T && Math.hypot(dx, dy) < TAP_D) this._fire('jump');
    }, { passive: true });

    el.addEventListener('touchcancel', () => { active = false; }, { passive: true });
  }
}
