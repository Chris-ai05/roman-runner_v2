// ============================================================
//  UI – alles, was DOM ist: Bildschirme, HUD, Popups, Banner.
//  Drei.js rendert die Welt, dieses Modul das „Pergament" drumherum.
// ============================================================
import { toRoman } from './config.js';

const ICONS = {
  shield: '<svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.4 8.7-8 11-4.6-2.3-8-6-8-11V5l8-3z" fill="currentColor"/></svg>',
  magnet: '<svg viewBox="0 0 24 24"><path d="M5 3h5v9a2 2 0 004 0V3h5v9a7 7 0 01-14 0V3z" fill="currentColor"/><rect x="5" y="3" width="5" height="4" fill="#fff" opacity=".55"/><rect x="14" y="3" width="5" height="4" fill="#fff" opacity=".55"/></svg>',
  boost: '<svg viewBox="0 0 24 24"><path d="M3 13c6 1 9-2 11-7 1 5-1 9-5 11l9-2-2 4c-6 2-11 0-13-6z" fill="currentColor"/></svg>',
  laurel: '<svg viewBox="0 0 24 24"><path d="M12 21C7 19 4 15 4 9c2 0 4 1 5 3-2-3-2-6 0-9 2 3 2 6 0 9 1-2 3-3 5-3 0 0 0 0 0 0 2 0 4 1 5 3 0 0 0 0 0 0 0 6-3 8-7 9z" fill="none"/><path d="M12 21c-5-2-8-6-8-12 4 1 6 4 6 8M12 21c5-2 8-6 8-12-4 1-6 4-6 8M12 3v18" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
};

// 2D-Embleme für die Skin-Karten (currentColor -> per Zustand eingefärbt)
const SKIN_EMBLEMS = {
  legionary: '<svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true"><path d="M32 3c-7 3-10 8-11 14 6-2 10-6 11-10 1 4 5 8 11 10-1-6-4-11-11-14z" opacity=".9"/><rect x="30" y="12" width="4" height="9"/><path d="M16 37a16 16 0 0 1 32 0z"/><rect x="14" y="35" width="36" height="5" rx="2"/><path d="M19 40v7a5 5 0 0 0 5 5h2V40z"/><path d="M45 40v7a5 5 0 0 1-5 5h-2V40z"/><rect x="30" y="40" width="4" height="12" rx="1.5"/></svg>',
  gladiator: '<svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true"><path d="M32 2c-7 4-9 9-9 14h18c0-5-2-10-9-14z" opacity=".9"/><rect x="30" y="12" width="4" height="8"/><ellipse cx="32" cy="33" rx="15" ry="15"/><path d="M13 31c10-8 28-8 38 0-10 6-28 6-38 0z"/><rect x="24" y="31" width="16" height="3.4" rx="1.7" fill="#0e0a06" opacity=".55"/><g fill="#0e0a06" opacity=".5"><circle cx="27" cy="39" r="1.4"/><circle cx="32" cy="39" r="1.4"/><circle cx="37" cy="39" r="1.4"/></g></svg>',
  _default: '<svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true"><circle cx="32" cy="22" r="10"/><path d="M14 54a18 18 0 0 1 36 0z"/></svg>',
};

export const POWER_LABELS = {
  shield: 'Schild der Legion',
  magnet: 'Magnet-Amulett',
  boost: 'Merkurs Sandalen',
  laurel: 'Lorbeer des Ruhms',
};

const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.floor(n).toLocaleString('de-DE');

