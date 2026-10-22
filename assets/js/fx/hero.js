/* Hero: il logo di WGT-01 su un piano inclinato, ripreso come da una cinepresa,
   ridisegnato in tempo reale da un algoritmo. Intorno, artefatti grigi:
   polvere di caratteri, grana, strappi di glitch, mirino e timecode.
   Il pannello funziona come quello del plugin: stile, densità, pausa. */
import { loadImage, boxBlur, contourSegments, BAYER8, MONO, rng } from '../engines.js';
import { fitCanvas, loop, reduceMotion } from '../main.js';

const RAMP = ' .·:-=+*o#%@';
const WHITE = '#ffffff';
const GREEN = '#35b978';
const GRAY = '#8a8a8a';
const GRAY_D = '#454545';

export default async function hero(section) {
  const canvas = section.querySelector('canvas');
  const root = document.documentElement.dataset.root || './';
  const logo = await loadImage(root + 'assets/img/logo-white.png');
  try { await document.fonts.load(`16px "Martian Mono"`); } catch {}

  const styleBtns = [...section.querySelectorAll('[data-hero-style]')];
  const density = section.querySelector('[data-hero-density]');
  const pauseBtn = section.querySelector('[data-hero-pause]');
  const st = { style: 'ascii', dens: 0.55, playing: !reduceMotion, t: 0 };
  const ptr = { x: -9999, y: -9999, k: 0, on: false };
  const rnd = rng(7);

  /* ---- il logo nel suo spazio (pixel del logo + margine per l'alone) ---- */
  const PAD = 90;
  const LW = logo.naturalWidth + PAD * 2, LH = logo.naturalHeight + PAD * 2;
  const lc = document.createElement('canvas');
  lc.width = LW; lc.height = LH;
  const lx = lc.getContext('2d', { willReadFrequently: true });
  lx.drawImage(logo, PAD, PAD);
  const ld = lx.getImageData(0, 0, LW, LH).data;
  const a0 = new Float32Array(LW * LH);
  for (let i = 0; i < a0.length; i++) a0[i] = ld[i * 4 + 3] / 255;
  const LA = boxBlur(a0, LW, LH, 1);
  const LG = boxBlur(boxBlur(boxBlur(a0, LW, LH, 16), LW, LH, 16), LW, LH, 12);

  /* ---- polvere: caratteri grigi sospesi nello spazio ---- */
  const dust = Array.from({ length: 260 }, () => ({
    x: (rnd() - 0.5) * 3.2, y: (rnd() - 0.5) * 2.2, z: 0.6 + rnd() * 2.6,
    c: '·.:+*#=░'[(rnd() * 8) | 0], s: 0.6 + rnd() * 0.8,
  }));

  let L = null;
  function layout() {
    const { ctx, W, H, dpr } = fitCanvas(canvas, 1.75);
    const g = Math.max(3, Math.round(5 * dpr));
    const gw = Math.ceil(W / g) + 1, gh = Math.ceil(H / g) + 1;
    const narrow = W / dpr < 860;
    L = {
      ctx, W, H, dpr, g, gw, gh, narrow,
      A: new Float32Array(gw * gh), G: new Float32Array(gw * gh), F: new Float32Array(gw * gh),
      f: H * 1.25, cx: W * (narrow ? 0.6 : 0.66), cy: H * (narrow ? 0.32 : 0.5),
      scale: (H * (narrow ? 0.55 : 0.8)) / logo.naturalHeight,
    };
  }

  /* Proietta il piano del logo sullo schermo: per ogni cella, il raggio della
     cinepresa incontra il piano → coordinate nel logo → alone, forma, nebbia. */
  function project(t) {
    const { gw, gh, g, A, G, F, f, W, H } = L;
    const yaw = -0.78 + 0.08 * Math.sin(t * 0.13);
    const pitch = 0.2 + 0.03 * Math.sin(t * 0.09 + 1);
    const roll = -0.16;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
    // assi del piano (rotazione roll → pitch → yaw)
    const rot = (x, y, z) => {
      let x1 = x * cr - y * sr, y1 = x * sr + y * cr, z1 = z;
      let y2 = y1 * cp - z1 * sp, z2 = y1 * sp + z1 * cp;
      return [x1 * cyw + z2 * syw, y2, -x1 * syw + z2 * cyw];
    };
    const ux = rot(1, 0, 0), uy = rot(0, 1, 0), n = rot(0, 0, 1);
    const D = f * 1.0;
    const P0 = [(L.cx - W / 2) / f * D, (L.cy - H / 2) / f * D, D];
    const nd0 = n[0] * P0[0] + n[1] * P0[1] + n[2] * P0[2];
    const inv = 1 / L.scale;
    for (let j = 0; j < gh; j++) {
      const dy = (j * g - H / 2) / f;
      for (let i = 0; i < gw; i++) {
        const k = j * gw + i;
        const dx = (i * g - W / 2) / f;
        const den = n[0] * dx + n[1] * dy + n[2];
        if (Math.abs(den) < 1e-4) { A[k] = 0; G[k] = 0; F[k] = 0; continue; }
        const tt = nd0 / den;
        const px = dx * tt - P0[0], py = dy * tt - P0[1], pz = tt - P0[2];
        const u = (px * ux[0] + py * ux[1] + pz * ux[2]) * inv + LW / 2;
        const v = (px * uy[0] + py * uy[1] + pz * uy[2]) * inv + LH / 2;
        if (u < 0 || v < 0 || u >= LW - 1 || v >= LH - 1 || tt <= 0) { A[k] = 0; G[k] = 0; F[k] = 0; continue; }
        const li = (v | 0) * LW + (u | 0);
        A[k] = LA[li]; G[k] = LG[li];
        // nebbia: la parte lontana del piano è più spenta
        F[k] = Math.min(1, Math.max(0.35, 1.55 - tt / D * 0.75));
      }
    }
  }

  function field(x, y, t) {
    const k = Math.min(L.gh - 1, Math.max(0, (y / L.g) | 0)) * L.gw + Math.min(L.gw - 1, Math.max(0, (x / L.g) | 0));
    const a = L.A[k], gl = L.G[k];
    let v = a * 0.95 + gl * 0.55;
    if (gl > 0.012) v += 0.13 * Math.sin(gl * 26 - t * 1.7) * (1 - a);
    v *= L.F[k] || 0;
    if (ptr.k > 0) {
      const dx = x - ptr.x, dy = y - ptr.y, s = 90 * L.dpr;
      v += 0.5 * ptr.k * Math.exp(-(dx * dx + dy * dy) / (2 * s * s));
    }
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }
  const inLogo = (x, y) => L.A[Math.min(L.gh - 1, (y / L.g) | 0) * L.gw + Math.min(L.gw - 1, (x / L.g) | 0)] > 0.5;

  /* ---- artefatti ---- */
  function drawDust(t, front) {
    const { ctx, W, H, dpr } = L;
    ctx.font = `${Math.round(11 * dpr)}px ${MONO}`;
    ctx.textBaseline = 'middle';
    for (const p of dust) {
      if (front !== p.z < 1.2) continue;
      let z = p.z - ((t * 0.05 * p.s) % 3.2);
      if (z < 0.4) z += 3.2;
      const sx = W / 2 + (p.x / z) * W * 0.45, sy = H / 2 + (p.y / z) * W * 0.45;
      if (sx < -20 || sy < -20 || sx > W + 20 || sy > H + 20) continue;
      ctx.globalAlpha = Math.min(0.9, 0.9 / z);
      ctx.fillStyle = z < 1 ? GRAY : GRAY_D;
      const sc = Math.min(3, 1.2 / z);
      ctx.font = `${Math.round(11 * dpr * sc)}px ${MONO}`;
      ctx.fillText(p.c, sx, sy);
    }
    ctx.globalAlpha = 1;
  }
  function drawGrain() {
    const { ctx, W, H, dpr } = L;
    ctx.fillStyle = GRAY_D;
    const s = Math.max(1, dpr);
    for (let i = 0; i < 700; i++) ctx.fillRect(Math.random() * W, Math.random() * H, s, s);
  }
  let glitchUntil = 0, nextGlitch = 2;
  function drawGlitch(t) {
    const { ctx, W, H, dpr } = L;
    if (t > nextGlitch) { glitchUntil = t + 0.16; nextGlitch = t + 1.6 + Math.random() * 2.4; }
    if (t > glitchUntil) return;
    for (let i = 0; i < 4; i++) {
      const y = Math.random() * H, h = (4 + Math.random() * 26) * dpr, dx = (Math.random() - 0.5) * 80 * dpr;
      ctx.drawImage(canvas, 0, y, W, h, dx, y, W, h);
      ctx.fillStyle = 'rgba(110,110,110,.35)';
      ctx.fillRect(0, y + h - dpr, W, dpr);
    }
    ctx.strokeStyle = GRAY;
    ctx.lineWidth = dpr;
    ctx.strokeRect(Math.random() * W * 0.8, Math.random() * H * 0.8, (40 + Math.random() * 160) * dpr, (10 + Math.random() * 40) * dpr);
  }
  function drawViewfinder(t) {
    const { ctx, W, H, dpr } = L;
    const m = 26 * dpr, top = 76 * dpr, len = 22 * dpr;
    ctx.strokeStyle = GRAY;
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    for (const [x, y, sx, sy] of [[m, top, 1, 1], [W - m, top, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
      ctx.moveTo(x, y + sy * len); ctx.lineTo(x, y); ctx.lineTo(x + sx * len, y);
    }
    const c = [L.cx, L.cy];
    ctx.moveTo(c[0] - 9 * dpr, c[1]); ctx.lineTo(c[0] + 9 * dpr, c[1]);
    ctx.moveTo(c[0], c[1] - 9 * dpr); ctx.lineTo(c[0], c[1] + 9 * dpr);
    ctx.stroke();
    const fr = Math.floor(t * 24);
    const tc = [Math.floor(fr / 86400), Math.floor(fr / 1440) % 60, Math.floor(fr / 24) % 60, fr % 24].map((n) => String(n).padStart(2, '0')).join(':');
    ctx.fillStyle = GRAY;
    ctx.font = `${Math.round(11 * dpr)}px ${MONO}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'right';
    ctx.fillText(`TC ${tc}`, W - m - 6 * dpr, top + 8 * dpr);
    ctx.fillText(`CAM A · 24 FPS · ${STYLE_NAME[st.style]}`, W - m - 6 * dpr, top + 24 * dpr);
    ctx.textAlign = 'left';
  }
  const STYLE_NAME = { ascii: 'ASCII', halftone: 'HALFTONE', dither: 'DITHER', curve: 'CURVE' };

  /* ---- i quattro stili ---- */
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
    const { ctx, W, H } = L;
    project(st.t);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    drawGrain();
    drawDust(st.t, false);
    DRAW[st.style](st.t);
    drawDust(st.t, true);
    if (st.playing) drawGlitch(st.t);
    drawViewfinder(st.t);
  }

  layout();
  draw();
  const anim = loop(canvas, (dt) => {
    if (st.playing) st.t += dt;
    if (ptr.k > 0 && !ptr.on) ptr.k = Math.max(0, ptr.k - dt * 1.5);
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
    ptr.x = (e.clientX - r.left) * L.dpr; ptr.y = (e.clientY - r.top) * L.dpr;
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
