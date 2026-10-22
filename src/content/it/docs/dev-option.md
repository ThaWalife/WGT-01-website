---
title: Dev option e LM Studio
nav: Dev option e LM Studio
description: Le opzioni per sviluppatori di WGT-01 e il collegamento a LM Studio: un modello di intelligenza artificiale locale che aiuta Type a impaginare.
group: Funzioni
order: 3
---
## Cos’è

La **Dev option** è un’opzione per chi vuole sperimentare. Quando è attiva, nella sezione Type compare la scheda **LM Studio**: un modello di intelligenza artificiale che gira sul tuo computer, con la tua scheda video. Nessun dato esce dal computer.

L’AI suggerisce solo **ruoli del testo, tipo di comunicazione e tono**, e può indicare dove sta il soggetto e dove c’è spazio libero. Font, colori e misure restano decisi dalle regole di Type.

## Come si attiva

1. Installa [LM Studio](https://lmstudio.ai) e scarica un modello. Per usare anche l’immagine serve un modello che “vede” (per esempio della famiglia Qwen-VL).
2. In LM Studio avvia il server locale: l’indirizzo è `http://localhost:1234`.
3. In {{name}}, nella schermata iniziale, spunta **Dev option**.
4. In Type apri la scheda **LM Studio**, scegli il modello e prova il collegamento.

| Opzione | Cosa fa |
|---|---|
| Manda anche l’immagine | Il modello guarda la foto (solo modelli che vedono le immagini). |
| Poi crea l’impaginazione | Dopo la risposta, Type impagina subito. |

> Le funzioni della Dev option sono in prova e possono cambiare.
