/* "Un pannello, tre strumenti": a sinistra il pannello del plugin con le tre schede,
   a destra il documento di Photoshop che mostra il risultato della scheda attiva. */
import { loadImage, getPixels, gray, renderStyle } from '../engines.js';
import { fitCanvas, photo } from '../main.js';
import { presetFor } from './gallery.js';

const SHAPE = {
  croce(c, x, y, r) { const t = r * 0.38; c.rect(x - r, y - t, r * 2, t * 2); c.rect(x - t, y - r, t * 2, r * 2); },
  punto(c, x, y, r) { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); },
  quadrato(c, x, y, r) { const k = r * 0.86; c.rect(x - k, y - k, k * 2, k * 2); },
  foglia(c, x, y, r) { c.moveTo(x, y - r); c.quadraticCurveTo(x + r, y, x, y + r); c.quadraticCurveTo(x - r, y, x, y - r); },
};

export default async function tools(section) {
  const tabs = [...section.querySelectorAll('[role="tab"]')];
  const panes = [...section.querySelectorAll('[data-pane]')];
  const docName = section.querySelector('[data-doc-name]');
  const docInfo = section.querySelector('[data-doc-info]');
  const canvas = section.querySelector('.ps-doc canvas');
  const poster = section.querySelector('.ps-doc .poster');
  const imgs = { hopper: loadImage(photo('hopper')), fotografo: loadImage(photo('fotografo')) };
  const st = { tool: 'pattern', el: 'croce', step: 11, style: 'curve', arch: 'asse' };

  async function draw() {
    const showPoster = st.tool === 'type';
    canvas.hidden = showPoster;
    poster.hidden = !showPoster;
    if (showPoster) {
      poster.dataset.a = st.arch;
      docName.textContent = 'manifesto.psd @ 100%';
      const b = section.querySelector(`[data-arch="${st.arch}"]`);
      docInfo.textContent = `Archetipo: ${b.textContent} · griglia 6 colonne · contrasto 7,4:1`;
      return;
    }
    const { ctx, W, H, dpr } = fitCanvas(canvas, 1.5);
    if (st.tool === 'pattern') {
      const img = await imgs.hopper;
      const step = st.step * dpr;
      const cols = Math.ceil(W / step), rows = Math.ceil(H / step);
      const g = gray(getPixels(img, cols, rows, W / H), { contrast: 0.35 });
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      const p = new Path2D();
      let n = 0;
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const r = step * 0.62 * (1 - g[y * cols + x]);
          if (r < 0.9 * dpr) continue;
          SHAPE[st.el](p, x * step + step / 2 + (y & 1 ? step / 2 : 0), y * step + step / 2, r);
          n++;
        }
      ctx.fillStyle = '#000'; ctx.fill(p, 'evenodd');
      docName.textContent = 'ritratto.psd @ 100%';
      docInfo.textContent = `${n.toLocaleString('it-IT')} elementi · ${st.el} · griglia sfalsata`;
    } else {
      const img = await imgs.fotografo;
      renderStyle(st.style, ctx, img, W, H, { ink: '#000000', paper: '#ffffff', ...presetFor(st.style, dpr) });
      const b = section.querySelector(`[data-st="${st.style}"]`);
      docName.textContent = 'fotografo.psd @ 100%';
      docInfo.textContent = `Stile: ${b.textContent} · ${b.dataset.svg === '1' ? 'esportabile in SVG' : 'solo raster'} · Smart Object`;
    }
  }

  function select(tool, focus) {
    st.tool = tool;
    tabs.forEach((t) => {
      const on = t.dataset.tool === tool;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    panes.forEach((p) => (p.hidden = p.dataset.pane !== tool));
    draw();
  }
  tabs.forEach((t) => t.addEventListener('click', () => select(t.dataset.tool)));
  section.querySelector('[role="tablist"]').addEventListener('keydown', (e) => {
    const ids = tabs.map((t) => t.dataset.tool);
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (d) { e.preventDefault(); select(ids[(ids.indexOf(st.tool) + d + 3) % 3], true); }
  });

  const group = (attr, key) => {
    const btns = [...section.querySelectorAll(`[${attr}]`)];
    btns.forEach((b) => b.addEventListener('click', () => {
      st[key] = b.getAttribute(attr);
      btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      draw();
    }));
  };
  group('data-el', 'el');
  group('data-st', 'style');
  group('data-arch', 'arch');
  const step = section.querySelector('[data-step]');
  step?.addEventListener('input', () => { st.step = Number(step.value); draw(); });
  const grid = section.querySelector('[data-grid-toggle]');
  grid?.addEventListener('click', () => {
    const on = grid.getAttribute('aria-pressed') !== 'true';
    grid.setAttribute('aria-pressed', String(on));
    poster.classList.toggle('show-grid', on);
  });

  select('pattern');
  let lastW = canvas.clientWidth;
  new ResizeObserver(() => { if (canvas.clientWidth && canvas.clientWidth !== lastW) { lastW = canvas.clientWidth; draw(); } }).observe(canvas);
}
