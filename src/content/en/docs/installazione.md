---
title: Installation
description: How to install WGT-01 in Photoshop {{photoshop_min}} or later: requirements, the .ccx file and first launch of the panel, step by step.
group: Inizia
order: 2
---
## Requirements

| | |
|---|---|
| Photoshop | {{photoshop_min}} or later |
| System | Windows or macOS |
| Documents | 8-bit RGB (CMYK and 16-bit are planned) |
| Optional | [LM Studio](/doc/dev-option/), only for Type’s Dev option |

## Installing the .ccx file

1. After donating on Payhip you get an email with the plugin file, ending in **.ccx**, and your serial code.
2. **Double-click** the .ccx file. Creative Cloud opens and asks you to confirm the installation.
3. Restart Photoshop.
4. Open the panel from the **Plugins → {{name}}** menu. You can dock it next to your other panels.

## If double-clicking doesn’t work

You can install the plugin with **UXP Developer Tool**, Adobe’s free app for plugins:

1. Install UXP Developer Tool from the Creative Cloud app (*All apps* section).
2. Open it with Photoshop already running and choose **Add Plugin**.
3. Select the `manifest.json` file in the plugin folder, then **Load**.

## Updating

Install the new .ccx file over the old one: your settings and saved presets stay.
