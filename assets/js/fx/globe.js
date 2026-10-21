/* Esporta SVG: un pianeta disegnato con curve di livello. Si gira trascinando e si scarica in SVG. */
import { contourSegments } from '../engines.js';
import { fitCanvas, loop, reduceMotion } from '../main.js';

function hash(x, y, z) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1440662683)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  let r = 0;
  for (let dz = 0; dz < 2; dz++)
    for (let dy = 0; dy < 2; dy++)
      for (let dx = 0; dx < 2; dx++)
        r += hash(xi + dx, yi + dy, zi + dz) * (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w);
  return r;
}
const fbm = (x, y, z) => {
  let s = 0, a = 0.5, f = 1;
  for (let o = 0; o < 5; o++) { s += a * noise3(x * f, y * f, z * f); a *= 0.5; f *= 2.03; }
  return s;
};

export default function globe(el) {
  const canvas = el.querySelector('canvas');
  const btn = el.querySelector('[data-export]');
  const NLON = 240, NLAT = 120;
  const field = new Float32Array(NLON * NLAT);
  for (let j = 0; j < NLAT; j++) {
    const lat = Math.PI / 2 - (j / (NLAT - 1)) * Math.PI;
    for (let i = 0; i < NLON; i++) {
      const lon = (i / (NLON - 1)) * Math.PI * 2;
      const x = Math.cos(lat) * Math.cos(lon), y = Math.sin(lat), z = Math.cos(lat) * Math.sin(lon);
      field[j * NLON + i] = fbm(x * 1.6 + 7, y * 1.6 + 3, z * 1.6 + 11);
    }
  }
  let mn = Infinity, mx = -Infinity;
  for (const v of field) { mn = Math.min(mn, v); mx = Math.max(mx, v); }
  for (let i = 0; i < field.length; i++) field[i] = (field[i] - mn) / (mx - mn);
  const N = 15;
  const levels = Array.from({ length: N }, (_, i) => 0.06 + (i / (N - 1)) * 0.88);
  const sets = contourSegments(field, NLON, NLAT, levels).map(({ seg }, li) => {
    const xyz = new Float32Array((seg.length / 2) * 3);
    for (let k = 0, m = 0; k < seg.length; k += 2, m += 3) {
      const lon = (seg[k] / (NLON - 1)) * Math.PI * 2, lat = Math.PI / 2 - (seg[k + 1] / (NLAT - 1)) * Math.PI;
      xyz[m] = Math.cos(lat) * Math.cos(lon);
      xyz[m + 1] = Math.sin(lat);
      xyz[m + 2] = Math.cos(lat) * Math.sin(lon);
    }
    return { xyz, major: li % 4 === 0 };
  });

  let rotY = 0.6, rotX = -0.32, vel = 0.12, drag = null;

  function project(W, H) {
    const R = Math.min(W, H) * 0.46, cx = W / 2, cy = H / 2;
    const cy_ = Math.cos(rotY), sy_ = Math.sin(rotY), cx_ = Math.cos(rotX), sx_ = Math.sin(rotX);
    return (x, y, z) => {
      const x1 = x * cy_ + z * sy_, z1 = -x * sy_ + z * cy_;
      const y2 = y * cx_ - z1 * sx_, z2 = y * sx_ + z1 * cx_;
      return [cx + x1 * R, cy - y2 * R, z2];
    };
  }

  function frame() {
    const { ctx, W, H, dpr } = fitCanvas(canvas, 1.75);
    ctx.clearRect(0, 0, W, H);
    const P = project(W, H);
    const back = new Path2D(), front = new Path2D(), major = new Path2D();
    for (const { xyz, major: mj } of sets) {
      for (let m = 0; m < xyz.length; m += 6) {
        const a = P(xyz[m], xyz[m + 1], xyz[m + 2]), b = P(xyz[m + 3], xyz[m + 4], xyz[m + 5]);
        const path = a[2] > 0 && b[2] > 0 ? (mj ? major : front) : a[2] < 0 && b[2] < 0 ? back : null;
        if (!path) continue;
        path.moveTo(a[0], a[1]);
        path.lineTo(b[0], b[1]);
      }
    }
    const col = getComputedStyle(el).color;
    ctx.strokeStyle = col;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.18; ctx.lineWidth = 0.8 * dpr; ctx.stroke(back);
    ctx.globalAlpha = 1; ctx.lineWidth = 1 * dpr; ctx.stroke(front);
    ctx.lineWidth = 2.2 * dpr; ctx.stroke(major);
    ctx.globalAlpha = 0.5; ctx.lineWidth = 1 * dpr;
    ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.min(W, H) * 0.46, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const anim = loop(canvas, (dt) => { if (!drag) rotY += vel * dt; frame(); });
  frame();
  anim.kick();

  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, ry: rotY, rx: rotX };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    rotY = drag.ry + (e.clientX - drag.x) * 0.008;
    rotX = Math.max(-1.3, Math.min(1.3, drag.rx - (e.clientY - drag.y) * 0.008));
    if (reduceMotion) frame();
  });
  const end = () => { drag = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, 0.15], ArrowDown: [0, -0.15] }[e.key];
    if (!k) return;
    e.preventDefault();
    rotY += k[0]; rotX = Math.max(-1.3, Math.min(1.3, rotX + k[1]));
    frame();
  });
  if (reduceMotion) new ResizeObserver(() => frame()).observe(canvas);

  /* Lo stesso disegno, in vettoriale: solo le curve visibili, una per livello. */
  btn?.addEventListener('click', () => {
    const S = 1000;
    const P = project(S, S);
    let body = '';
    sets.forEach(({ xyz, major: mj }, i) => {
      let d = '';
      for (let m = 0; m < xyz.length; m += 6) {
        const a = P(xyz[m], xyz[m + 1], xyz[m + 2]), b = P(xyz[m + 3], xyz[m + 4], xyz[m + 5]);
        if (a[2] > 0 && b[2] > 0) d += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
      }
      if (d) body += `<path id="livello-${i + 1}" d="${d}" stroke-width="${mj ? 2.2 : 1}"/>\n`;
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">\n<g fill="none" stroke="#000" stroke-linecap="round">\n<circle cx="${S / 2}" cy="${S / 2}" r="${S * 0.46}" stroke-width="1"/>\n${body}</g>\n</svg>\n`;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'wgt-01-curve-di-livello.svg' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });
}
