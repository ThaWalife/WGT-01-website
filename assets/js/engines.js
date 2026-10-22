/*
  WGT-01 · motori di stile per il web
  Versioni leggere degli stili del plugin, per animazioni, galleria e demo.
  Ogni stile: render(ctx, img, W, H, opzioni) disegna su un canvas W×H (pixel reali).
  Opzioni comuni: ink, paper (colori), brightness, contrast (−1..1), invert, seed, cell.
*/

/* ---------- utilità ---------- */

export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
}

const pxCache = new Map();
let cacheId = 0;

/* Pixel dell'immagine ridimensionata a w×h con taglio "cover" (centrato).
   aspect = proporzione reale dell'area di destinazione (larghezza/altezza): serve quando
   le celle non sono quadrate (es. ASCII, dove un carattere è più alto che largo). */
export function getPixels(img, w, h, aspect) {
  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  aspect = aspect || w / h;
  if (!img.__wgtId) img.__wgtId = ++cacheId;
  const key = img.__wgtId + '|' + w + 'x' + h + '|' + aspect.toFixed(4);
  if (pxCache.has(key)) return pxCache.get(key);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true });
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  // ritaglio della sorgente con la proporzione dell'area di destinazione
  let sw = iw, sh = iw / aspect;
  if (sh > ih) { sh = ih; sw = ih * aspect; }
  x.imageSmoothingQuality = 'high';
  x.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, w, h);
  const out = { w, h, data: x.getImageData(0, 0, w, h).data };
  if (pxCache.size > 60) pxCache.delete(pxCache.keys().next().value);
  pxCache.set(key, out);
  return out;
}

export function forgetImage(img) {
  if (!img.__wgtId) return;
  const p = img.__wgtId + '|';
  for (const k of [...pxCache.keys()]) if (k.startsWith(p)) pxCache.delete(k);
}

/* Scala di grigi 0 (nero) … 1 (bianco) con luminosità/contrasto. */
export function gray(px, o = {}) {
  const { brightness = 0, contrast = 0, invert = false } = o;
  const n = px.w * px.h;
  const g = new Float32Array(n);
  const k = 1 + contrast * 1.6;
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    let v = (0.2126 * px.data[j] + 0.7152 * px.data[j + 1] + 0.0722 * px.data[j + 2]) / 255;
    v = (v - 0.5) * k + 0.5 + brightness;
    v = v < 0 ? 0 : v > 1 ? 1 : v;
    g[i] = invert ? 1 - v : v;
  }
  return g;
}

export function boxBlur(g, w, h, r) {
  if (r < 1) return g;
  const tmp = new Float32Array(g.length);
  const out = new Float32Array(g.length);
  const d = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let s = 0;
    const row = y * w;
    for (let x = -r; x <= r; x++) s += g[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = s / d;
      s += g[row + Math.min(w - 1, x + r + 1)] - g[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = s / d;
      s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

export function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function blitScaled(ctx, data, w, h, W, H, smooth = false) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = smooth;
  ctx.drawImage(c, 0, 0, W, H);
  ctx.restore();
}

function fill(ctx, W, H, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
}

const defaults = { ink: '#000000', paper: '#ffffff' };

/* ---------- 1. Dither ---------- */
const BAYER8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28,
  52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39,
  13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];
export { BAYER8 };

function dither(ctx, img, W, H, o) {
  const cell = o.cell || 3;
  const gw = Math.ceil(W / cell);
  const gh = Math.ceil(H / cell);
  const g = gray(getPixels(img, gw, gh), o);
  const levels = Math.max(2, o.levels || 2);
  const strength = o.strength ?? 1;
  const method = o.method || 'atkinson';
  const ink = hexToRgb(o.ink), paper = hexToRgb(o.paper);
  const q = (v) => Math.round(v * (levels - 1)) / (levels - 1);
  const out = new Uint8ClampedArray(gw * gh * 4);
  if (method === 'bayer') {
    for (let y = 0; y < gh; y++)
      for (let x = 0; x < gw; x++) {
        const i = y * gw + x;
        const t = (BAYER8[(y & 7) * 8 + (x & 7)] / 64 - 0.5) * strength / (levels - 1);
        g[i] = q(Math.min(1, Math.max(0, g[i] + t)));
      }
  } else {
    const err = method === 'atkinson'
      ? [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]]
      : [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]];
    for (let y = 0; y < gh; y++) {
      const rev = o.serpentine !== false && y & 1;
      for (let k = 0; k < gw; k++) {
        const x = rev ? gw - 1 - k : k;
        const i = y * gw + x;
        const old = g[i];
        const nv = q(old);
        g[i] = nv;
        const e = (old - nv) * strength;
        for (const [dx, dy, f] of err) {
          const xx = x + (rev ? -dx : dx), yy = y + dy;
          if (xx >= 0 && xx < gw && yy < gh) g[yy * gw + xx] += e * f;
        }
      }
    }
  }
  for (let i = 0, j = 0; i < gw * gh; i++, j += 4) {
    const v = Math.min(1, Math.max(0, g[i]));
    out[j] = ink[0] + (paper[0] - ink[0]) * v;
    out[j + 1] = ink[1] + (paper[1] - ink[1]) * v;
    out[j + 2] = ink[2] + (paper[2] - ink[2]) * v;
    out[j + 3] = 255;
  }
  blitScaled(ctx, out, gw, gh, gw * cell, gh * cell);
}

