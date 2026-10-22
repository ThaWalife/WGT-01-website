---
title: Contour lines
description: WGT-01 Contour lines style: brightness becomes altitude and each line joins points of the same tone. Exports to SVG.
group: Stili
order: 7
---
<figure class="doc-figure"><canvas data-fx="still" data-style="curve" data-photo="example-3" data-opts='{"levels":16}'></canvas><figcaption>Contour lines, light preview computed in your browser.</figcaption></figure>

> Exports to **SVG**. See [SVG export](/doc/esporta-svg/).

## Controls

| Control | What it does |
|---|---|
| **Numero di curve** (number of lines) | How many contour lines are drawn. |
| **Morbidezza** (smoothness) | How much the image is cleaned first: “Preserva i bordi” (preserve edges) removes noise without smudging outlines, “Morbido” (soft) smooths everything. |
| **Distribuzione** (distribution) | “Bilanciata” (balanced) puts lines where there’s real detail, “Uniforme” (even) spaces them regularly. |
| **Ignora curve più corte di** (ignore lines shorter than) | Removes tiny contours. |
| **Distanza minima tra curve** (minimum spacing) | Avoids lines that are too close. |
| **Spessore linea** (line width) | Base thickness. |
| **Spessore segue il tono** (width follows tone) | Thicker lines in the shadows. |
| **Curva spessa ogni** (thick line every) | One index line every N (0 = never). |
| **Rilievo ombreggiato** (shaded relief) | Fills the bands between lines with relief shading. |

## Common adjustments

Every style starts from the **Regolazioni** (adjustments): **Luminosità** (brightness) and **Contrasto** (contrast) change the greyscale before the style reads it, **Inverti toni** (invert tones) swaps lights and darks.

## Tip

The SVG contains only the lines: bands and relief stay in the raster result.
