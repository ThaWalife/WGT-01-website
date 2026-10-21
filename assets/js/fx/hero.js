/* Hero: la foto convertita in ASCII. La lente sotto il cursore mostra un altro stile. */
import { loadImage, getPixels, gray, rng, BAYER8 } from '../engines.js';
import { fitCanvas, photo, reduceMotion } from '../main.js';

const RAMP = ' .·:-=+*o#%@';
const LENSES = [
  { id: 'halftone', name: 'Halftone' },
  { id: 'dither', name: 'Dither' },
  { id: 'incisione', name: 'Incisione' },
];

export default async function hero(section) {
  const canvas = section.querySelector('canvas');
  const label = section.querySelector('[data-lens-name]');
  const img = await loadImage(photo(section.dataset.photo || 'fotografo'));
  const rnd = rng(42);
  let s = null; // stato del layout
  let lens = { x: 0, y: 0, on: false, mode: 0 };
  const GREEN = '#35b978';

  function layout() {
    const { ctx, W, H, dpr } = fitCanvas(canvas);
    const size = Math.round((W / dpr < 700 ? 8 : 10.5) * dpr);
    const cw = size * 0.6;
    const cols = Math.floor(W / cw), rows = Math.ceil(H / size);
    const g = gray(getPixels(img, cols, rows), { contrast: 0.35, brightness: 0.02 });
    // sfuma verso il nero a sinistra, dove sta il titolo
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const t = Math.min(1, x / (cols * 0.28));
        const v = Math.min(1, y / (rows * 0.2));
        g[y * cols + x] *= t * t * (3 - 2 * t) * (0.1 + 0.9 * v * v * (3 - 2 * v));
      }
    const reveal = new Float32Array(cols * rows);
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) reveal[y * cols + x] = 0.15 + 0.55 * (1 - x / cols) * 0.5 + rnd() * 0.55;
    const base = document.createElement('canvas');
    base.width = W; base.height = H;
    s = { ctx, W, H, dpr, size, cw, cols, rows, g, reveal, base };
    const L = RAMP.length - 1;
    s.lines = [];
    for (let y = 0; y < rows; y++) {
      let line = '';
      for (let x = 0; x < cols; x++) line += RAMP[Math.round(g[y * cols + x] * L)];
      s.lines.push(line);
    }
    drawAscii(base.getContext('2d'), 1);
  }

  function font(c) {
    c.font = `${s.size}px ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace`;
    c.textBaseline = 'top';
  }

  function drawAscii(c, p) {
    c.fillStyle = '#000';
    c.fillRect(0, 0, s.W, s.H);
    font(c);
    const { cols, rows, reveal, cw, size } = s;
    if (p >= 1) {
      c.fillStyle = '#fff';
      for (let y = 0; y < rows; y++) c.fillText(s.lines[y], 0, y * size, cols * cw);
      return;
    }
    for (let y = 0; y < rows; y++) {
      let shown = '', noise = '';
      const line = s.lines[y];
      for (let x = 0; x < cols; x++) {
        const r = reveal[y * cols + x];
        if (p >= r) { shown += line[x]; noise += ' '; }
        else { shown += ' '; noise += p > r - 0.35 && line[x] !== ' ' ? RAMP[(Math.random() * RAMP.length) | 0] : ' '; }
      }
      c.fillStyle = '#fff';
      c.fillText(shown, 0, y * size, cols * cw);
      c.fillStyle = 'rgba(255,255,255,.35)';
      c.fillText(noise, 0, y * size, cols * cw);
    }
  }

  function drawLens() {
    const { ctx, W, H } = s;
    ctx.drawImage(s.base, 0, 0);
    if (!lens.on) return;
    const R = Math.min(W, H) * 0.17;
    ctx.save();
    ctx.beginPath();
    ctx.arc(lens.x, lens.y, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#000';
    ctx.fillRect(lens.x - R, lens.y - R, R * 2, R * 2);
    const { cols, rows, cw, size, g } = s;
    const x0 = Math.max(0, Math.floor((lens.x - R) / cw)), x1 = Math.min(cols - 1, Math.ceil((lens.x + R) / cw));
    const y0 = Math.max(0, Math.floor((lens.y - R) / size)), y1 = Math.min(rows - 1, Math.ceil((lens.y + R) / size));
    const mode = LENSES[lens.mode].id;
    ctx.fillStyle = GREEN;
    if (mode === 'halftone') {
      ctx.beginPath();
      const step = size * 0.75;
      for (let y = lens.y - R; y <= lens.y + R; y += step)
        for (let x = lens.x - R + ((Math.round(y / step) & 1) * step) / 2; x <= lens.x + R; x += step) {
          const gx = Math.min(cols - 1, Math.max(0, (x / cw) | 0)), gy = Math.min(rows - 1, Math.max(0, (y / size) | 0));
          const r = step * 0.62 * Math.sqrt(g[gy * cols + gx]);
          if (r < 0.4) continue;
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
      ctx.fill();
    } else if (mode === 'dither') {
      const p = Math.max(2, Math.round(s.dpr * 3));
      for (let y = lens.y - R; y <= lens.y + R; y += p)
        for (let x = lens.x - R; x <= lens.x + R; x += p) {
          const gx = Math.min(cols - 1, Math.max(0, (x / cw) | 0)), gy = Math.min(rows - 1, Math.max(0, (y / size) | 0));
          const th = BAYER8[((y / p) & 7) * 8 + ((x / p) & 7)] / 64;
          if (g[gy * cols + gx] > th) ctx.fillRect(x, y, p, p);
        }
    } else {
      const step = size * 0.7;
      for (let y = lens.y - R; y <= lens.y + R; y += step) {
        ctx.beginPath();
        const top = [], bot = [];
        for (let x = lens.x - R; x <= lens.x + R; x += 3) {
          const yy = y + Math.sin(x * 0.03) * step * 0.25;
          const gx = Math.min(cols - 1, Math.max(0, (x / cw) | 0)), gy = Math.min(rows - 1, Math.max(0, (yy / size) | 0));
          const t = step * 0.9 * g[gy * cols + gx];
          top.push([x, yy - t / 2]); bot.push([x, yy + t / 2]);
        }
        top.forEach(([x, y2], i) => (i ? ctx.lineTo(x, y2) : ctx.moveTo(x, y2)));
        for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(53,185,120,.9)';
    ctx.lineWidth = s.dpr;
    ctx.beginPath();
    ctx.arc(lens.x, lens.y, R, 0, Math.PI * 2);
    ctx.stroke();
  }

  function intro() {
    if (reduceMotion) { drawLens(); return; }
    const t0 = performance.now();
    const dur = 1500;
    const step = (t) => {
      const p = Math.min(1.05, (t - t0) / dur);
      drawAscii(s.ctx, p * 1.25);
      if (p < 1.05) requestAnimationFrame(step);
      else drawLens();
    };
    requestAnimationFrame(step);
  }

  layout();
  intro();

  let pending = false;
  const move = (e) => {
    const r = canvas.getBoundingClientRect();
    lens.x = (e.clientX - r.left) * s.dpr;
    lens.y = (e.clientY - r.top) * s.dpr;
    lens.on = true;
    if (!pending) { pending = true; requestAnimationFrame(() => { pending = false; drawLens(); }); }
  };
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerdown', move);
  canvas.addEventListener('pointerleave', () => { lens.on = false; drawLens(); });
  canvas.addEventListener('click', () => {
    lens.mode = (lens.mode + 1) % LENSES.length;
    if (label) label.textContent = LENSES[lens.mode].name;
    drawLens();
  });
  let rt = 0;
  let lastW = canvas.clientWidth, lastH = canvas.clientHeight;
  new ResizeObserver(() => {
    if (canvas.clientWidth === lastW && Math.abs(canvas.clientHeight - lastH) < 120) return;
    lastW = canvas.clientWidth; lastH = canvas.clientHeight;
    clearTimeout(rt);
    rt = setTimeout(() => { layout(); drawLens(); }, 150);
  }).observe(canvas);
}
