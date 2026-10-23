*Last updated: 23 October 2026.*

This policy explains what data **WGT-01**, the Discord bot of the support and news server for the {{name}} plugin, reads and stores. The bot is run by **Walife** (Federico Marini) as a private individual. Contact: [{{email}}](mailto:{{email}}).

## In short

- The bot reads message text **only to choose an automatic reply**, and **doesn’t save it**.
- It stores **no personal data** and **no message content**: only technical IDs it needs to work.
- **No selling or sharing of data, no advertising, no tracking, no cookies.**

## What the bot does

It creates and arranges the server’s channels (`/setup`); posts rules, FAQ, useful links, changelog and announcements (also through a webhook); in the support channel turns each question into a thread and replies automatically with pre-written answers chosen by **keywords** (no artificial intelligence is active); adds 👍 👎 and a thread to suggestions; opens a bug report form with `/report`; and answers the `/help`, `/info`, `/docs`, `/style` and `/ask` commands.

## What it reads

The text of messages **only** in the support and suggestions channels, in direct messages to the bot and when the bot is mentioned. The text is used **only to choose the reply** and is **not saved** by the bot.

## What it stores

Local files on the computer that runs the bot contain:

| Data | Why |
|---|---|
| IDs of the server, the channels and the messages the bot manages | To be able to update the messages it posted |
| ID and token of the announcements webhook | To post announcements |
| Plugin versions already announced | Not to announce the same version twice |
| A copy of the public documentation of this website | To answer `/docs` and similar commands |

**No content of users’ messages and no personal data are stored.**

## Temporary data

- **In memory only** (deleted when the bot restarts): which automatic replies it has already given in a thread, so it doesn’t repeat itself.
- **Technical log** in the program window: the user’s display name and the name of the chosen reply (not the text of the message). It isn’t kept.

## Bug reports

A bug report (`/report`) contains what you write in the form (plugin version, Photoshop and operating system, description). It is **posted as a thread in the Discord server** and stays on Discord like any other message.

## Other services

The bot reads **public** content from the GitHub repository of this website (documentation, current version). **No user data is sent** to GitHub or any other service. Discord itself processes your messages under its own [Privacy Policy](https://discord.com/privacy).

## Optional AI feature (currently off)

The bot’s code can use an AI model (a local model through LM Studio, or Anthropic’s Claude API). **This feature is off.** If it is ever turned on, the text of questions would be sent to that service to generate the answer: **this policy will be updated before it is turned on.**

## Retention

The IDs stay as long as the bot manages that server; when the bot is removed from a server, they can be deleted.

## Your rights

You can ask for messages or threads created by the bot that concern you to be removed by writing to [{{email}}](mailto:{{email}}) or to the server staff. The data stored by the bot contains no personal data. Under the EU General Data Protection Regulation (GDPR) you can also contact the Italian data protection authority, the [Garante per la protezione dei dati personali](https://www.garanteprivacy.it), or the authority in your country. Discord’s [Terms of Service](https://discord.com/terms) and [Privacy Policy](https://discord.com/privacy) also apply.

See also the bot’s [Terms of Service](/bot-terms/) and the [website’s cookie and privacy page](/cookies/).
