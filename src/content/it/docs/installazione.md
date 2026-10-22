---
title: Installazione
description: Come installare WGT-01 in Photoshop {{photoshop_min}} o successivo: requisiti, file .ccx e primo avvio del pannello, passo per passo.
group: Inizia
order: 2
---
## Requisiti

| | |
|---|---|
| Photoshop | {{photoshop_min}} o successivo |
| Sistema | Windows o macOS |
| Documenti | RGB a 8 bit (CMYK e 16 bit sono previsti in futuro) |
| Facoltativo | [LM Studio](/doc/dev-option/), solo per la Dev option di Type |

## Installare il file .ccx

1. Dopo la donazione su Payhip ricevi un’email con il file del plugin, che termina in **.ccx**, e il tuo codice seriale.
2. Fai **doppio clic** sul file .ccx. Si apre Creative Cloud e ti chiede di confermare l’installazione.
3. Riavvia Photoshop.
4. Apri il pannello dal menu **Plugin → {{name}}**. Puoi agganciarlo accanto agli altri pannelli.

## Se il doppio clic non funziona

Puoi installare il plugin con **UXP Developer Tool**, l’app gratuita di Adobe per i plugin:

1. Installa UXP Developer Tool dall’app Creative Cloud (sezione *Tutte le app*).
2. Aprilo con Photoshop già avviato e scegli **Add Plugin**.
3. Seleziona il file `manifest.json` che trovi nella cartella del plugin, poi **Load**.

## Aggiornare

Installa il nuovo file .ccx sopra il precedente: impostazioni e preset salvati restano.
