# XORTRON Operational Interface

This repository contains the XORTRON site as a React application in the
existing web project, including the public landing page, account screens,
email/password authentication, and restricted admin console.

## Open or hand off the source

1. Open the repository folder (or extract a source archive received from your coding agent).
2. Open the project folder, not an individual HTML file.
3. Install Node.js 20.19+ or 22.12+, then enable pnpm with
   `corepack enable`.
4. In the project folder, run `pnpm install`.
5. Start the app:
   - macOS/Linux: `pnpm dev`
   - Windows PowerShell: `$env:NODE_ENV='development'; pnpm exec tsx watch server/_core/index.ts`
6. Open the local URL printed by the server, normally `http://localhost:3000`.

To run the production build, use `pnpm build`. Start its server with
`pnpm start` on macOS/Linux, or in Windows PowerShell run
`$env:NODE_ENV='production'; pnpm exec node dist/index.js`.

## Configuration and services

`.env.example` lists environment-variable names used by the existing app; it
contains no credentials. Copy it to `.env` and fill in values from your own
deployment/provider only when enabling those integrations. Never share or
upload a populated `.env` file.

Database-backed features require a MySQL-compatible `DATABASE_URL`. Login
requires the app ID, OAuth server URL, and the provider's corresponding OAuth
configuration. Set `OWNER_EMAIL` to the owner's email as returned by the
trusted OAuth provider, or set the stable `OWNER_OPEN_ID`, to grant admin
access after that account signs in. Do not send passwords through chat or
commit them to source control. OAuth sign-in also requires `VITE_APP_ID` and
`VITE_OAUTH_PORTAL_URL`; the owner can then sign in at `/admin`. Storage, maps,
and other Forge-backed integrations need the matching provider URL and API key.
These values are not included in the source package,
so those integrations will not work until configured.

Email/password sign-up requires `RESEND_API_KEY`, a verified `EMAIL_FROM`
sender, `APP_BASE_URL`, `DATABASE_URL`, and a random `JWT_SECRET` of at least
32 characters. The app sends 24-hour verification links and one-hour password
reset links; both are single-use. No authenticated session is issued until
email verification succeeds. Keep every populated `.env` file private.
After configuring `DATABASE_URL`, apply migrations with `pnpm db:push`.

Start at `/auth?mode=signup` to register, `/auth?mode=signin` to log in, or
`/admin` for the owner console. When provider settings are not present, the
public UI remains browsable and identifies sign-up as unavailable.

The `/admin` console is restricted on the server to administrator accounts.
It can review membership requests and publish, edit, or remove daily updates.

The landing page includes the official YouTube, WhatsApp, X, Threads, and
email links, plus the configured manual payment details. The contact form
validates fields and opens the visitor's email client with a prepared message;
it does not silently claim server-side delivery or persist messages.

Membership buttons are functional: signed-in users can submit standard or VIP
requests, and administrators can approve or reject them in `/admin`. Payment
verification remains a manual admin step; no automatic payment charge or
payment-provider integration is claimed.

## Checks

Run `pnpm check`, `pnpm test`, and `pnpm build` after installing dependencies.
