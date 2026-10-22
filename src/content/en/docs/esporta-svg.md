---
title: SVG export
description: Export the results of Halftone, Engraving, Flow lines and Contour lines as vector SVG, ready for Illustrator and for print.
group: Funzioni
order: 1
---
## Which styles

| Style | What the SVG contains |
|---|---|
| Halftone | The halftone dots. In **CMYK**: one plate per ink. |
| Engraving | The lines as filled paths. |
| Flow lines | The lines with their thickness. |
| Contour lines | Only the contours (without bands and relief). |

## Why the files are light

Paths are simplified (Ramer–Douglas–Peucker algorithm, with a tolerance of ¼ pixel): files weigh about nine times less, with no visible difference.

## Try it now

On the [home page](/home/#svg) you can zoom into a halftone, compare PNG and SVG, and download the sample.