/* ---------- 2. Halftone ---------- */
function halftone(ctx, img, W, H, o) {
  const cell = o.cell || 9;
  const res = Math.max(1, cell / 3);
  const gw = Math.ceil(W / res), gh = Math.ceil(H / res);
  const g = gray(getPixels(img, gw, gh), o);
  fill(ctx, W, H, o.paper);
  ctx.fillStyle = o.ink;
  const a = ((o.angle ?? 45) * Math.PI) / 180;
  const ca = Math.cos(a), sa = Math.sin(a);
  const cx = W / 2, cy = H / 2;
  const n = Math.ceil(Math.hypot(W, H) / cell / 2) + 1;
  ctx.beginPath();
  for (let j = -n; j <= n; j++)
    for (let i = -n; i <= n; i++) {
      const u = i * cell + (o.staggered && j & 1 ? cell / 2 : 0), v = j * cell;
      const x = cx + u * ca - v * sa, y = cy + u * sa + v * ca;
      if (x < -cell || y < -cell || x > W + cell || y > H + cell) continue;
      const gx = Math.min(gw - 1, Math.max(0, (x / res) | 0));
      const gy = Math.min(gh - 1, Math.max(0, (y / res) | 0));
      const r = cell * 0.62 * Math.sqrt(1 - g[gy * gw + gx]);
      if (r < 0.25) continue;
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
  ctx.fill();
}

/* ---------- 3. ASCII ---------- */
export const ASCII_RAMP = ' .·:-=+*o#%@';
export const MONO = '"Martian Mono", ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace';
function ascii(ctx, img, W, H, o) {
  const size = o.cell || 11;
  ctx.font = `${size}px ${MONO}`;
  const cw = ctx.measureText('M').width || size * 0.6;
  const cols = Math.floor(W / cw), rows = Math.floor(H / size);
  const g = gray(getPixels(img, cols, rows, (cols * cw) / (rows * size)), o);
  fill(ctx, W, H, o.paper);
  ctx.fillStyle = o.ink;
  ctx.font = `${size}px ${MONO}`;
  ctx.textBaseline = 'top';
  const ramp = o.ramp || ASCII_RAMP;
  const L = ramp.length - 1;
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) line += ramp[Math.round((1 - g[y * cols + x]) * L)];
    ctx.fillText(line, 0, y * size);
  }
}

/* ---------- 4. Mosaico ---------- */
function mosaic(ctx, img, W, H, o) {
  const t = o.cell || 14;
  const gap = o.gap ?? Math.max(1, t * 0.12);
  const cols = Math.ceil(W / t), rows = Math.ceil(H / t);
  const px = getPixels(img, cols, rows);
  const g = gray(px, o);
  fill(ctx, W, H, o.paper);
  const k = 1 + (o.contrast || 0);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x, j = i * 4;
      const lum0 = (0.2126 * px.data[j] + 0.7152 * px.data[j + 1] + 0.0722 * px.data[j + 2]) / 255 || 0.0001;
      const f = (g[i] / lum0) * (o.mono ? 0 : 1);
      const c = o.mono
        ? `rgb(${(g[i] * 255) | 0},${(g[i] * 255) | 0},${(g[i] * 255) | 0})`
        : `rgb(${Math.min(255, px.data[j] * f * k) | 0},${Math.min(255, px.data[j + 1] * f * k) | 0},${Math.min(255, px.data[j + 2] * f * k) | 0})`;
      ctx.fillStyle = c;
      ctx.fillRect(x * t + gap / 2, y * t + gap / 2, t - gap, t - gap);
      if (o.relief !== false) {
        ctx.fillStyle = 'rgba(255,255,255,.14)';
        ctx.fillRect(x * t + gap / 2, y * t + gap / 2, t - gap, Math.max(1, t * 0.08));
      }
    }
}

