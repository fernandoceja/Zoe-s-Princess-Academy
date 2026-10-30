---
name: lmk
description: Send a Pushover phone notification after finishing a task. Use when the user says LMK when you're done, let me know when you're done, notify me when you're done, ping me when you're done, or says they are stepping away and want an alert after the work finishes.
---

# LMK

Treat the notification as an **end-of-task delivery requirement**. Finish and verify the work first. Then send one notification. Always return the full result in chat. The push is never the only copy.

## Triggers

- `LMK when you're done`
- `let me know when you're done`
- `notify me when you're done`
- `ping me when you're done`
- User is stepping away and wants an alert after the work finishes

## Credentials

Read `PUSHOVER_USER_KEY` and `PUSHOVER_API_TOKEN` from `~/.config/lmk/pushover.env`.

- Never put credentials in this skill, in chat, in logs, or in the repo.
- Never ask for the Pushover password.
- If the file is missing or unreadable, stop and tell the user to create it (mode `600`) with those two variables. Do not invent keys.

Helper script: `scripts/notify.sh` in this skill folder.

## Send rules

1. Complete and verify the requested work.
2. Send **one** final notification via the helper script.
3. Title: short. Message: one to three short lines. Identify what finished and which task it belongs to.
4. Do **not** include URLs, email addresses, contact names, file paths, document names, payment details, health information, credentials, or other sensitive details unless the user explicitly asked for that exact information in the push.
5. Priority: normal by default. Quiet only if requested. High only for a genuinely important alert. Never use repeating emergency priority unless the user explicitly requests an emergency alert.
6. Do not send routine progress pings unless the user explicitly asked for them.

## Success and failure

- Treat the send as successful only when Pushover JSON contains `"status":1`. Keep the request ID for troubleshooting without exposing credentials.
- If `"status":0`, report the API errors in chat.
- If the request fails, report the failure in chat and never claim the notification was sent.

## First-time setup

If credentials are missing, guide the user one step at a time:

1. Install Pushover: iOS https://pushover.net/clients/ios or Android https://pushover.net/clients/android
2. Open the app, register the phone, allow notifications.
3. Copy the User Key from https://pushover.net/dashboard
4. Create an application at https://pushover.net/apps/build (name can be `Cursor LMK`) and copy the API token.
5. Ask for the User Key and API token. Write them only to `~/.config/lmk/pushover.env` with mode `600`.
6. Ask permission before sending a test titled `LMK setup complete`. Send the test only after approval.
---
