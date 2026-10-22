/* Hero: il logo di WGT-01 ridisegnato in tempo reale da un algoritmo.
   Il pannello accanto funziona come quello del plugin: stile, densità, pausa.
   Il cursore illumina il campo dove passa. */
import { loadImage, boxBlur, contourSegments, BAYER8, MONO } from '../engines.js';
import { fitCanvas, loop, reduceMotion } from '../main.js';

const RAMP = ' .·:-=+*o#%@';
const WHITE = '#ffffff';
const GREEN = '#35b978';

export default async function hero(section) {
  const canvas = section.querySelector('canvas');
  const root = document.documentElement.dataset.root || './';
  const logo = await loadImage(root + 'assets/img/logo-white.png');
  try { await document.fonts.load(`16px "Martian Mono"`); } catch {}

  const styleBtns = [...section.querySelectorAll('[data-hero-style]')];
  const density = section.querySelector('[data-hero-density]');
  const pauseBtn = section.querySelector('[data-hero-pause]');
  const st = { style: 'ascii', dens: 0.55, playing: !reduceMotion, t: 0 };
  const ptr = { x: -9999, y: -9999, k: 0 };
  let L = null;

  /* Campo di base: il logo (nitido) + un alone che serve da "distanza" per le onde. */
  function layout() {
    const { ctx, W, H, dpr } = fitCanvas(canvas, 1.75);
    const g = Math.max(3, Math.round(5 * dpr));
    const gw = Math.ceil(W / g), gh = Math.ceil(H / g);
    const off = document.createElement('canvas');
    off.width = gw; off.height = gh;
    const ox = off.getContext('2d', { willReadFrequently: true });
    const narrow = W / dpr < 860;
    const lh = gh * (narrow ? 0.5 : 0.9);
    const lw = lh * (logo.naturalWidth / logo.naturalHeight);
    const cx = gw * (narrow ? 0.62 : 0.64), cy = gh * (narrow ? 0.3 : 0.5);
    ox.drawImage(logo, cx - lw / 2, cy - lh / 2, lw, lh);
    const d = ox.getImageData(0, 0, gw, gh).data;
    const a = new Float32Array(gw * gh);
    for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] / 255;
    const A = boxBlur(a, gw, gh, 1);
    const G = boxBlur(boxBlur(boxBlur(a, gw, gh, 7), gw, gh, 7), gw, gh, 5);
    L = { ctx, W, H, dpr, g, gw, gh, A, G };
  }

  /* Valore del campo (0..1) in un punto del canvas al tempo t. */
  function field(x, y, t) {
    const i = Math.min(L.gh - 1, Math.max(0, (y / L.g) | 0)) * L.gw + Math.min(L.gw - 1, Math.max(0, (x / L.g) | 0));
    const a = L.A[i], gl = L.G[i];
    let v = a * 0.92 + gl * 0.5;
    if (gl > 0.015) v += 0.13 * Math.sin(gl * 26 - t * 1.7) * (1 - a);
    if (ptr.k > 0) {
      const dx = x - ptr.x, dy = y - ptr.y, s = 90 * L.dpr;
      v += 0.55 * ptr.k * Math.exp(-(dx * dx + dy * dy) / (2 * s * s));
    }
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }
  const inLogo = (x, y) => L.A[Math.min(L.gh - 1, (y / L.g) | 0) * L.gw + Math.min(L.gw - 1, (x / L.g) | 0)] > 0.5;

  function drawAscii(t) {
    const { ctx, W, H, dpr } = L;
    const size = Math.round((16 - st.dens * 9) * dpr);
    ctx.font = `${size}px ${MONO}`;
    ctx.textBaseline = 'top';
    const cw = ctx.measureText('M').width;
    const cols = Math.ceil(W / cw), rows = Math.ceil(H / size);
    const n = RAMP.length - 1;
    for (let r = 0; r < rows; r++) {
      let w = '', gch = '';
      const y = r * size + size / 2;
      for (let c = 0; c < cols; c++) {
        const x = c * cw + cw / 2;
        const ch = RAMP[Math.round(field(x, y, t) * n)];
        if (ch !== ' ' && inLogo(x, y)) { w += ch; gch += ' '; } else { w += ' '; gch += ch; }
      }
      ctx.fillStyle = WHITE; ctx.fillText(w, 0, r * size);
      ctx.fillStyle = GREEN; ctx.fillText(gch, 0, r * size);
    }
  }

  function drawHalftone(t) {
    const { ctx, W, H, dpr } = L;
    const step = (18 - st.dens * 11) * dpr;
    const pw = new Path2D(), pg = new Path2D();
    for (let j = 0, y = step / 2; y < H + step; y += step * 0.866, j++)
      for (let x = (j & 1 ? step / 2 : 0); x < W + step; x += step) {
        const r = step * 0.58 * Math.sqrt(field(x, y, t));
        if (r < 0.6) continue;
        const p = inLogo(x, y) ? pw : pg;
        p.moveTo(x + r, y); p.arc(x, y, r, 0, Math.PI * 2);
      }
    ctx.fillStyle = WHITE; ctx.fill(pw);
    ctx.fillStyle = GREEN; ctx.fill(pg);
  }

  let dBuf = null;
  function drawDither(t) {
    const { ctx, W, H, dpr } = L;
    const p = Math.max(2, Math.round((6 - st.dens * 4) * dpr));
    const w = Math.ceil(W / p), h = Math.ceil(H / p);
    if (!dBuf || dBuf.width !== w || dBuf.height !== h) { dBuf = document.createElement('canvas'); dBuf.width = w; dBuf.height = h; }
    const bx = dBuf.getContext('2d');
    const im = bx.createImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const X = x * p + p / 2, Y = y * p + p / 2;
        if (field(X, Y, t) <= (BAYER8[(y & 7) * 8 + (x & 7)] + 0.5) / 64) continue;
        const j = (y * w + x) * 4;
        if (inLogo(X, Y)) { im.data[j] = 255; im.data[j + 1] = 255; im.data[j + 2] = 255; }
        else { im.data[j] = 0x35; im.data[j + 1] = 0xb9; im.data[j + 2] = 0x78; }
        im.data[j + 3] = 255;
      }
    bx.putImageData(im, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(dBuf, 0, 0, w * p, h * p);
  }

  function drawContour(t) {
    const { ctx, W, H, dpr } = L;
    const r = (10 - st.dens * 6) * dpr;
    const w = Math.ceil(W / r) + 1, h = Math.ceil(H / r) + 1;
    const f = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) f[y * w + x] = field(x * r, y * r, t);
    const N = 14;
    const levels = Array.from({ length: N }, (_, i) => (i + 0.5) / N);
    ctx.lineCap = 'round';
    contourSegments(f, w, h, levels).forEach(({ t: lv, seg }, i) => {
      const p = new Path2D();
      for (let k = 0; k < seg.length; k += 4) { p.moveTo(seg[k] * r, seg[k + 1] * r); p.lineTo(seg[k + 2] * r, seg[k + 3] * r); }
      ctx.strokeStyle = lv > 0.6 ? WHITE : GREEN;
      ctx.lineWidth = (i % 4 === 0 ? 2.2 : 1) * dpr;
      ctx.stroke(p);
    });
  }

  const DRAW = { ascii: drawAscii, halftone: drawHalftone, dither: drawDither, curve: drawContour };
  function draw() {
    if (!L) return;
    L.ctx.fillStyle = '#000';
    L.ctx.fillRect(0, 0, L.W, L.H);
    DRAW[st.style](st.t);
  }

  layout();
  draw();
  const anim = loop(canvas, (dt) => {
    if (st.playing) st.t += dt;
    if (ptr.k > 0 && !ptr.on) ptr.k = Math.max(0, ptr.k - dt * 1.5);
    draw();
  });
  anim.kick();

  /* controlli del pannello */
  styleBtns.forEach((b) => b.addEventListener('click', () => {
    st.style = b.dataset.heroStyle;
    styleBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    draw();
  }));
  density?.addEventListener('input', () => { st.dens = density.value / 100; draw(); });
  pauseBtn?.addEventListener('click', () => {
    st.playing = !st.playing;
    pauseBtn.setAttribute('aria-pressed', String(!st.playing));
    pauseBtn.querySelector('span').textContent = st.playing ? 'Pausa' : 'Riprendi';
  });
  if (!st.playing && pauseBtn) { pauseBtn.setAttribute('aria-pressed', 'true'); pauseBtn.querySelector('span').textContent = 'Riprendi'; }

  const move = (e) => {
    const r = canvas.getBoundingClientRect();
    ptr.x = (e.clientX - r.left) * L.dpr; ptr.y = (e.clientY - r.top) * L.dpr;
    ptr.k = 1; ptr.on = true;
    if (reduceMotion) draw();
  };
  section.addEventListener('pointermove', move);
  section.addEventListener('pointerleave', () => { ptr.on = false; if (reduceMotion) { ptr.k = 0; draw(); } });

  let rt = 0, lastW = canvas.clientWidth, lastH = canvas.clientHeight;
  new ResizeObserver(() => {
    if (canvas.clientWidth === lastW && Math.abs(canvas.clientHeight - lastH) < 120) return;
    lastW = canvas.clientWidth; lastH = canvas.clientHeight;
    clearTimeout(rt);
    rt = setTimeout(() => { layout(); draw(); }, 150);
  }).observe(canvas);
}
