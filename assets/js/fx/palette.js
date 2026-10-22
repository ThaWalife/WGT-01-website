/* Palette del manifesto ricavata dalla foto, come fa Type nel plugin:
   - accento: il colore saturo più presente (bottone, striscia, griglia);
   - testo sull'accento: nero o bianco, quello con più contrasto;
   - velo: una versione molto scura del tono dominante, al posto del nero puro;
   - testo: bianco leggermente tinto dall'accento. */

const lum = ([r, g, b]) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

function hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}
function fromHsl(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r, g, b].map((v) => Math.round((v + m) * 255));
}

export function paletteFrom(img) {
  const n = 48, c = document.createElement('canvas');
  c.width = c.height = n;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0, n, n);
  const d = x.getImageData(0, 0, n, n).data;
  const bins = Array.from({ length: 24 }, () => ({ w: 0, h: 0, s: 0, l: 0, dark: 0 }));
  let darkW = 0, darkH = 0, darkS = 0;
  for (let i = 0; i < d.length; i += 4) {
    const [h, s, l] = hsl([d[i], d[i + 1], d[i + 2]]);
    if (s > 0.25 && l > 0.2 && l < 0.85) {
      const b = bins[Math.floor(h / 15) % 24], w = s * (1 - Math.abs(l - 0.55));
      b.w += w; b.h += h * w; b.s += s * w; b.l += l * w;
    }
    if (l < 0.35 && s > 0.1) { darkW += 1; darkH += h; darkS += s; }
  }
  const best = bins.reduce((a, b) => (b.w > a.w ? b : a));
  let accent = [13, 158, 90]; // ripiego: il verde del sito
  let hue = 150;
  if (best.w > 2) {
    hue = best.h / best.w;
    const s = Math.min(0.95, Math.max(0.55, best.s / best.w));
    accent = fromHsl(hue, s, 0.58); // luminosità fissata: il bottone si legge sempre
  }
  const onAccent = contrast(accent, [0, 0, 0]) >= contrast(accent, [255, 255, 255]) ? [0, 0, 0] : [255, 255, 255];
  const vh = darkW ? darkH / darkW : hue, vs = darkW ? Math.min(0.6, darkS / darkW) : 0.3;
  const veil = fromHsl(vh, vs, 0.06);
  const ink = fromHsl(hue, 0.6, 0.95);
  return { accent, onAccent, veil, ink };
}

/* Applica la palette a un elemento .poster (aspetta che la sua immagine sia pronta). */
export async function applyPalette(poster) {
  const img = poster.querySelector('img');
  if (!img) return;
  if (!img.complete || !img.naturalWidth) await new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); });
  if (!img.naturalWidth) return;
  try {
    const p = paletteFrom(img);
    const rgb = (a) => `rgb(${a.join(' ')})`;
    poster.style.setProperty('--p-accent', rgb(p.accent));
    poster.style.setProperty('--p-on-accent', rgb(p.onAccent));
    poster.style.setProperty('--p-ink', rgb(p.ink));
    poster.style.setProperty('--p-veil', p.veil.join(' '));
    poster.dataset.palette = 'foto';
  } catch { /* immagine non leggibile: restano i colori del sito */ }
}
