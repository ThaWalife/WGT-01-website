# WGT-01 — sito

Sito di presentazione, documentazione e download di **WGT-01**, plugin per Adobe Photoshop
(Walife Generative Tools). Pubblicato con GitHub Pages: https://thawalife.github.io/WGT-01/

Il sito è statico e senza dipendenze nel browser: gli effetti (ASCII, halftone, curve di livello…)
sono versioni leggere degli algoritmi del plugin, scritte in JavaScript e disegnate su canvas.

## Struttura

| Percorso | Contenuto |
|---|---|
| `src/config.json` | Nome, versione, requisiti, link Payhip (un solo punto da cambiare) |
| `src/content/it/ui.json` | Testi dell'interfaccia (pronto per altre lingue) |
| `src/content/it/docs/` | Documentazione del plugin, in Markdown |
| `src/templates/` | Modelli delle pagine (Jinja2) |
| `src/build.py` | Genera le pagine HTML nella radice del repository |
| `assets/js/engines.js` | I 10 stili per il web |
| `assets/js/fx/` | Hero, superficie Pattern, pianeta SVG, galleria, manifesto Type, demo |
| `assets/img/demo/` | Foto di esempio provvisorie (vedi `CREDITI.md`) |

## Aggiornare

```
python3 src/build.py
```

poi commit e push: GitHub Pages pubblica da solo il ramo `main`.

## Attivare il download

In `src/config.json` compila `payhip.product_url` (es. `https://payhip.com/b/XXXX`) e
`payhip.product_id` (`XXXX`), poi ricostruisci: il pulsante "In arrivo" diventa il checkout Payhip.
La "product secret key" di Payhip non va mai messa in questo repository.
