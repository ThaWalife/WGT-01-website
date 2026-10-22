/* Hero: il logo di WGT-01 come un oggetto in rilievo, ripreso da vicino e dal basso,
   su un monitor a fosfori verdi. Superficie disegnata da un algoritmo (Dither,
   Halftone o Incisione), fianchi estrusi, aberrazione cromatica, scanline, vignetta,
   fili verticali. Intorno, artefatti grigi: polvere di caratteri, grana, glitch, mirino.
   Il pannello funziona come quello del plugin: stile, densità, pausa. */
import { loadImage, boxBlur, BAYER8, MONO, rng } from '../engines.js';
import { fitCanvas, loop, reduceMotion } from '../main.js';

const GRAY = '#8a8a8a';
const GRAY_D = '#454545';
// palette fosfori: dall'ombra alla luce
const PAL = [[2, 16, 7], [5, 50, 22], [12, 104, 46], [28, 168, 78], [86, 228, 128], [176, 255, 205]];

export default async function hero(section) {
  const canvas = section.querySelector('canvas');
  const root = document.documentElement.dataset.root || './';
  const logo = await loadImage(root + 'assets/img/logo-white.png');
  try { await document.fonts.load(`16px "Martian Mono"`); } catch {}

  const styleBtns = [...section.querySelectorAll('[data-hero-style]')];
  const density = section.querySelector('[data-hero-density]');
  const pauseBtn = section.querySelector('[data-hero-pause]');
  const st = { style: 'dither', dens: 0.55, playing: !reduceMotion, t: 0 };
  const ptr = { x: -1, y: -1, k: 0, on: false };
  const rnd = rng(11);

  /* ---- spazio del logo: forma, smusso e grana della superficie ---- */
  const PAD = 40;
  const LW = logo.naturalWidth + PAD * 2, LH = logo.naturalHeight + PAD * 2;
  const lc = document.createElement('canvas');
  lc.width = LW; lc.height = LH;
  const lx = lc.getContext('2d', { willReadFrequently: true });
  lx.drawImage(logo, PAD, PAD);
  const ld = lx.getImageData(0, 0, LW, LH).data;
  const A0 = new Float32Array(LW * LH);
  for (let i = 0; i < A0.length; i++) A0[i] = ld[i * 4 + 3] / 255;
  const IN = boxBlur(boxBlur(A0, LW, LH, 9), LW, LH, 9);       // "distanza" dal bordo, verso l'interno
  const TEX = new Float32Array(LW * LH);                          // grana irregolare
  {
    const n0 = new Float32Array(LW * LH).map(() => rnd());
    const n1 = boxBlur(n0, LW, LH, 1), n2 = boxBlur(n0, LW, LH, 4);
    for (let i = 0; i < TEX.length; i++) TEX[i] = Math.min(1, Math.max(0, 0.5 + (n1[i] - 0.5) * 2.2 + (n2[i] - 0.5) * 3));
  }

  /* ---- polvere di caratteri grigi in profondità ---- */
  const dust = Array.from({ length: 200 }, () => ({
    x: (rnd() - 0.5) * 3.2, y: (rnd() - 0.5) * 2.2, z: 0.6 + rnd() * 2.6,
    c: '·.:+*#=░'[(rnd() * 8) | 0], s: 0.6 + rnd() * 0.8,
  }));

  let L = null;
  function layout() {
    const { ctx, W, H, dpr } = fitCanvas(canvas, 1);
    const narrow = W / dpr < 860;
    const IW = narrow ? 300 : 460, IH = Math.round((IW * H) / W);
    const mk = () => { const c = document.createElement('canvas'); c.width = IW; c.height = IH; return c; };
    const top = mk(), side = mk(), tintR = mk(), tintC = mk(), comp = mk();
    const scan = document.createElement('canvas');
    scan.width = 1; scan.height = Math.max(3, Math.round(3 * dpr));
    const sx = scan.getContext('2d');
    sx.fillStyle = 'rgba(0,0,0,0.28)'; sx.fillRect(0, 0, 1, Math.max(1, Math.round(dpr)));
    const vig = ctx.createRadialGradient(W * 0.6, H * 0.5, Math.min(W, H) * 0.25, W * 0.6, H * 0.5, Math.max(W, H) * 0.8);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.85)');
    const left = ctx.createLinearGradient(0, 0, W * 0.48, 0);
    left.addColorStop(0, 'rgba(0,0,0,0.8)'); left.addColorStop(1, 'rgba(0,0,0,0)');
    // scanline + vignetta + ombra per il testo: un solo strato, preparato una volta
    const over = document.createElement('canvas');
    over.width = W; over.height = H;
    const ox = over.getContext('2d');
    ox.fillStyle = ox.createPattern(scan, 'repeat'); ox.fillRect(0, 0, W, H);
    ox.fillStyle = vig; ox.fillRect(0, 0, W, H);
    if (!narrow) { ox.fillStyle = left; ox.fillRect(0, 0, W, H); }
    L = {
      ctx, W, H, dpr, narrow, IW, IH, top, side, tintR, tintC, comp, over, compD: comp.getContext('2d'),
      topD: top.getContext('2d'), sideD: side.getContext('2d'),
      imTop: new ImageData(IW, IH), imSide: new ImageData(IW, IH),
      mask: new Uint8Array(IW * IH),
      scanPat: ctx.createPattern(scan, 'repeat'), vig, left,
      f: IH * 1.15,
      cx: IW * (narrow ? 0.55 : 0.63), cy: IH * (narrow ? 0.34 : 0.5),
      scale: (narrow ? IW * 1.35 : IH * 1.3) / logo.naturalHeight,
    };
  }

  /* Proiezione del piano del logo (raggio → piano) e colore della superficie. */
  function render(t) {
    const { IW, IH, f, imTop, imSide, mask } = L;
    const yaw = -0.32 + 0.05 * Math.sin(t * 0.11);
    const pitch = 0.62 + 0.04 * Math.sin(t * 0.08 + 1);
    const roll = -0.95 + 0.03 * Math.sin(t * 0.07);
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
    const rot = (x, y, z) => {
      const x1 = x * cr - y * sr, y1 = x * sr + y * cr, z1 = z;
      const y2 = y1 * cp - z1 * sp, z2 = y1 * sp + z1 * cp;
      return [x1 * cyw + z2 * syw, y2, -x1 * syw + z2 * cyw];
    };
    const ux = rot(1, 0, 0), uy = rot(0, 1, 0), n = rot(0, 0, 1);
    const D = f;
    const P0 = [((L.cx - IW / 2) / f) * D, ((L.cy - IH / 2) / f) * D, D];
    const nd0 = n[0] * P0[0] + n[1] * P0[1] + n[2] * P0[2];
    const inv = 1 / L.scale;
    const cell = 3 + (1 - st.dens) * 7;
    const lightU = Math.sin(t * 0.3) * 0.15;
    const pk = ptr.k, px0 = ptr.x * IW, py0 = ptr.y * IH;
    const dt = imTop.data, ds = imSide.data;
    for (let j = 0; j < IH; j++) {
      const dy = (j - IH / 2) / f;
      for (let i = 0; i < IW; i++) {
        const k = j * IW + i, o = k * 4;
        const dx = (i - IW / 2) / f;
        const den = n[0] * dx + n[1] * dy + n[2];
        const tt = nd0 / den;
        const qx = dx * tt - P0[0], qy = dy * tt - P0[1], qz = tt - P0[2];
        const u = (qx * ux[0] + qy * ux[1] + qz * ux[2]) * inv + LW / 2;
        const v = (qx * uy[0] + qy * uy[1] + qz * uy[2]) * inv + LH / 2;
        if (tt <= 0 || u < 0 || v < 0 || u >= LW || v >= LH) { mask[k] = 0; dt[o + 3] = 0; ds[o + 3] = 0; continue; }
        const li = (v | 0) * LW + (u | 0);
        if (A0[li] < 0.5) { mask[k] = 0; dt[o + 3] = 0; ds[o + 3] = 0; continue; }
        mask[k] = 1;
        const inn = IN[li];
        const rim = Math.exp(-Math.pow((inn - 0.62) / 0.09, 2));
        const grad = 0.55 + 0.45 * Math.sin((u + v) * 0.012 + lightU * 6);
        let lum = 0.36 + 0.34 * rim + 0.3 * grad * inn + 0.26 * (TEX[li] - 0.5);
        lum *= Math.min(1.15, Math.max(0.45, 1.6 - (tt / D) * 0.6));
        if (pk > 0) { const ex = i - px0, ey = j - py0; lum += 0.35 * pk * Math.exp(-(ex * ex + ey * ey) / 3200); }
        let q;
        if (st.style === 'halftone') {
          const gu = u / cell, gv = v / cell, fu = gu - Math.round(gu), fv = gv - Math.round(gv);
          q = Math.sqrt(fu * fu + fv * fv) < Math.sqrt(Math.max(0, lum)) * 0.62 ? lum + 0.25 : lum * 0.35;
        } else if (st.style === 'incisione') {
          const s = (((v + Math.sin(u * 0.05) * 3) / cell) % 1 + 1) % 1;
          q = s < Math.max(0, lum) ? lum + 0.2 : lum * 0.3;
        } else {
          q = lum + ((BAYER8[(j & 7) * 8 + (i & 7)] + 0.5) / 64 - 0.5) * 0.45;
        }
        const c = PAL[Math.max(0, Math.min(PAL.length - 1, Math.floor(q * PAL.length)))];
        dt[o] = c[0]; dt[o + 1] = c[1]; dt[o + 2] = c[2]; dt[o + 3] = 255;
        const s2 = 0.6 + 0.4 * TEX[li];
        ds[o] = 3 * s2; ds[o + 1] = 30 * s2; ds[o + 2] = 16 * s2; ds[o + 3] = 255;
      }
    }
    L.topD.putImageData(imTop, 0, 0);
    L.sideD.putImageData(imSide, 0, 0);
    const proj = (p) => [IW / 2 + (p[0] / p[2]) * f, IH / 2 + (p[1] / p[2]) * f];
    const d = 26 * L.scale;
    const c0 = proj(P0), c1 = proj([P0[0] + n[0] * d, P0[1] + n[1] * d, P0[2] + n[2] * d]);
    return [c1[0] - c0[0], c1[1] - c0[1]];
  }

  function tint(dst, color) {
    const x = dst.getContext('2d');
    x.globalCompositeOperation = 'copy';
    x.drawImage(L.top, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, L.IW, L.IH);
  }

  const dustSprites = new Map();
  function dustSprite(ch, sizeB, near) {
    const key = ch + sizeB + near;
    let c = dustSprites.get(key);
    if (c) return c;
    const px = Math.round(11 * L.dpr * (0.8 + sizeB * 0.45));
    c = document.createElement('canvas');
    c.width = c.height = px * 2;
    const x = c.getContext('2d');
    x.font = `${px}px ${MONO}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = near ? GRAY : GRAY_D;
    x.fillText(ch, px, px);
    dustSprites.set(key, c);
    return c;
  }
  function drawDust(t, front) {
    const { ctx, W, H } = L;
    for (const p of dust) {
      if (front !== p.z < 1.2) continue;
      let z = p.z - ((t * 0.05 * p.s) % 3.2);
      if (z < 0.4) z += 3.2;
      const sx = W / 2 + (p.x / z) * W * 0.45, sy = H / 2 + (p.y / z) * W * 0.45;
      if (sx < -20 || sy < -20 || sx > W + 20 || sy > H + 20) continue;
      ctx.globalAlpha = Math.min(0.9, 0.9 / z);
      const sb = Math.min(4, Math.max(0, Math.round((1.2 / z - 0.8) / 0.45)));
      const sp = dustSprite(p.c, sb, z < 1 ? 1 : 0);
      ctx.drawImage(sp, sx - sp.width / 2, sy - sp.height / 2);
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
    const m = 26 * dpr, top = 76 * dpr, len = 22 * dpr;
    ctx.strokeStyle = GRAY;
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    for (const [x, y, sx, sy] of [[m, top, 1, 1], [W - m, top, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
      ctx.moveTo(x, y + sy * len); ctx.lineTo(x, y); ctx.lineTo(x + sx * len, y);
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

  const strings = [0.44, 0.63, 0.81];
  function drawStrings() {
    const { ctx, W, H, dpr, IW, IH, mask } = L;
    ctx.strokeStyle = 'rgba(120,235,170,0.75)';
    ctx.lineWidth = 1.5 * dpr;
    ctx.shadowColor = 'rgba(80,255,160,0.8)';
    ctx.shadowBlur = 6 * dpr;
    ctx.beginPath();
    for (const fx of strings) {
      const i = Math.round(fx * IW);
      let j = 0;
      while (j < IH && !mask[j * IW + i]) j++;
      if (j >= IH || j < 4) continue;
      const x = (i / IW) * W, y = (j / IH) * H;
      ctx.moveTo(x, 0); ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function draw() {
    if (!L) return;
    const { ctx, W, H, dpr } = L;
    const [ex, ey] = render(st.t);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    drawGrain();
    drawDust(st.t, false);
    drawStrings();
    // estrusione, faccia e aberrazione composte alla risoluzione interna, poi un solo ingrandimento
    const cd = L.compD;
    cd.globalCompositeOperation = 'source-over';
    cd.clearRect(0, 0, L.IW, L.IH);
    const steps = 12;
    for (let s = steps; s >= 1; s--) cd.drawImage(L.side, (ex * s) / steps, (ey * s) / steps);
    cd.drawImage(L.top, 0, 0);
    tint(L.tintR, '#ff3b2f'); tint(L.tintC, '#2fd6ff');
    cd.globalCompositeOperation = 'screen';
    cd.globalAlpha = 0.13;
    cd.drawImage(L.tintR, 1, 0);
    cd.drawImage(L.tintC, -1, 0);
    cd.globalAlpha = 1;
    cd.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(L.comp, 0, 0, W, H);
    ctx.drawImage(L.over, 0, 0);
    drawDust(st.t, true);
    if (st.playing) drawGlitch(st.t);
    drawViewfinder(st.t);
  }

  layout();
  draw();
  let acc = 0;
  const anim = loop(canvas, (dt) => {
    acc += dt;
    if (acc < 1 / 30) return;
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
