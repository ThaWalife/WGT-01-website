---
title: Dev option and LM Studio
nav: Dev option and LM Studio
description: WGT-01 developer options and the LM Studio connection: a local AI model that helps Type with the layout.
group: Funzioni
order: 3
---
## What it is

The **Dev option** is for people who want to experiment. When it’s on, an **LM Studio** tab appears in the Type section: an AI model that runs on your computer, on your graphics card. No data leaves your computer.

The AI only suggests **text roles, kind of communication and tone**, and can point out where the subject is and where there’s free space. Fonts, colours and sizes are still decided by Type’s rules.

## How to turn it on

1. Install [LM Studio](https://lmstudio.ai) and download a model. To use the image too you need a model that can “see” (for example from the Qwen-VL family).
2. In LM Studio start the local server: the address is `http://localhost:1234`.
3. In {{name}}, on the start screen, tick **Dev option**.
4. In Type open the **LM Studio** tab, choose the model and test the connection.

| Option | What it does |
|---|---|
| **Manda anche l’immagine** (send the image too) | The model looks at the photo (only models that can see images). |
| **Poi crea l’impaginazione** (then create the layout) | After the reply, Type lays out straight away. |

> Dev option features are experimental and may change.