/* ---------- 5. Incisione ---------- */
function engrave(ctx, img, W, H, o) {
  const s = o.cell || 6;
  const gw = Math.ceil(W / 2), gh = Math.ceil(H / 2);
  const g = boxBlur(gray(getPixels(img, gw, gh), o), gw, gh, 1);
  const sample = (x, y) => {
    const gx = Math.min(gw - 1, Math.max(0, (x / 2) | 0));
    const gy = Math.min(gh - 1, Math.max(0, (y / 2) | 0));
    return g[gy * gw + gx];
  };
  fill(ctx, W, H, o.paper);
  ctx.fillStyle = o.ink;
  const pass = (angDeg, gain, start) => {
    const a = (angDeg * Math.PI) / 180;
    const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
    const cx = W / 2, cy = H / 2, R = Math.hypot(W, H) / 2;
    const amp = o.wave ?? s * 0.5, wl = o.wavelength || 90;
    for (let v = -R; v <= R; v += s) {
      const top = [], bot = [];
      for (let u = -R; u <= R; u += 2) {
        const wv = amp * Math.sin((u / wl) * Math.PI * 2 + v * 0.05);
        const x = cx + u * dx + (v + wv) * nx, y = cy + u * dy + (v + wv) * ny;
        if (x < -s || y < -s || x > W + s || y > H + s) {
          if (top.length) break;
          continue;
        }
        const l = sample(x, y);
        let t = Math.max(0, (start - l) / start);
        t = Math.pow(t, 0.85) * s * gain;
        top.push(x + nx * t * 0.5, y + ny * t * 0.5);
        bot.push(x - nx * t * 0.5, y - ny * t * 0.5);
      }
      if (top.length < 4) continue;
      ctx.beginPath();
      ctx.moveTo(top[0], top[1]);
      for (let i = 2; i < top.length; i += 2) ctx.lineTo(top[i], top[i + 1]);
      for (let i = bot.length - 2; i >= 0; i -= 2) ctx.lineTo(bot[i], bot[i + 1]);
      ctx.closePath();
      ctx.fill();
    }
  };
  pass(o.angle ?? -12, 0.95, 1);
  if (o.crosshatch !== false) pass((o.angle ?? -12) + 70, 0.7, 0.32);
}

