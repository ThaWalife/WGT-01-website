/* Hero: l'immagine del logo in rilievo (assets/img/hero-src.jpg) ridisegnata in tempo
   reale da un algoritmo — Dither, Halftone o ASCII — come in una ripresa lenta.
   Intorno, artefatti grigi: polvere di caratteri, grana, glitch, mirino con timecode.
   Il pannello funziona come quello del plugin: stile, densità, pausa. */
import { loadImage, BAYER8, MONO, rng } from '../engines.js';
import { fitCanvas, loop, reduceMotion } from '../core.js';

const GRAY = '#8a8a8a';
const GRAY_D = '#454545';
// rampa di verdi (dall'ombra alla luce), come i fosfori dell'immagine
const RAMP = [[0, 0, 0], [5, 38, 18], [10, 84, 40], [20, 140, 66], [53, 196, 110], [140, 245, 180], [215, 255, 232]];
const CH = ' .·:-=+*o#%@';

export default async function hero(section) {
  const canvas = section.querySelector('canvas');
  const root = document.documentElement.dataset.root || './';
  const src = await loadImage(root + 'assets/img/hero-src.jpg');
  try { await document.fonts.load(`16px "Martian Mono"`); } catch {}

  const styleBtns = [...section.querySelectorAll('[data-hero-style]')];
  const density = section.querySelector('[data-hero-density]');
  const pauseBtn = section.querySelector('[data-hero-pause]');
  const st = { style: 'dither', dens: 0.55, playing: !reduceMotion, t: 0 };
  const ptr = { x: 0.5, y: 0.5, k: 0, on: false };
  const rnd = rng(5);
  const dust = Array.from({ length: 180 }, () => ({
    x: (rnd() - 0.5) * 3.2, y: (rnd() - 0.5) * 2.2, z: 0.6 + rnd() * 2.6,
    c: '·.:+*#=░'[(rnd() * 8) | 0], s: 0.6 + rnd() * 0.8,
  }));

  let L = null;
  const sample = document.createElement('canvas');
  const sx = sample.getContext('2d', { willReadFrequently: true });
  const buf = document.createElement('canvas');
  const bx = buf.getContext('2d');

  function layout() {
    const { ctx, W, H, dpr } = fitCanvas(canvas, 1);
    const narrow = W / dpr < 860;
    const scan = document.createElement('canvas');
    scan.width = 1; scan.height = 3;
    const s = scan.getContext('2d');
    s.fillStyle = 'rgba(0,0,0,0.3)'; s.fillRect(0, 0, 1, 1);
    const over = document.createElement('canvas');
    over.width = W; over.height = H;
    const ox = over.getContext('2d');
    ox.fillStyle = ox.createPattern(scan, 'repeat'); ox.fillRect(0, 0, W, H);
    const vig = ox.createRadialGradient(W * 0.6, H * 0.5, Math.min(W, H) * 0.3, W * 0.6, H * 0.5, Math.max(W, H) * 0.8);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.8)');
    ox.fillStyle = vig; ox.fillRect(0, 0, W, H);
    if (!narrow) {
      const left = ox.createLinearGradient(0, 0, W * 0.55, 0);
      left.addColorStop(0, 'rgba(0,0,0,0.85)'); left.addColorStop(1, 'rgba(0,0,0,0)');
      ox.fillStyle = left; ox.fillRect(0, 0, W, H);
    } else {
      const bot = ox.createLinearGradient(0, H * 0.35, 0, H);
      bot.addColorStop(0, 'rgba(0,0,0,0)'); bot.addColorStop(1, 'rgba(0,0,0,0.85)');
      ox.fillStyle = bot; ox.fillRect(0, 0, W, H);
    }
    L = { ctx, W, H, dpr, narrow, over, fade: makeFade(W, H, dpr) };
  }

  /* Uscita verso la sezione sotto (bianca): l'immagine si scioglie nel bianco con lo stesso
     dither ordinato 8×8 e la stessa misura di pixel delle bande tra le sezioni. */
  const FADE_CELL = 4, FADE_ROWS = 30;
  function makeFade(W, H, dpr) {
    const cell = FADE_CELL * dpr, rows = FADE_ROWS, cols = Math.ceil(W / cell);
    const c = document.createElement('canvas');
    c.width = W; c.height = Math.round(rows * cell);
    const x = c.getContext('2d');
    x.fillStyle = '#ffffff';
    for (let r = 0; r < rows; r++) {
      const t = Math.pow((r + 1) / rows, 1.35);
      for (let i = 0; i < cols; i++)
        if ((BAYER8[(r & 7) * 8 + (i & 7)] + 0.5) / 64 < t) x.fillRect(Math.round(i * cell), Math.round(r * cell), Math.ceil(cell), Math.ceil(cell));
    }
    // ultima riga piena: si salda alla sezione sotto
    x.fillRect(0, c.height - Math.ceil(cell), W, Math.ceil(cell));
    return c;
  }

  /* Campiona l'immagine con una ripresa lenta (zoom e panoramica) a una griglia gw×gh. */
  function grab(gw, gh, t) {
    if (sample.width !== gw || sample.height !== gh) { sample.width = gw; sample.height = gh; }
    const iw = src.naturalWidth, ih = src.naturalHeight;
    const aspect = L.W / L.H;
    const z = 1.1 + 0.06 * Math.sin(t * 0.05);
    let sw = iw / z, sh = sw / aspect;
    if (sh > ih / z) { sh = ih / z; sw = sh * aspect; }
    const cx = iw * (0.5 + 0.04 * Math.sin(t * 0.037)) - (L.narrow ? iw * 0.08 : iw * 0.06);
    const cy = ih * (0.5 + 0.03 * Math.cos(t * 0.031));
    const x0 = Math.max(0, Math.min(iw - sw, cx - sw / 2)), y0 = Math.max(0, Math.min(ih - sh, cy - sh / 2));
    sx.drawImage(src, x0, y0, sw, sh, 0, 0, gw, gh);
    const d = sx.getImageData(0, 0, gw, gh).data;
    const g = new Float32Array(gw * gh);
    const flick = 0.96 + 0.04 * Math.sin(t * 13);
    const pk = ptr.k, px = ptr.x * gw, py = ptr.y * gh, pr = gw * 0.12;
    for (let i = 0, j = 0; i < g.length; i++, j += 4) {
      let v = (0.25 * d[j] + 0.65 * d[j + 1] + 0.1 * d[j + 2]) / 255;
      v = Math.min(1, Math.pow(v, 0.85) * 1.15 * flick);
      if (pk > 0) {
        const x = i % gw, y = (i / gw) | 0, dx = x - px, dy = y - py;
        v += 0.3 * pk * Math.exp(-(dx * dx + dy * dy) / (2 * pr * pr));
      }
      g[i] = v > 1 ? 1 : v;
    }
    return g;
  }

  function drawDither(t) {
    const { ctx, W, H, dpr } = L;
    const p = Math.max(2, Math.round((5 - st.dens * 3) * dpr));
    const gw = Math.ceil(W / p), gh = Math.ceil(H / p);
    const g = grab(gw, gh, t);
    if (buf.width !== gw || buf.height !== gh) { buf.width = gw; buf.height = gh; }
    const im = bx.createImageData(gw, gh);
    const n = RAMP.length - 1;
    for (let y = 0; y < gh; y++)
      for (let x = 0; x < gw; x++) {
        const i = y * gw + x;
        const q = Math.max(0, Math.min(n, Math.floor(g[i] * n + (BAYER8[(y & 7) * 8 + (x & 7)] + 0.5) / 64)));
        const c = RAMP[q], o = i * 4;
        im.data[o] = c[0]; im.data[o + 1] = c[1]; im.data[o + 2] = c[2]; im.data[o + 3] = 255;
      }
    bx.putImageData(im, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, gw * p, gh * p);
  }

  function drawHalftone(t) {
    const { ctx, W, H, dpr } = L;
    const step = (16 - st.dens * 9) * dpr;
    const gw = Math.ceil(W / step) + 1, gh = Math.ceil(H / (step * 0.866)) + 1;
    const g = grab(gw, gh, t);
    const paths = RAMP.map(() => new Path2D());
    for (let j = 0; j < gh; j++)
      for (let i = 0; i < gw; i++) {
        const v = g[j * gw + i];
        const r = step * 0.6 * Math.sqrt(v);
        if (r < 0.6) continue;
        const x = i * step + (j & 1 ? step / 2 : 0), y = j * step * 0.866;
        const q = Math.max(1, Math.min(RAMP.length - 1, Math.round(v * (RAMP.length - 1))));
        paths[q].moveTo(x + r, y); paths[q].arc(x, y, r, 0, Math.PI * 2);
      }
    paths.forEach((p, q) => { if (q) { ctx.fillStyle = `rgb(${RAMP[q]})`; ctx.fill(p); } });
  }

  function drawAscii(t) {
    const { ctx, W, H, dpr } = L;
    const size = Math.round((15 - st.dens * 8) * dpr);
    ctx.font = `${size}px ${MONO}`;
    ctx.textBaseline = 'top';
    const cw = ctx.measureText('M').width;
    const gw = Math.ceil(W / cw), gh = Math.ceil(H / size);
    const g = grab(gw, gh, t);
    const n = CH.length - 1;
    const bands = [[0.35, RAMP[3]], [0.6, RAMP[4]], [1.01, RAMP[5]]];
    for (let y = 0; y < gh; y++) {
      const rows = bands.map(() => '');
      for (let x = 0; x < gw; x++) {
        const v = g[y * gw + x];
        const ch = CH[Math.round(v * n)];
        const b = bands.findIndex(([lim]) => v < lim);
        for (let k = 0; k < bands.length; k++) rows[k] += k === b ? ch : ' ';
      }
      bands.forEach(([, c], k) => { ctx.fillStyle = `rgb(${c})`; ctx.fillText(rows[k], 0, y * size); });
    }
  }

  /* ---- artefatti grigi ---- */
  const dustSprites = new Map();
  function dustSprite(ch, sb, near) {
    const key = ch + sb + near;
    let c = dustSprites.get(key);
    if (c) return c;
    const px = Math.round(11 * L.dpr * (0.8 + sb * 0.45));
    c = document.createElement('canvas');
    c.width = c.height = px * 2;
    const x = c.getContext('2d');
    x.font = `${px}px ${MONO}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = near ? GRAY : GRAY_D;
    x.fillText(ch, px, px);
    dustSprites.set(key, c);
    return c;
  }
  function drawDust(t) {
    const { ctx, W, H } = L;
    for (const p of dust) {
      let z = p.z - ((t * 0.05 * p.s) % 3.2);
      if (z < 0.4) z += 3.2;
      const x = W / 2 + (p.x / z) * W * 0.45, y = H / 2 + (p.y / z) * W * 0.45;
      if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
      ctx.globalAlpha = Math.min(0.9, 0.9 / z);
      const sb = Math.min(4, Math.max(0, Math.round((1.2 / z - 0.8) / 0.45)));
      const sp = dustSprite(p.c, sb, z < 1 ? 1 : 0);
      ctx.drawImage(sp, x - sp.width / 2, y - sp.height / 2);
    }
    ctx.globalAlpha = 1;
  }
  function drawGrain() {
    const { ctx, W, H, dpr } = L;
    ctx.fillStyle = GRAY_D;
    const s = Math.max(1, dpr);
    for (let i = 0; i < 300; i++) ctx.fillRect(Math.random() * W, Math.random() * H, s, s);
  }
  let glitchUntil = 0, nextGlitch = 2;
  function drawGlitch(t) {
    const { ctx, W, H, dpr } = L;
    if (t > nextGlitch) { glitchUntil = t + 0.16; nextGlitch = t + 1.8 + Math.random() * 2.6; }
    if (t > glitchUntil) return;
    for (let i = 0; i < 4; i++) {
      const y = Math.random() * H, h = (4 + Math.random() * 26) * dpr, dx = (Math.random() - 0.5) * 80 * dpr;
      ctx.drawImage(canvas, 0, y, W, h, dx, y, W, h);
      ctx.fillStyle = 'rgba(110,110,110,.35)';
      ctx.fillRect(0, y + h - dpr, W, dpr);
    }
  }
  function drawViewfinder(t) {
    const { ctx, W, H, dpr } = L;
    const m = 26 * dpr, top = 76 * dpr, len = 22 * dpr, bot = H - FADE_ROWS * FADE_CELL * dpr - 12 * dpr;
    ctx.strokeStyle = GRAY;
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    for (const [x, y, sx2, sy2] of [[m, top, 1, 1], [W - m, top, -1, 1], [m, bot, 1, -1], [W - m, bot, -1, -1]]) {
      ctx.moveTo(x, y + sy2 * len); ctx.lineTo(x, y); ctx.lineTo(x + sx2 * len, y);
    }
    ctx.stroke();
    const fr = Math.floor(t * 24);
    const tc = [Math.floor(fr / 86400), Math.floor(fr / 1440) % 60, Math.floor(fr / 24) % 60, fr % 24].map((x) => String(x).padStart(2, '0')).join(':');
    ctx.fillStyle = GRAY;
    ctx.font = `${Math.round(11 * dpr)}px ${MONO}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'right';
    ctx.fillText(`TC ${tc}`, W - m - 6 * dpr, top + 8 * dpr);
    ctx.fillText(`CAM A · 24 FPS · ${st.style.toUpperCase()}`, W - m - 6 * dpr, top + 24 * dpr);
    ctx.textAlign = 'left';
  }

  const DRAW = { dither: drawDither, halftone: drawHalftone, ascii: drawAscii };
  function draw() {
    if (!L) return;
    const { ctx, W, H } = L;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    DRAW[st.style](st.t);
    ctx.drawImage(L.over, 0, 0);
    drawGrain();
    drawDust(st.t);
    if (st.playing) drawGlitch(st.t);
    drawViewfinder(st.t);
    ctx.drawImage(L.fade, 0, H - L.fade.height);
  }

  layout();
  draw();
  let acc = 0;
  const anim = loop(canvas, (dt) => {
    acc += dt;
    if (acc < 1 / 24) return;
    if (st.playing) st.t += acc;
    if (ptr.k > 0 && !ptr.on) ptr.k = Math.max(0, ptr.k - acc * 1.5);
    acc = 0;
    draw();
  });
  anim.kick();

  styleBtns.forEach((b) => b.addEventListener('click', () => {
    st.style = b.dataset.heroStyle;
    styleBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    draw();
  }));
  density?.addEventListener('input', () => { st.dens = density.value / 100; draw(); });
  const label = () => (pauseBtn.querySelector('span').textContent = st.playing ? 'Pausa' : 'Riprendi');
  pauseBtn?.addEventListener('click', () => {
    st.playing = !st.playing;
    pauseBtn.setAttribute('aria-pressed', String(!st.playing));
    label();
  });
  if (pauseBtn) { pauseBtn.setAttribute('aria-pressed', String(!st.playing)); label(); }

  section.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    ptr.x = (e.clientX - r.left) / r.width; ptr.y = (e.clientY - r.top) / r.height;
    ptr.k = 1; ptr.on = true;
    if (reduceMotion) draw();
  });
  section.addEventListener('pointerleave', () => { ptr.on = false; if (reduceMotion) { ptr.k = 0; draw(); } });

  let rt = 0, lastW = canvas.clientWidth, lastH = canvas.clientHeight;
  new ResizeObserver(() => {
    if (canvas.clientWidth === lastW && Math.abs(canvas.clientHeight - lastH) < 120) return;
    lastW = canvas.clientWidth; lastH = canvas.clientHeight;
    clearTimeout(rt);
    rt = setTimeout(() => { layout(); draw(); }, 150);
  }).observe(canvas);
}
