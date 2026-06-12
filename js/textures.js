// ============================================================
//  Prozedurale Texturen – komplett ohne externe Bilddateien.
//  Alles wird zur Laufzeit auf <canvas> gemalt.
// ============================================================
import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function asTexture(canvas, repeat = false) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 4;
  return t;
}

function speckle(ctx, w, h, n, alpha = 0.06) {
  for (let i = 0; i < n; i++) {
    const g = 120 + Math.random() * 120;
    ctx.fillStyle = `rgba(${g},${g - 20},${g - 50},${alpha * Math.random()})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}

// ---------- Straßenpflaster (Basaltplatten der Via) ----------
export function stoneRoadTexture() {
  const S = 512, c = makeCanvas(S, S), ctx = c.getContext('2d');
  ctx.fillStyle = '#a4937a';
  ctx.fillRect(0, 0, S, S);
  const cols = 4, rows = 6, gw = 5;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = (x + (y % 2) * 0.5) * (S / cols);
      const py = y * (S / rows);
      const w = S / cols - gw, h = S / rows - gw;
      const tone = 158 + Math.random() * 36;
      ctx.fillStyle = `rgb(${tone},${tone - 14},${tone - 38})`;
      ctx.fillRect((px % S), py, w, h);
      if (px + w > S) ctx.fillRect(px - S, py, w, h); // nahtloser Versatz
      // leichte Kante oben hell / unten dunkel
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect((px % S), py, w, 3);
      ctx.fillStyle = 'rgba(40,25,10,0.18)';
      ctx.fillRect((px % S), py + h - 3, w, 3);
    }
  }
  speckle(ctx, S, S, 1400, 0.10);
  // Fahrspurrillen (wie echte römische Straßen!)
  ctx.strokeStyle = 'rgba(50,35,20,0.20)';
  ctx.lineWidth = 10;
  for (const fx of [0.30, 0.70]) {
    ctx.beginPath();
    ctx.moveTo(S * fx, 0); ctx.lineTo(S * fx, S);
    ctx.stroke();
  }
  return asTexture(c, true);
}

// ---------- Marmor ----------
export function marbleTexture() {
  const S = 256, c = makeCanvas(S, S), ctx = c.getContext('2d');
  ctx.fillStyle = '#efe7d6';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 22; i++) {
    ctx.strokeStyle = `rgba(120,110,95,${0.05 + Math.random() * 0.07})`;
    ctx.lineWidth = 0.6 + Math.random() * 1.4;
    ctx.beginPath();
    let x = Math.random() * S, y = Math.random() * S;
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      ctx.quadraticCurveTo(x + randS(60), y + randS(60), x += randS(90), y += randS(90));
    }
    ctx.stroke();
  }
  speckle(ctx, S, S, 300, 0.05);
  return asTexture(c, true);
  function randS(r) { return (Math.random() - 0.5) * r; }
}

// ---------- Römische Ziegel (für Aquädukt-Mauern) ----------
export function brickTexture() {
  const S = 256, c = makeCanvas(S, S), ctx = c.getContext('2d');
  ctx.fillStyle = '#8e5a3c';
  ctx.fillRect(0, 0, S, S);
  const bh = 16, bw = 64;
  for (let y = 0; y < S / bh; y++) {
    for (let x = -1; x < S / bw + 1; x++) {
      const off = (y % 2) * bw * 0.5;
      const tone = 150 + Math.random() * 50;
      ctx.fillStyle = `rgb(${tone},${tone * 0.58},${tone * 0.38})`;
      ctx.fillRect(x * bw + off + 2, y * bh + 2, bw - 4, bh - 4);
    }
  }
  speckle(ctx, S, S, 500, 0.08);
  return asTexture(c, true);
}

// ---------- Markisen-Streifen für Marktstände ----------
export function awningTexture(c1, c2) {
  const c = makeCanvas(128, 32), ctx = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? c1 : c2;
    ctx.fillRect(i * 16, 0, 16, 32);
  }
  const t = asTexture(c, true);
  t.repeat.set(2, 1);
  return t;
}

// ---------- Himmel (goldene Stunde) als Kuppel-Gradient ----------
export function skyTexture() {
  const c = makeCanvas(16, 512), ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.0, '#5d92bb');   // Zenit
  g.addColorStop(0.45, '#9fb9c4');
  g.addColorStop(0.62, '#f3cf9a');  // goldener Dunst
  g.addColorStop(0.78, '#f6b87a');
  g.addColorStop(1.0, '#e9a468');   // Horizont
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 512);
  return asTexture(c);
}

// ---------- Weicher Partikel-Punkt ----------
export function softCircleTexture() {
  const c = makeCanvas(64, 64), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return asTexture(c);
}

// ---------- Sonnen-Glow ----------
export function sunTexture() {
  const c = makeCanvas(128, 128), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,244,214,1)');
  g.addColorStop(0.25, 'rgba(255,214,140,0.9)');
  g.addColorStop(0.6, 'rgba(255,170,90,0.35)');
  g.addColorStop(1, 'rgba(255,160,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return asTexture(c);
}

// ---------- SPQR-Inschrift für Triumphbögen ----------
// Liefert {texture, redraw} – redraw() wird aufgerufen, sobald
// die Webfont (Cinzel) geladen ist, damit die Gravur sauber aussieht.
export function spqrTexture() {
  const c = makeCanvas(512, 192), ctx = c.getContext('2d');
  const draw = () => {
    ctx.fillStyle = '#e9dfc8';
    ctx.fillRect(0, 0, 512, 192);
    speckle(ctx, 512, 192, 350, 0.05);
    ctx.strokeStyle = 'rgba(120,95,50,0.55)';
    ctx.lineWidth = 6;
    ctx.strokeRect(14, 14, 512 - 28, 192 - 28);
    ctx.font = '700 96px Cinzel, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Gravur-Effekt: dunkler Kern + heller Versatz
    ctx.fillStyle = 'rgba(60,40,15,0.85)';
    ctx.fillText('S·P·Q·R', 256, 104);
    ctx.fillStyle = 'rgba(255,240,200,0.35)';
    ctx.fillText('S·P·Q·R', 256, 100);
    tex.needsUpdate = true;
  };
  const tex = asTexture(c);
  draw();
  if (document.fonts?.ready) document.fonts.ready.then(draw);
  return tex;
}
