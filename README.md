# Für Frau Inge · Eine kleine Geburtstagsmission

A German-language birthday questionnaire built with **React, TypeScript and Vite**, with a small **Cloudflare Pages Function + D1** backend for receiving wishes. Warm stationery styling, animated cards, locally bundled fonts and CSS gift artwork.

## Run locally

Use Node.js 22.12 or newer (Node 22 LTS recommended).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite.

```sh
npm test        # Question configuration and summary checks
npm run build  # Strict TypeScript check and production build
npm run preview
npm run test:mobile # Six browser viewport checks (requires Google Chrome)
```

`npm run dev` previews the frontend. Use the full local setup below to test sending wishes.

### Local database and submissions

Copy `.dev.vars.example` to `.dev.vars`, generate a token with `openssl rand -hex 32`, and set `INVITE_TOKEN` to that value. `.dev.vars` is ignored by Git. Never put this secret in a `VITE_` environment variable.

```sh
npm run db:migrate:local
npm run dev:full
```

Open `http://127.0.0.1:8788/#invite=YOUR_LOCAL_TOKEN`. The fragment is read locally, removed from the address bar, and retained in tab session storage. It is sent to the API in a request header only when Frau Inge presses the send button. Do not share your production invitation key with anyone except the intended recipient.

```sh
npm run db:results:local
```

With `npm run dev:full` running, `npm run test:api:local` checks real submissions through the mobile UI. It writes clearly marked synthetic results to the local database only. `npm run test:mobile` skips that optional integration check and tests the responsive frontend.

These commands use a local D1 emulator. No Cloudflare account or remote database is required. The placeholder database ID in `wrangler.jsonc` is deliberately local-only and must be replaced before deployment.

## Add your questions

Edit `src/questions.ts`. Each question has a stable, unique `id`, category, title, description and two or more options. Each option needs a unique `id` within that question. Progress, navigation and the summary adapt to the number of questions automatically.

The fitness question comes from the original brief. The other two questions are examples to replace or extend. Questions currently use single-choice answers. The result presents Frau Inge’s actual answers without inferring product recommendations.

```ts
{
  id: 'garden',
  category: 'Im Grünen',
  title: 'Darf es etwas für den Garten sein?',
  description: 'Ein kleiner Hinweis für die nächste Geschenkidee.',
  options: [
    { id: 'yes', emoji: '🌷', label: 'Sehr gern!', description: 'Im Garten bin ich glücklich.' },
    { id: 'no', emoji: '☕', label: 'Lieber etwas anderes.', description: 'Ich genieße lieber die Aussicht.' },
  ],
  aside: { emoji: '🐝', headline: 'Bin kurz im Garten.', caption: 'Komme irgendwann wieder.' },
}
```

### Meme pictures

The starter uses emoji reaction cards. To add your own picture, put a licensed or personal image in `public/memes/` and add this optional property to a question:

```ts
meme: {
  src: '/memes/garden.webp',
  alt: 'Eine Katze schläft neben einer Gießkanne',
  caption: 'Gartenarbeit erledigt. Also fast.',
},
```

Images and fonts are served locally. The production Content Security Policy permits local images only.

## Structure

- `src/App.tsx`: introduction, invitation, question cards and editable summary.
- `src/questions.ts`: typed content and plain-text summary generation.
- `src/styles.css`: responsive layout and reduced-motion-aware animation.
- `src/theme.css`: shared color variables.
- `src/mobile.css`: readable phone typography, larger tap targets, compact meme panels and safe-area spacing.
- `src/draft.ts`: validated, versioned tab-session drafts; no localStorage.
- `src/SubmitWishes.tsx`: explicit submission, retry, and confirmed-save states.
- `functions/api/wishes.ts`: write-only endpoint, invitation validation and prepared database statements.
- `migrations/0001_wishes.sql`: one result per invitation, with a readable summary.
- `public/_headers`: security headers for Cloudflare Pages.

Native radio inputs provide keyboard navigation. Navigation moves focus to the new heading and scrolls back to the card. Answers, notes, current step and confirmed-save status survive reloads in the same browser tab through sessionStorage. Drafts older than 24 hours are discarded on the next load. The questionnaire still works in memory if storage is blocked. Browsers may restore session storage when restoring closed tabs; this is not a guaranteed secure-erasure mechanism.

Answers are sent only after pressing **Wünsche senden**. Success appears only after the API acknowledges a database write. Retries and later edits replace the same invitation’s result; they do not create duplicate rows. The app stores a snapshot of the readable summary so it remains meaningful if question wording changes later. The final screen uses direct submission only; without an invitation, it explains how to request the personal link.

## Host on Cloudflare Pages later

| Setting | Value |
| --- | --- |
| Framework preset | React (Vite) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | `22` |

Connect the repository in Cloudflare Pages with these settings. The root `functions/` directory is part of the deployment; uploading only `dist` through the dashboard will not deploy this backend. For CLI deployment use `npx wrangler pages deploy dist` from the project root.

Before deploying:

1. Create a D1 database with an EU jurisdiction: `npx wrangler d1 create inge-wishes --jurisdiction=eu`.
2. Put its real database ID in `wrangler.jsonc`. Keep the `DB` binding name. Use a separate database and invitation token for any shared preview environment.
3. Apply the production migration: `npx wrangler d1 migrations apply inge-wishes --remote`.
4. Generate a fresh 64-character hex token and add it as the **INVITE_TOKEN** runtime secret in the Pages project. Do not reuse a test token or commit it to Git.
5. Deploy, then send Frau Inge `https://YOUR_SITE/#invite=YOUR_PRODUCTION_TOKEN` privately.

No remote database has been created or connected by this implementation, and no deployment has been performed.

### See Frau Inge’s results

Sign in to your Cloudflare account, open **D1 → inge-wishes → Console**, and run:

```sql
SELECT summary, updated_at FROM wishes ORDER BY updated_at DESC;
```

Only your authenticated Cloudflare account has this read path; the app provides no public results API. Anyone holding the invitation link can submit or replace that invitation’s result, so keep it private. This is a personal invitation, not proof of the respondent’s identity.

After the birthday, remove the invitation secret to stop submissions. Delete stored wishes when no longer needed, or when requested, through the D1 console. For example, inspect and then delete a specific row using its `invitation_id`. Database backups and provider logs have their own retention settings; this implementation does not schedule automatic deletion.

[Official Cloudflare guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/)
[D1 bindings](https://developers.cloudflare.com/pages/functions/bindings/) · [D1 EU jurisdiction](https://developers.cloudflare.com/d1/configuration/data-location/)

## Data handling

Unsent answers stay in tab session storage. Explicitly submitted answer IDs, optional free text, a readable summary, an invitation hash and an update timestamp are stored in D1. The app does not record IP addresses, collect health measurements, use analytics, load external fonts or run an AI model. The hosting provider still handles HTTP requests and may retain its own logs. The in-app notice describes the submission and asks Frau Inge to contact the inviter for deletion. Hosting privacy information, the responsible person’s details and retention arrangements must reflect the actual deployment. EU D1 storage alone is not a claim that the whole service meets every GDPR requirement.