/* ---------- 6. Curve di livello ---------- */
export function contourSegments(g, w, h, levels) {
  const out = [];
  for (const t of levels) {
    const seg = [];
    for (let y = 0; y < h - 1; y++)
      for (let x = 0; x < w - 1; x++) {
        const a = g[y * w + x], b = g[y * w + x + 1], c = g[(y + 1) * w + x + 1], d = g[(y + 1) * w + x];
        const idx = (a > t ? 8 : 0) | (b > t ? 4 : 0) | (c > t ? 2 : 0) | (d > t ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const top = [x + (t - a) / (b - a), y], right = [x + 1, y + (t - b) / (c - b)];
        const bottom = [x + (t - d) / (c - d), y + 1], left = [x, y + (t - a) / (d - a)];
        const P = (p, q) => seg.push(p[0], p[1], q[0], q[1]);
        switch (idx) {
          case 1: case 14: P(left, bottom); break;
          case 2: case 13: P(bottom, right); break;
          case 3: case 12: P(left, right); break;
          case 4: case 11: P(top, right); break;
          case 6: case 9: P(top, bottom); break;
          case 7: case 8: P(left, top); break;
          case 5: P(left, top); P(bottom, right); break;
          case 10: P(top, right); P(left, bottom); break;
        }
      }
    out.push({ t, seg });
  }
  return out;
}

function contour(ctx, img, W, H, o) {
  const res = o.res || 2.5;
  const gw = Math.ceil(W / res), gh = Math.ceil(H / res);
  const g = boxBlur(boxBlur(gray(getPixels(img, gw, gh), o), gw, gh, 2), gw, gh, 1);
  const n = o.levels || 16;
  const levels = Array.from({ length: n }, (_, i) => (i + 0.5) / n);
  fill(ctx, W, H, o.paper);
  ctx.strokeStyle = o.ink;
  ctx.lineCap = 'round';
  const base = o.line || 1;
  for (const { t, seg } of contourSegments(g, gw, gh, levels)) {
    const i = Math.round(t * n - 0.5);
    ctx.lineWidth = base * (0.6 + (1 - t) * 1.6) * (i % 4 === 0 ? 1.9 : 1);
    ctx.beginPath();
    for (let k = 0; k < seg.length; k += 4) {
      ctx.moveTo(seg[k] * res, seg[k + 1] * res);
      ctx.lineTo(seg[k + 2] * res, seg[k + 3] * res);
    }
    ctx.stroke();
  }
}

/* ---------- 7. Linee di flusso ---------- */
function flowlines(ctx, img, W, H, o) {
  const res = 2;
  const gw = Math.ceil(W / res), gh = Math.ceil(H / res);
  const g = boxBlur(gray(getPixels(img, gw, gh), o), gw, gh, 1);
  const n = gw * gh;
  const jxx = new Float32Array(n), jyy = new Float32Array(n), jxy = new Float32Array(n);
  for (let y = 1; y < gh - 1; y++)
    for (let x = 1; x < gw - 1; x++) {
      const i = y * gw + x;
      const gx = g[i - gw + 1] + 2 * g[i + 1] + g[i + gw + 1] - g[i - gw - 1] - 2 * g[i - 1] - g[i + gw - 1];
      const gy = g[i + gw - 1] + 2 * g[i + gw] + g[i + gw + 1] - g[i - gw - 1] - 2 * g[i - gw] - g[i - gw + 1];
      jxx[i] = gx * gx; jyy[i] = gy * gy; jxy[i] = gx * gy;
    }
  const r = o.smooth || 6;
  const Jxx = boxBlur(jxx, gw, gh, r), Jyy = boxBlur(jyy, gw, gh, r), Jxy = boxBlur(jxy, gw, gh, r);
  const rnd = rng(o.seed || 7);
  const ph = rnd() * 10;
  const dir = (x, y) => {
    const gx = Math.min(gw - 1, Math.max(0, (x / res) | 0)), gy = Math.min(gh - 1, Math.max(0, (y / res) | 0));
    const i = gy * gw + gx;
    const coh = Jxx[i] + Jyy[i];
    let a = 0.5 * Math.atan2(2 * Jxy[i], Jxx[i] - Jyy[i]) + Math.PI / 2;
    if (coh < 0.002) a = Math.sin(x * 0.006 + ph) + Math.cos(y * 0.007 - ph) * 1.3;
    return [Math.cos(a), Math.sin(a), g[i]];
  };
  const dmin = o.cell || 4, dmax = dmin * 4;
  const sep = (l) => dmin + (dmax - dmin) * Math.pow(l, 1.4);
  const cs = dmin;
  const hcols = Math.ceil(W / cs) + 1, hrows = Math.ceil(H / cs) + 1;
  const hash = Array.from({ length: hcols * hrows }, () => []);
  const free = (x, y, d, lineId, idx) => {
    const rr = Math.ceil(d / cs);
    const hx = (x / cs) | 0, hy = (y / cs) | 0;
    for (let yy = hy - rr; yy <= hy + rr; yy++) {
      if (yy < 0 || yy >= hrows) continue;
      for (let xx = hx - rr; xx <= hx + rr; xx++) {
        if (xx < 0 || xx >= hcols) continue;
        for (const p of hash[yy * hcols + xx]) {
          if (p[2] === lineId && Math.abs(p[3] - idx) < 30) continue;
          if ((p[0] - x) ** 2 + (p[1] - y) ** 2 < d * d) return false;
        }
      }
    }
    return true;
  };
  const add = (x, y, id, idx) => {
    const hx = (x / cs) | 0, hy = (y / cs) | 0;
    if (hx >= 0 && hy >= 0 && hx < hcols && hy < hrows) hash[hy * hcols + hx].push([x, y, id, idx]);
  };
  const seeds = [];
  for (let y = dmin; y < H; y += dmin * 1.5) for (let x = dmin; x < W; x += dmin * 1.5) seeds.push([x + rnd() * dmin, y + rnd() * dmin]);
  for (let i = seeds.length - 1; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    [seeds[i], seeds[j]] = [seeds[j], seeds[i]];
  }
  const maxLen = o.maxLen || 260;
  const wmax = o.width || dmin * 0.9;
  fill(ctx, W, H, o.paper);
  ctx.strokeStyle = o.ink;
  ctx.lineCap = 'round';
  let id = 0;
  for (const [sx, sy] of seeds) {
    const [, , l0] = dir(sx, sy);
    if (l0 > 0.94) continue;
    if (!free(sx, sy, sep(l0), -1, 0)) continue;
    id++;
    const trace = (sign) => {
      const pts = [];
      let x = sx, y = sy, px = 0, py = 0;
      for (let k = 0; k < maxLen; k++) {
        let [dx, dy, l] = dir(x, y);
        if (k > 0 && dx * px + dy * py < 0) { dx = -dx; dy = -dy; }
        if (k === 0) { dx *= sign; dy *= sign; }
        const mx = x + dx * 0.75, my = y + dy * 0.75;
        let [ex, ey] = dir(mx, my);
        if (ex * dx + ey * dy < 0) { ex = -ex; ey = -ey; }
        x += ex * 1.5; y += ey * 1.5;
        px = ex; py = ey;
        if (x < 0 || y < 0 || x >= W || y >= H || l > 0.96) break;
        if (!free(x, y, sep(l) * 0.55, id, k * sign)) break;
        pts.push([x, y, l]);
      }
      return pts;
    };
    const back = trace(-1).reverse();
    const fwd = trace(1);
    const pts = back.concat([[sx, sy, l0]], fwd);
    if (pts.length < 8) continue;
    pts.forEach((p, k) => add(p[0], p[1], id, k - back.length));
    for (let k = 0; k < pts.length - 1; k += 3) {
      const e = Math.min(pts.length - 1, k + 3);
      const l = pts[k][2];
      const taper = Math.min(1, k / 10, (pts.length - 1 - k) / 10);
      ctx.lineWidth = Math.max(0.35, wmax * Math.pow(1 - l, 1.1) * (0.35 + 0.65 * taper));
      ctx.beginPath();
      ctx.moveTo(pts[k][0], pts[k][1]);
      for (let m = k + 1; m <= e; m++) ctx.lineTo(pts[m][0], pts[m][1]);
      ctx.stroke();
    }
  }
}

/* ---------- 8. Mappa sfumatura ---------- */
function gradmap(ctx, img, W, H, o) {
  const gw = Math.ceil(W / 2), gh = Math.ceil(H / 2);
  const g = gray(getPixels(img, gw, gh), o);
  const stops = (o.stops || [o.ink, '#0d9e5a', '#f2c94c', o.paper]).map(hexToRgb);
  const levels = o.levels || 0;
  const out = new Uint8ClampedArray(gw * gh * 4);
  for (let i = 0, j = 0; i < g.length; i++, j += 4) {
    let v = g[i];
    if (levels > 1) v = Math.round(v * (levels - 1)) / (levels - 1);
    const p = v * (stops.length - 1);
    const a = Math.min(stops.length - 2, Math.floor(p)), f = p - a;
    for (let c = 0; c < 3; c++) out[j + c] = stops[a][c] + (stops[a + 1][c] - stops[a][c]) * f;
    out[j + 3] = 255;
  }
  blitScaled(ctx, out, gw, gh, W, H, true);
}

/* ---------- 9. Glitch ---------- */
function glitch(ctx, img, W, H, o) {
  const s = 2;
  const gw = Math.ceil(W / s), gh = Math.ceil(H / s);
  const px = getPixels(img, gw, gh);
  const src = px.data;
  const out = new Uint8ClampedArray(src);
  const rnd = rng(o.seed || 3);
  const amt = o.amount ?? 0.6;
  const shift = Math.round((o.rgb ?? 6) / s);
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) {
      const j = (y * gw + x) * 4;
      const xr = Math.min(gw - 1, x + shift), xb = Math.max(0, x - shift);
      out[j] = src[(y * gw + xr) * 4];
      out[j + 2] = src[(y * gw + xb) * 4 + 2];
    }
  let y = 0;
  while (y < gh) {
    const bh = 2 + ((rnd() * 18) | 0);
    if (rnd() < amt * 0.55) {
      const off = ((rnd() - 0.5) * gw * 0.22 * amt) | 0;
      const pix = rnd() < 0.3 ? 2 + ((rnd() * 6) | 0) : 1;
      for (let yy = y; yy < Math.min(gh, y + bh); yy++) {
        const row = out.slice(yy * gw * 4, (yy + 1) * gw * 4);
        for (let x = 0; x < gw; x++) {
          const sx = (((Math.floor((x - off) / pix) * pix) % gw) + gw) % gw;
          out.set(row.subarray(sx * 4, sx * 4 + 4), (yy * gw + x) * 4);
        }
      }
    }
    y += bh;
  }
  blitScaled(ctx, out, gw, gh, W, H);
}

