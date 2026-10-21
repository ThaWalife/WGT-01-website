---
title: Curve di livello
description: La luminosità diventa altitudine: ogni curva unisce i punti con lo stesso tono, come le isoipse di una carta topografica.
group: Stili
order: 7
---
<figure class="doc-figure"><canvas data-fx="still" data-style="curve" data-photo="fotografo" data-opts='{"levels":16}'></canvas><figcaption>Curve di livello, anteprima leggera calcolata nel browser.</figcaption></figure>

> Esportabile in **SVG**. Vedi [Esporta SVG](/documentazione/esporta-svg/).

## Controlli

| Controllo | Cosa fa |
|---|---|
| Numero di curve | Quante curve vengono tracciate. |
| Morbidezza | Quanto si pulisce l’immagine prima: “Preserva i bordi” toglie il rumore senza impastare i contorni, “Morbido” ammorbidisce tutto. |
| Distribuzione | “Bilanciata” mette le curve dove c’è davvero dettaglio, “Uniforme” le spazia in modo regolare. |
| Ignora curve più corte di | Elimina le curve minuscole. |
| Distanza minima tra curve | Evita curve troppo vicine. |
| Spessore linea | Spessore di base. |
| Spessore segue il tono | Curve più spesse nelle ombre. |
| Curva spessa ogni | Una curva maestra ogni N (0 = mai). |
| Rilievo ombreggiato | Riempie le fasce tra le curve con un rilievo. |

## Regolazioni comuni

Tutti gli stili partono dalle **Regolazioni**: **Luminosità** e **Contrasto** cambiano la scala di grigi prima che lo stile la legga, **Inverti toni** scambia chiari e scuri.

## Consiglio

Nell’SVG ci sono solo le linee: fasce e rilievo restano nel risultato raster.
