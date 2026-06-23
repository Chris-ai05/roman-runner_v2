// ============================================================
//  Startseite ("Via Romana") – baut die animierte Hero-Szene
//  (Sonne, Straße, Kolonnade, Triumphbogen, Staub) rein
//  prozedural als DOM auf und garantiert, dass die Reveal-
//  Animationen überall sichtbar enden. Rein dekorativ; das
//  eigentliche Spiel lebt unverändert im Three.js-Canvas.
// ============================================================

/** Mini-Helfer: erzeugt ein Element mit Inline-Styles & Kindern. */
function el(tag, style, children) {
  const n = document.createElement(tag);
  if (style) {
    for (const k in style) {
      if (k.charCodeAt(0) === 45 && k.charCodeAt(1) === 45) n.style.setProperty(k, style[k]); // --custom-prop
      else n.style[k] = style[k];
    }
  }
  if (children != null) {
    for (const c of [].concat(children)) {
      if (c == null) continue;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
  }
  return n;
}

/** Baut alle Ebenen der Hero-Szene und gibt sie als Array zurück. */
function buildHeroScene() {
  const els = [];

  // Sonnen-Glühen am Horizont
  els.push(el('div', {
    position: 'absolute', left: '50%', top: '46%', transform: 'translateX(-50%)',
    width: '340px', height: '340px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,230,170,.95) 0%, rgba(255,190,90,.5) 30%, rgba(255,150,60,.18) 55%, transparent 72%)',
    filter: 'blur(2px)', animation: 'sunGlow 6s ease-in-out infinite', pointerEvents: 'none',
  }));

  // Dunstschleier über dem Horizont
  els.push(el('div', {
    position: 'absolute', left: '0', right: '0', top: '52%', height: '120px',
    background: 'linear-gradient(180deg, transparent, rgba(255,180,110,.22) 60%, transparent)',
    pointerEvents: 'none',
  }));

  // Straße in Fluchtperspektive
  els.push(el('div', {
    position: 'absolute', left: '50%', bottom: '-2%', width: '2600px', height: '1500px',
    transform: 'translateX(-50%) perspective(440px) rotateX(66deg)', transformOrigin: 'bottom center',
    backgroundImage: [
      'linear-gradient(90deg, transparent 32.2%, rgba(255,224,150,.28) 32.6% 33.4%, transparent 33.8%, transparent 66.2%, rgba(255,224,150,.28) 66.6% 67.4%, transparent 67.8%)',
      'repeating-linear-gradient(0deg, rgba(0,0,0,.30) 0 3px, transparent 3px 92px)',
      'linear-gradient(0deg, transparent 38%, rgba(20,11,5,.95) 96%)',
      'linear-gradient(180deg, #9a7c4c, #6b5331)',
    ].join(','),
    backgroundPosition: '0 0, 0 0, 0 0, 0 0',
    animation: 'roadMove 1.15s linear infinite', pointerEvents: 'none',
    boxShadow: '0 0 120px 40px rgba(20,10,4,.6) inset',
  }));

  // 3D-Kolonnade samt fernem Triumphbogen
  const colChildren = [];

  // Triumphbogen am Fluchtpunkt
  colChildren.push(el('div', {
    position: 'absolute', left: '50%', top: '34%', width: '180px', height: '150px',
    marginLeft: '-90px', transform: 'translateZ(-1600px)',
    borderTop: '26px solid #3a2818', borderLeft: '30px solid #3a2818', borderRight: '30px solid #3a2818',
    borderRadius: '60px 60px 0 0', boxSizing: 'border-box',
    boxShadow: '0 0 30px rgba(255,200,90,.25), inset 0 0 20px rgba(0,0,0,.5)',
    animation: 'archHum 5s ease-in-out infinite',
  }, el('div', {
    position: 'absolute', top: '-21px', left: '0', right: '0', textAlign: 'center',
    fontFamily: "'Cinzel',serif", fontSize: '11px', letterSpacing: '.2em', color: '#ffd76a',
  }, 'SPQR')));

  const N = 7, dur = 7;
  for (let i = 0; i < N; i++) {
    const baseDelay = -(i / N) * dur;
    for (const side of [-1, 1]) {
      const tx = side * 165;
      const delay = baseDelay - (side > 0 ? dur / (2 * N) : 0);
      const shaft = el('div', {
        position: 'absolute', inset: '0', borderRadius: '2px',
        background: 'linear-gradient(90deg,#4f3f24 0%,#a98f5b 24%,#e2cd92 50%,#9c814f 76%,#4f3f24 100%)',
        boxShadow: 'inset 0 0 8px rgba(0,0,0,.45)',
      }, el('div', {
        position: 'absolute', inset: '0',
        background: 'repeating-linear-gradient(90deg, rgba(0,0,0,.22) 0 2px, transparent 2px 8px)',
        opacity: '.55', borderRadius: '2px',
      }));
      colChildren.push(el('div', {
        position: 'absolute', left: '50%', top: '30%', width: '42px', height: '168px',
        marginLeft: '-21px', '--tx': tx + 'px', transformStyle: 'preserve-3d',
        animation: `colRun ${dur}s linear infinite`, animationDelay: delay + 's',
      }, [
        // Kapitell
        el('div', { position: 'absolute', top: '-9px', left: '-7px', right: '-7px', height: '11px', borderRadius: '2px', background: 'linear-gradient(180deg,#e6cf94,#a98b52)' }),
        // Schaft (mit Kannelur)
        shaft,
        // Basis
        el('div', { position: 'absolute', bottom: '-8px', left: '-6px', right: '-6px', height: '11px', borderRadius: '2px', background: 'linear-gradient(180deg,#b89a5e,#5a4a2c)' }),
      ]));
    }
  }

  els.push(el('div', {
    position: 'absolute', inset: '0', perspective: '560px', perspectiveOrigin: '50% 40%',
    transformStyle: 'preserve-3d', pointerEvents: 'none',
  }, colChildren));

  // Staubpartikel im Abendlicht
  const motes = [];
  for (let i = 0; i < 18; i++) {
    const size = 2 + Math.random() * 4;
    motes.push(el('div', {
      position: 'absolute', left: (Math.random() * 100) + '%', top: (35 + Math.random() * 55) + '%',
      width: size + 'px', height: size + 'px', borderRadius: '50%',
      background: 'radial-gradient(circle, #ffe9ad, rgba(217,169,62,.2))',
      '--mo': (0.3 + Math.random() * 0.5).toFixed(2),
      animation: `moteFloat ${(4 + Math.random() * 5).toFixed(2)}s ease-in-out infinite`,
      animationDelay: (-Math.random() * 6).toFixed(2) + 's', pointerEvents: 'none',
    }));
  }
  els.push(el('div', { position: 'absolute', inset: '0', pointerEvents: 'none' }, motes));

  return els;
}

/** Reveal-Inhalte dauerhaft sichtbar schalten (Fallback ohne Scroll-Timeline). */
function neutralizeReveals() {
  document.querySelectorAll('.lp-reveal').forEach((n) => {
    n.style.animation = 'none';
    n.style.opacity = '1';
    n.style.transform = 'none';
  });
}

/**
 * Initialisiert die Startseite: füllt die Hero-Szene und sichert das
 * Reveal-on-Scroll ab. Idempotent – ein zweiter Aufruf tut nichts.
 */
export function initLanding() {
  const host = document.getElementById('hero-scene');
  if (host && !host.dataset.built) {
    host.dataset.built = '1';
    for (const node of buildHeroScene()) host.appendChild(node);
  }

  // Startseite sofort einblenden – unabhängig davon, wie lange das Spielmodul
  // (Three.js) zum Laden braucht. Die Zustandslogik (Spiel/Pause/Ende)
  // übernimmt das Ein- und Ausblenden danach ganz normal.
  document.getElementById('screen-menu')?.classList.add('show');

  // Reveal-on-Scroll erledigt CSS via `animation-timeline: view()`. Fehlt die
  // Unterstützung (z. B. Safari/Firefox) – oder wünscht der Nutzer reduzierte
  // Bewegung –, zeigen wir alle Inhalte sofort und dauerhaft an.
  try {
    const supportsView = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!supportsView || reduce) neutralizeReveals();
  } catch (e) {
    neutralizeReveals();
  }
}

// Selbststart – die Startseite ist rein dekorativ und unabhängig vom Spiel
// (Three.js). So erscheint sie sofort, noch bevor das Spielmodul geladen ist.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLanding, { once: true });
} else {
  initLanding();
}
