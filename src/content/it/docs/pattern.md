---
title: Pattern
description: Un elemento ripetuto, con dimensione e posizione decise dal tono.
group: Sezioni
order: 1
---
<figure class="doc-figure"><canvas data-fx="still" data-style="halftone" data-photo="hopper" data-opts='{"cell":7,"angle":0,"staggered":true}'></canvas><figcaption>Il principio di Pattern: l’elemento cresce dove l’immagine è scura.</figcaption></figure>

## Come funziona

Pattern guarda la scala di grigi dell’immagine e posa un **elemento** su una griglia: dove il tono è scuro l’elemento è grande, dove è chiaro è piccolo o sparisce.

## Elemento

Scegli una forma pronta oppure un tuo file. I file **SVG** restano vettoriali; **PNG**, **JPG** e i livelli sono raster.

## Zone

| Controllo | Cosa fa |
|---|---|
| Soglia luminosità | Sopra questa luminosità non viene posato nessun elemento. |
| Dimensione minima elemento | Gli elementi più piccoli di così non vengono disegnati. |
| Inverti forma | Scambia pieno e vuoto dell’elemento. |
| Elementi diversi per tono | Un elemento per le zone scure, uno per le medie e uno per le chiare. |
| Inverti zone | Ombre e luci si scambiano. |

## Distribuzione

| Controllo | Cosa fa |
|---|---|
| Scala elemento | Dimensione massima dell’elemento. |
| Distanza tra elementi | Passo della griglia. |
| Griglia sfalsata | Sposta di mezzo passo una riga sì e una no. |

## Variazioni

| Controllo | Cosa fa |
|---|---|
| Rotazione massima | Ogni elemento ruota a caso fino a questo angolo. |
| Variazione casuale della scala | Rende le dimensioni meno regolari. |
| Variante | Cambia solo la parte casuale (rotazione, scala, colori, distribuzione organica) e lascia uguale il resto. |

## Output

Con **Colori nel vettoriale** decidi come vengono colorati gli elementi quando l’elemento è un SVG.
