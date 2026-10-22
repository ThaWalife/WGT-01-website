/* Raster → vettoriale: lo stesso halftone ingrandito in due finestre.
   Nel PNG compaiono i pixel, nell'SVG i punti restano perfetti.
   Una finestra mostra il codice SVG dei punti che stai guardando,
   un'altra le quattro lastre CMYK. Il download produce SVG veri. */
import { loadImage, getPixels, gray } from '../engines.js';
import { fitCanvas, photo } from '../main.js';

const B = 480;           // lato dell'immagine di base (unità SVG)
const CELL = 6;          // passo del retino

function halftoneDots(img) {
  const n = B / CELL;
  const g = gray(getPixels(img, n, n), { contrast: 0.25 });
  const a = Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a), c = B / 2;
  const dots = [];
  const R = Math.ceil(n * 0.75);
  for (let j = -R; j <= R; j++)
    for (let i = -R; i <= R; i++) {
      const u = i * CELL, v = j * CELL;
      const x = c + u * ca - v * sa, y = c + u * sa + v * ca;
      if (x < 0 || y < 0 || x >= B || y >= B) continue;
      const l = g[Math.min(n - 1, (y / CELL) | 0) * n + Math.min(n - 1, (x / CELL) | 0)];
      const r = CELL * 0.62 * Math.sqrt(1 - l);
      if (r > 0.25) dots.push([x, y, r]);
    }
  return dots;
}

/* CMYK: quattro retini con gli angoli classici. */
const PLATES = [
  ['C', 15, '#00aeef'], ['M', 75, '#ec008c'], ['Y', 0, '#fff200'], ['K', 45, '#1a1a1a'],
];
function cmykDots(img, cell = 7) {
  const n = Math.round(B / cell);
  const px = getPixels(img, n, n).data;
  const sample = (x, y) => {
    const i = (Math.min(n - 1, Math.max(0, (y / cell) | 0)) * n + Math.min(n - 1, Math.max(0, (x / cell) | 0))) * 4;
    const r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
    const k = 1 - Math.max(r, g, b);
    if (k > 0.999) return [0, 0, 0, 1];
    return [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k];
  };
  return PLATES.map(([name, ang, col], pi) => {
    const a = (ang * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a), c = B / 2;
    const dots = [];
    const R = Math.ceil(n * 0.75);
    for (let j = -R; j <= R; j++)
      for (let i = -R; i <= R; i++) {
        const u = i * cell, v = j * cell;
        const x = c + u * ca - v * sa, y = c + u * sa + v * ca;
        if (x < 0 || y < 0 || x >= B || y >= B) continue;
        const r = cell * 0.6 * Math.sqrt(sample(x, y)[pi]);
        if (r > 0.3) dots.push([x, y, r]);
      }
    return { name, col, dots };
  });
}