/* ---------- 10. Pixel sorting ---------- */
function pixelsort(ctx, img, W, H, o) {
  const s = 2;
  const gw = Math.ceil(W / s), gh = Math.ceil(H / s);
  const src = getPixels(img, gw, gh).data;
  const out = new Uint8ClampedArray(src);
  const lo = o.lo ?? 0.28, hi = o.hi ?? 0.92;
  const maxLen = o.maxLen || 0;
  const rnd = rng(o.seed || 11);
  const lum = (j) => (0.2126 * out[j] + 0.7152 * out[j + 1] + 0.0722 * out[j + 2]) / 255;
  for (let y = 0; y < gh; y++) {
    let x = 0;
    while (x < gw) {
      while (x < gw && !((l) => l >= lo && l <= hi)(lum((y * gw + x) * 4))) x++;
      const start = x;
      while (x < gw && ((l) => l >= lo && l <= hi)(lum((y * gw + x) * 4)) && (!maxLen || x - start < maxLen) && !(rnd() < (o.breaks ?? 0.004))) x++;
      if (x - start > 2) {
        const span = [];
        for (let k = start; k < x; k++) {
          const j = (y * gw + k) * 4;
          span.push([lum(j), out[j], out[j + 1], out[j + 2]]);
        }
        span.sort((a, b) => (o.invert ? b[0] - a[0] : a[0] - b[0]));
        span.forEach((p, k) => {
          const j = (y * gw + start + k) * 4;
          out[j] = p[1]; out[j + 1] = p[2]; out[j + 2] = p[3];
        });
      }
      x++;
    }
  }
  blitScaled(ctx, out, gw, gh, W, H);
}

