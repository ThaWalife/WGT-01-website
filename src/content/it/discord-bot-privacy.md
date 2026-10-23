*Ultimo aggiornamento: 23 ottobre 2026.*

Questa informativa spiega quali dati legge e salva **WGT-01**, il bot Discord del server di supporto e notizie del plugin {{name}}. Il bot è gestito da **Walife** (Federico Marini) come persona. Contatto: [{{email}}](mailto:{{email}}).

## In breve

- Il bot legge il testo dei messaggi **solo per scegliere una risposta automatica** e **non lo salva**.
- Non salva **nessun dato personale** e **nessun contenuto dei messaggi**: solo gli ID tecnici che gli servono per funzionare.
- **Nessuna vendita o condivisione di dati, nessuna pubblicità, nessun tracciamento, nessun cookie.**

## Cosa fa il bot

Crea e sistema i canali del server (`/setup`); pubblica regole, FAQ, link utili, changelog e annunci (anche tramite un webhook); nel canale di supporto trasforma ogni domanda in un thread e risponde in automatico con risposte già scritte, scelte per **parole chiave** (nessuna intelligenza artificiale è attiva); nei suggerimenti aggiunge 👍 👎 e un thread; con `/report` apre un modulo di segnalazione dei bug; risponde ai comandi `/help`, `/info`, `/docs`, `/style` e `/ask`.

## Cosa legge

Il testo dei messaggi **solo** nei canali support e suggestions, nei messaggi diretti al bot e quando il bot viene menzionato. Il testo serve **solo a scegliere la risposta** e **non viene salvato** dal bot.

## Cosa salva

File locali sul computer che esegue il bot, con:

| Dato | Perché |
|---|---|
| ID del server, dei canali e dei messaggi che il bot gestisce | Per poter aggiornare i messaggi che ha pubblicato |
| ID e token del webhook degli annunci | Per pubblicare gli annunci |
| Versioni del plugin già annunciate | Per non annunciare due volte la stessa versione |
| Copia della documentazione pubblica di questo sito | Per rispondere a `/docs` e comandi simili |

**Nessun contenuto dei messaggi degli utenti e nessun dato personale viene salvato.**

## Dati temporanei

- **Solo in memoria** (si cancellano al riavvio del bot): quali risposte automatiche ha già dato in un thread, per non ripetersi.
- **Registro tecnico** nella finestra del programma: il nome visualizzato dell’utente e il nome della risposta scelta (non il testo del messaggio). Non viene conservato.

## Segnalazioni dei bug

Una segnalazione (`/report`) contiene quello che scrivi nel modulo (versione del plugin, Photoshop e sistema operativo, descrizione). Viene **pubblicata come thread nel server Discord** e resta su Discord come qualsiasi altro messaggio.

## Altri servizi

Il bot legge contenuti **pubblici** dal repository GitHub di questo sito (documentazione, versione attuale). **Nessun dato degli utenti viene inviato** a GitHub o ad altri servizi. Discord tratta i tuoi messaggi secondo la sua [Privacy Policy](https://discord.com/privacy).

## Funzione AI facoltativa (oggi spenta)

Il codice del bot può usare un modello di intelligenza artificiale (un modello locale con LM Studio, oppure Claude API di Anthropic). **Questa funzione è spenta.** Se un giorno venisse attivata, il testo delle domande verrebbe inviato a quel servizio per generare la risposta: **questa informativa verrà aggiornata prima di attivarla.**

## Conservazione

Gli ID restano finché il bot gestisce quel server; quando il bot viene rimosso da un server si possono cancellare.

## I tuoi diritti

Puoi chiedere la rimozione dei messaggi o dei thread creati dal bot che ti riguardano scrivendo a [{{email}}](mailto:{{email}}) o allo staff del server. I dati salvati dal bot non contengono dati personali. In base al Regolamento europeo sulla protezione dei dati (GDPR) puoi rivolgerti anche al [Garante per la protezione dei dati personali](https://www.garanteprivacy.it). Valgono inoltre i [Termini di servizio](https://discord.com/terms) e la [Privacy Policy](https://discord.com/privacy) di Discord.

Vedi anche i [Termini di servizio](/bot-terms/) del bot e la [pagina cookie e privacy del sito](/cookies/).
