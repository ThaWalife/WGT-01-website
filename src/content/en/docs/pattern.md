---
title: Pattern
description: WGT-01 Pattern: repeats an element, a shape or your own PNG/SVG file and sets its size and position from the tones of the photo.
group: Sezioni
order: 1
---
<figure class="doc-figure"><canvas data-fx="still" data-style="halftone" data-photo="example-4" data-opts='{"cell":7,"angle":0,"staggered":true}'></canvas><figcaption>The idea behind Pattern: the element grows where the image is dark.</figcaption></figure>

## How it works

Pattern looks at the greyscale of the image and places an **element** on a grid: where the tone is dark the element is large, where it’s light it’s small or disappears.

## Element

Pick a ready-made shape or your own file. **SVG** files stay vector; **PNG**, **JPG** and layers are raster.

## Zones

| Control | What it does |
|---|---|
| **Soglia luminosità** (brightness threshold) | Above this brightness no element is placed. |
| **Dimensione minima elemento** (minimum element size) | Elements smaller than this aren’t drawn. |
| **Inverti forma** (invert shape) | Swaps the filled and empty parts of the element. |
| **Elementi diversi per tono** (different elements per tone) | One element for dark areas, one for mid tones and one for light areas. |
| **Inverti zone** (invert zones) | Shadows and highlights swap. |

## Distribution

| Control | What it does |
|---|---|
| **Scala elemento** (element scale) | Maximum size of the element. |
| **Distanza tra elementi** (spacing) | The grid step. |
| **Griglia sfalsata** (staggered grid) | Shifts every other row by half a step. |

## Variations

| Control | What it does |
|---|---|
| **Rotazione massima** (maximum rotation) | Each element rotates randomly up to this angle. |
| **Variazione casuale della scala** (random scale variation) | Makes the sizes less regular. |
| **Variante** (variant) | Changes only the random part (rotation, scale, colours, organic distribution) and keeps everything else. |

## Output

With **Colori nel vettoriale** (colours in vector) you decide how the elements are coloured when the element is an SVG.
