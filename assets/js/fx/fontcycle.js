/* "Type": la parola prova un carattere dopo l'altro, come Type fa con i font installati. */
import { loop, reduceMotion } from '../main.js';

const FONTS = [
  ['Doto', '"Doto"', 900, ''],
  ['Handjet', '"Handjet"', 800, '"ELSH" 6'],
  ['Martian Mono', '"Martian Mono"', 300, '"wdth" 75'],
  ['Georgia', 'Georgia, serif', 700, ''],
  ['Impact', 'Impact, "Arial Black", sans-serif', 400, ''],
  ['Times New Roman', '"Times New Roman", Times, serif', 400, ''],
  ['Courier New', '"Courier New", Courier, monospace', 700, ''],
  ['Arial Black', '"Arial Black", Arial, sans-serif', 900, ''],
  ['Trebuchet MS', '"Trebuchet MS", sans-serif', 400, ''],
];

export default function fontcycle(el) {
  const word = el.querySelector('[data-fontcycle]');
  const n = el.querySelector('[data-fontcycle-n]');
  const name = el.querySelector('[data-fontcycle-name]');
  let i = 0, acc = 0;
  const set = () => {
    const [label, fam, w, fvs] = FONTS[i];
    word.style.fontFamily = fam;
    word.style.fontWeight = w;
    word.style.fontVariationSettings = fvs || 'normal';
    n.textContent = i + 1;
    name.textContent = label;
  };
  set();
  if (reduceMotion) {
    word.parentElement.addEventListener('click', () => { i = (i + 1) % FONTS.length; set(); });
    return;
  }
  loop(word, (dt) => {
    acc += dt;
    if (acc > 0.9) { acc = 0; i = (i + 1) % FONTS.length; set(); }
  }).kick();
}
