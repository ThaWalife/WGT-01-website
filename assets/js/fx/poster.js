/* Type: lo stesso manifesto nei 6 archetipi di impaginazione, con i colori presi dalla foto. */
import { applyPalette } from './palette.js';

export default function poster(el) {
  const p = el.querySelector('.poster');
  applyPalette(p);
  const btns = [...el.querySelectorAll('[data-archetype]')];
  const desc = el.querySelector('[data-archetype-desc]');
  const grid = el.querySelector('[data-grid]');
  const set = (b) => {
    p.dataset.a = b.dataset.archetype;
    btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (desc) desc.textContent = b.dataset.desc || '';
  };
  btns.forEach((b) => b.addEventListener('click', () => set(b)));
  grid?.addEventListener('click', () => {
    const on = grid.getAttribute('aria-pressed') !== 'true';
    grid.setAttribute('aria-pressed', String(on));
    p.classList.toggle('show-grid', on);
  });
}