export class UI {
  /**
   * @param {Object} cb  {start, retry, menu, resume, toggleMute}
   */
  constructor(cb) {
    this.cb = cb;
    this.el = {
      menu: $('screen-menu'), over: $('screen-over'), pause: $('screen-pause'),
      hud: $('hud'),
      score: $('hud-score'), mult: $('hud-mult'),
      coins: $('hud-coins'), best: $('hud-best'),
      speed: $('hud-speed-fill'), chips: $('chips'),
      banner: $('banner'), bannerTitle: $('banner-title'), bannerSub: $('banner-sub'),
      toast: $('toast'), hint: $('hint'),
      popups: $('popups'), vignette: $('vignette'),
      menuBest: $('menu-best'), menuCoins: $('menu-coins'),
      controlsKeys: $('controls-keys'), controlsTouch: $('controls-touch'),
      skins: $('screen-skins'), skinList: $('skin-list'), skinsCoins: $('skins-coins'),
      overScore: $('over-score'), overCoins: $('over-coins'), overBest: $('over-best'),
      overRecord: $('over-record'), overTip: $('over-tip'),
      confetti: $('confetti'),
      mute: $('btn-mute'),
    };

    // Mehrere „Lauf beginnen"-Knöpfe auf der Startseite (Hero + finaler CTA)
    document.querySelectorAll('.js-start').forEach((b) => b.addEventListener('click', () => cb.start()));
    $('btn-retry').addEventListener('click', () => cb.retry());
    $('btn-menu').addEventListener('click', () => cb.menu());
    $('btn-resume').addEventListener('click', () => cb.resume());
    $('btn-pause-menu').addEventListener('click', () => cb.menu());
    this.el.mute.addEventListener('click', () => this.setMuted(cb.toggleMute()));

    // „Die Welt erkunden" scrollt sanft zum ersten Inhaltsabschnitt
    const explore = $('btn-explore');
    if (explore) explore.addEventListener('click', () => {
      document.getElementById('welt')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Charaktermenü / Shop
    document.querySelectorAll('.js-skins').forEach((b) => b.addEventListener('click', () => cb.openSkins()));
    const skinsBack = $('btn-skins-back');
    if (skinsBack) skinsBack.addEventListener('click', () => cb.closeSkins());
    if (this.el.skinList) this.el.skinList.addEventListener('click', (e) => {
      const card = e.target.closest('.skin-card');
      if (!card) return;
      const id = card.dataset.id;
      const btn = e.target.closest('.skin-btn');
      if (btn) {
        if (btn.disabled) return;
        if (btn.dataset.act === 'buy') cb.buySkin(id);
        else cb.equipSkin(id);
      } else {
        cb.previewSkin(id);
      }
    });

    this.chipEls = new Map();
    this._cache = {};
    this._bannerT = null;
    this._toastT = null;
    this._hintT = null;
  }

  // ---------- Bildschirm-Steuerung ----------
  _show(el, on) { el.classList.toggle('show', on); }

  showMenu({ best, totalCoins, muted, isTouch }) {
    this.el.menuBest.textContent = fmt(best);
    this.el.menuCoins.textContent = fmt(totalCoins);
    if (this.el.controlsKeys) this.el.controlsKeys.style.display = isTouch ? 'none' : '';
    if (this.el.controlsTouch) this.el.controlsTouch.style.display = isTouch ? '' : 'none';
    this.setMuted(muted);
    this.el.menu.scrollTop = 0; // Startseite immer oben am Hero beginnen
    this._show(this.el.menu, true);
    this._show(this.el.over, false);
    this._show(this.el.pause, false);
    this._show(this.el.hud, false);
  }

  showHUD() {
    this._show(this.el.menu, false);
    this._show(this.el.over, false);
    this._show(this.el.pause, false);
    this._show(this.el.hud, true);
  }

  showPause(on) { this._show(this.el.pause, on); }

  showOver({ score, coins, best, record, tip }) {
    this.el.overScore.textContent = fmt(score);
    this.el.overCoins.textContent = fmt(coins);
    this.el.overBest.textContent = fmt(best);
    this.el.overRecord.style.display = record ? '' : 'none';
    this.el.overTip.textContent = tip;
    this._show(this.el.over, true);
    this._show(this.el.hud, false);
    if (record) this.confettiBurst();
  }

  // ---------- Charaktermenü / Shop ----------
  showSkins(state) {
    this.renderSkins(state);
    this._show(this.el.menu, false);
    this._show(this.el.skins, true);
    this._show(this.el.over, false);
    this._show(this.el.pause, false);
    this._show(this.el.hud, false);
  }

  /** (Neu-)Zeichnet die Skin-Karten und die Münz-Anzeige. */
  renderSkins(state) {
    if (this.el.skinsCoins) this.el.skinsCoins.textContent = fmt(state.coins);
    const list = this.el.skinList;
    if (!list) return;
    const owned = new Set(state.owned);
    list.innerHTML = '';
    for (const s of state.skins) {
      const isOwned = owned.has(s.id);
      const isEquipped = state.equipped === s.id;
      const isPreview = state.preview === s.id;

      const card = document.createElement('div');
      card.className = 'skin-card'
        + (isPreview ? ' preview' : '')
        + (isEquipped ? ' equipped' : '')
        + (isOwned ? '' : ' locked');
      card.dataset.id = s.id;

      let action;
      if (isEquipped) {
        action = '<span class="skin-badge">Ausgewählt ✓</span>';
      } else if (isOwned) {
        action = '<button type="button" class="skin-btn skin-equip" data-act="equip">Auswählen</button>';
      } else {
        const afford = state.coins >= s.price;
        action = `<button type="button" class="skin-btn skin-buy" data-act="buy"${afford ? '' : ' disabled'}>`
          + `Kaufen <span class="coin-dot" aria-hidden="true"></span>${fmt(s.price)}</button>`;
      }

      card.innerHTML =
        `<div class="skin-emblem">${SKIN_EMBLEMS[s.id] || SKIN_EMBLEMS._default}</div>`
        + `<div class="skin-name">${s.name}</div>`
        + `<div class="skin-desc">${s.desc}</div>`
        + `<div class="skin-action">${action}</div>`;
      list.appendChild(card);
    }
  }

  // ---------- HUD ----------
  updateHUD({ score, coins, best, speed01, mult }) {
    const c = this._cache;
    const s = Math.floor(score);
    if (c.score !== s) { c.score = s; this.el.score.textContent = fmt(s); }
    if (c.coins !== coins) { c.coins = coins; this.el.coins.textContent = fmt(coins); }
    if (c.best !== best) { c.best = best; this.el.best.textContent = fmt(best); }
    const sp = Math.round(speed01 * 100);
    if (c.sp !== sp) { c.sp = sp; this.el.speed.style.width = sp + '%'; }
    if (c.mult !== mult) {
      c.mult = mult;
      this.el.mult.textContent = mult > 1 ? '×' + toRoman(mult) : '';
      this.el.score.classList.toggle('golden', mult > 1);
    }
  }

  /** Power-up-Chips mit Countdown-Ring */
  setChips(list) {
    const want = new Set(list.map(c => c.type));
    for (const [type, el] of this.chipEls) {
      if (!want.has(type)) { el.remove(); this.chipEls.delete(type); }
    }
    for (const c of list) {
      let el = this.chipEls.get(c.type);
      if (!el) {
        el = document.createElement('div');
        el.className = 'chip chip-' + c.type;
        el.innerHTML = `<span class="chip-ring"></span><span class="chip-icon">${ICONS[c.type]}</span>`;
        this.el.chips.appendChild(el);
        this.chipEls.set(c.type, el);
      }
      el.style.setProperty('--p', c.frac);
    }
  }

  // ---------- Feedback ----------
  banner(title, sub = '') {
    this.el.bannerTitle.textContent = title;
    this.el.bannerSub.textContent = sub;
    this.el.banner.classList.remove('show');
    void this.el.banner.offsetWidth; // Animation neu starten
    this.el.banner.classList.add('show');
    clearTimeout(this._bannerT);
    this._bannerT = setTimeout(() => this.el.banner.classList.remove('show'), 1900);
  }

  toast(text) {
    this.el.toast.textContent = text;
    this.el.toast.classList.remove('show');
    void this.el.toast.offsetWidth;
    this.el.toast.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => this.el.toast.classList.remove('show'), 1700);
  }

  hint(text, ms = 1600) {
    this.el.hint.textContent = text;
    this.el.hint.classList.add('show');
    clearTimeout(this._hintT);
    this._hintT = setTimeout(() => this.el.hint.classList.remove('show'), ms);
  }

  popupAt(x, y, text, cls = '') {
    const d = document.createElement('div');
    d.className = 'popup ' + cls;
    d.textContent = text;
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    this.el.popups.appendChild(d);
    setTimeout(() => d.remove(), 950);
  }

  flash(type) { // 'hit' | 'gold'
    const v = this.el.vignette;
    v.classList.remove('hit', 'gold');
    void v.offsetWidth;
    v.classList.add(type);
    setTimeout(() => v.classList.remove(type), 420);
  }

  confettiBurst() {
    const box = this.el.confetti;
    box.innerHTML = '';
    const colors = ['#ffd76a', '#d9a93e', '#b8332f', '#efe3c8'];
    for (let i = 0; i < 30; i++) {
      const s = document.createElement('span');
      s.style.left = Math.random() * 100 + '%';
      s.style.background = colors[i % colors.length];
      s.style.animationDelay = (Math.random() * 0.7) + 's';
      s.style.animationDuration = (1.6 + Math.random() * 1.4) + 's';
      box.appendChild(s);
    }
    setTimeout(() => { box.innerHTML = ''; }, 3600);
  }

  setMuted(m) {
    this.el.mute.textContent = m ? '🔇' : '🔊';
    this.el.mute.setAttribute('aria-pressed', String(m));
    this.el.mute.title = m ? 'Ton einschalten' : 'Ton ausschalten';
  }
}