/* ---------- elenco degli stili (stesso ordine del plugin) ---------- */
export const STYLES = [
  { id: 'dither', name: 'Dither', svg: false, render: dither,
    note: 'Pochi toni, distribuiti punto per punto: l’effetto delle vecchie stampanti e dei primi monitor.' },
  { id: 'halftone', name: 'Halftone', svg: true, render: halftone,
    note: 'Retino di punti che crescono nelle ombre, con angolo regolabile. In SVG anche in CMYK, una lastra per inchiostro.' },
  { id: 'ascii', name: 'ASCII', svg: false, render: ascii,
    note: 'L’immagine ricostruita con caratteri, dal più leggero al più pieno.' },
  { id: 'mosaico', name: 'Mosaico', svg: false, render: mosaic,
    note: 'Tessere con fuga e un leggero rilievo, ciascuna con il colore medio della sua zona.' },
  { id: 'incisione', name: 'Incisione', svg: true, render: engrave,
    note: 'Linee parallele che si ingrossano nelle ombre, con ondulazione e tratteggio incrociato.' },
  { id: 'flusso', name: 'Linee di flusso', svg: true, render: flowlines,
    note: 'Linee che seguono i bordi dell’immagine senza toccarsi; più fitte e spesse dove è scuro.' },
  { id: 'curve', name: 'Curve di livello', svg: true, render: contour,
    note: 'La luminosità diventa altitudine: ogni curva unisce i punti con lo stesso tono, come in una carta topografica.' },
  { id: 'sfumatura', name: 'Mappa sfumatura', svg: false, render: gradmap,
    note: 'Ogni tono di grigio diventa un colore della sfumatura scelta, continua o a livelli.' },
  { id: 'glitch', name: 'Glitch', svg: false, render: glitch,
    note: 'Strappi orizzontali, blocchi pixelati e canali RGB sfasati.' },
  { id: 'pixelsort', name: 'Pixel sorting', svg: false, render: pixelsort,
    note: 'I pixel tra due soglie di luminosità vengono riordinati, riga per riga.' },
];

export function renderStyle(id, ctx, img, W, H, opts = {}) {
  const s = STYLES.find((x) => x.id === id) || STYLES[0];
  const o = { ...defaults, ...opts };
  ctx.save();
  s.render(ctx, img, W, H, o);
  ctx.restore();
}