function download(name, svg) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const circles = (dots) => dots.map(([x, y, r]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}"/>`).join('');

export default async function vector(section) {
  const img = await loadImage(photo('hopper'));
  const dots = halftoneDots(img);
  const plates = cmykDots(img);

  // il "PNG": gli stessi punti stampati su una griglia di pixel 480×480
  const raster = document.createElement('canvas');
  raster.width = B; raster.height = B;
  const rx = raster.getContext('2d');
  rx.fillStyle = '#fff'; rx.fillRect(0, 0, B, B);
  rx.fillStyle = '#000';
  rx.beginPath();
  for (const [x, y, r] of dots) { rx.moveTo(x + r, y); rx.arc(x, y, r, 0, Math.PI * 2); }
  rx.fill();

  const cPng = section.querySelector('[data-view="png"] canvas');
  const cSvg = section.querySelector('[data-view="svg"] canvas');
  const zoomIn = section.querySelector('[data-zoom]');
  const zoomOut = section.querySelectorAll('[data-zoom-out]');
  const code = section.querySelector('[data-code]');
  const cmyk = section.querySelector('[data-cmyk] canvas');
  const plateBtns = [...section.querySelectorAll('[data-plate]')];
  const st = { z: 8, fx: 300, fy: 170, on: { C: true, M: true, Y: true, K: true } };

  function view(canvas, isVector) {
    const { ctx, W, H } = fitCanvas(canvas, 2);
    const s = (W / B) * st.z;
    const sw = W / s, sh = H / s;
    const sx = Math.max(0, Math.min(B - sw, st.fx - sw / 2)), sy = Math.max(0, Math.min(B - sh, st.fy - sh / 2));
    st.fx = sx + sw / 2; st.fy = sy + sh / 2;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    if (!isVector) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(raster, sx, sy, sw, sh, 0, 0, W, H);
      return { sx, sy, sw, sh };
    }
    ctx.fillStyle = '#000';
    ctx.beginPath();
    for (const [x, y, r] of dots) {
      if (x + r < sx || y + r < sy || x - r > sx + sw || y - r > sy + sh) continue;
      const X = (x - sx) * s, Y = (y - sy) * s, Rr = r * s;
      ctx.moveTo(X + Rr, Y); ctx.arc(X, Y, Rr, 0, Math.PI * 2);
    }
    ctx.fill();
    return { sx, sy, sw, sh };
  }

  function writeCode(v) {
    if (!code) return;
    const vis = dots.filter(([x, y]) => x >= v.sx && x <= v.sx + v.sw && y >= v.sy && y <= v.sy + v.sh);
    const near = vis.sort((a, b) => Math.hypot(a[0] - st.fx, a[1] - st.fy) - Math.hypot(b[0] - st.fx, b[1] - st.fy)).slice(0, 7);
    code.textContent = [
      `<svg viewBox="0 0 ${B} ${B}">`,
      `  <g fill="#000">  <!-- ${dots.length.toLocaleString('it-IT')} punti -->`,
      ...near.map(([x, y, r]) => `    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}"/>`),
      `    …`,
      `  </g>`,
      `</svg>`,
    ].join('\n');
  }

  function drawViews() {
    view(cPng, false);
    const v = view(cSvg, true);
    writeCode(v);
    zoomOut.forEach((e) => (e.textContent = Math.round(st.z * 100) + '%'));
    cPng.closest('.win').querySelector('.win__bar span').textContent = `halftone.png — ${Math.round(st.z * 100)}%`;
    cSvg.closest('.win').querySelector('.win__bar span').textContent = `halftone.svg — ${Math.round(st.z * 100)}%`;
  }

  function drawCmyk() {
    const { ctx, W, H } = fitCanvas(cmyk, 2);
    const s = W / B;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'multiply';
    for (const p of plates) {
      if (!st.on[p.name]) continue;
      ctx.fillStyle = p.col;
      ctx.beginPath();
      for (const [x, y, r] of p.dots) { ctx.moveTo((x + r) * s, y * s); ctx.arc(x * s, y * s, r * s, 0, Math.PI * 2); }
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  drawViews();
  drawCmyk();

  zoomIn.addEventListener('input', () => { st.z = Math.pow(2, zoomIn.value / 10); drawViews(); });
  for (const c of [cPng, cSvg]) {
    let d = null;
    c.addEventListener('pointerdown', (e) => { d = { x: e.clientX, y: e.clientY, fx: st.fx, fy: st.fy }; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', (e) => {
      if (!d) return;
      const s = (c.clientWidth / B) * st.z;
      st.fx = d.fx - (e.clientX - d.x) / s; st.fy = d.fy - (e.clientY - d.y) / s;
      drawViews();
    });
    c.addEventListener('pointerup', () => (d = null));
    c.addEventListener('pointercancel', () => (d = null));
  }
  plateBtns.forEach((b) => b.addEventListener('click', () => {
    st.on[b.dataset.plate] = !st.on[b.dataset.plate];
    b.setAttribute('aria-pressed', String(st.on[b.dataset.plate]));
    drawCmyk();
  }));

  section.querySelector('[data-dl="mono"]')?.addEventListener('click', () =>
    download('wgt-01-halftone.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${B} ${B}" width="${B}" height="${B}">\n<rect width="${B}" height="${B}" fill="#fff"/>\n<g id="halftone" fill="#000">${circles(dots)}</g>\n</svg>\n`));
  section.querySelector('[data-dl="cmyk"]')?.addEventListener('click', () =>
    download('wgt-01-halftone-cmyk.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${B} ${B}" width="${B}" height="${B}">\n<rect width="${B}" height="${B}" fill="#fff"/>\n${plates.map((p) => `<g id="lastra-${p.name}" fill="${p.col}" style="mix-blend-mode:multiply">${circles(p.dots)}</g>`).join('\n')}\n</svg>\n`));

  let lastW = cSvg.clientWidth;
  new ResizeObserver(() => { if (cSvg.clientWidth !== lastW) { lastW = cSvg.clientWidth; drawViews(); drawCmyk(); } }).observe(cSvg);
}
