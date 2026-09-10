# Für Frau Inge · Eine kleine Geburtstagsmission

A German-language birthday questionnaire built with **React, TypeScript and Vite**, with a small **Cloudflare Worker + D1** backend for receiving wishes. Warm stationery styling, animated cards, locally bundled fonts and CSS gift artwork.

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
npm run deploy:check # Bundle the Worker without uploading or deploying
```

`npm run dev` previews the frontend. Use the full local setup below to test sending wishes.

### Local database and submissions

No invitation token is required. Use the local D1 emulator:

```sh
npm run db:migrate:local
npm run dev:full
```

Open `http://127.0.0.1:8788/`. The initial send button opens the visit invitation. Only **Jetzt alles abschicken!** sends answers, the visit choice and interaction history to the API.

```sh
npm run db:results:local
```

With `npm run dev:full` running, `npm run test:api:local` checks real submissions through the mobile UI. It writes clearly marked synthetic results to the local database only. `npm run test:mobile` skips that optional integration check and tests the responsive frontend.

These commands use a local D1 emulator. No Cloudflare account or remote database is required. The database binding in `wrangler.jsonc` points to production; local commands still use the local D1 emulator unless `--remote` is passed.

## Add your questions

Edit `src/questions.ts`. Each question has a stable, unique `id`, category, title, description and two or more options. Each option needs a unique `id` within that question. Progress, navigation and the summary adapt to the number of questions automatically.

The current seven questions cover fitness, colours, seasons, small pleasures, gift preferences, gift value, and cleaning. Herbst currently triggers the shared-preference card as an example; change the season question’s `reaction.optionId` when the inviter confirms their favourite. The reusable `SelectionReaction` component reads its copy from the question configuration. Most questions use single-choice answers; shared time permits one additional gift preference. The result presents Frau Inge’s actual answers without inferring product recommendations.

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
- `worker/index.ts`: Worker entry point; routes API requests and serves frontend assets.
- `worker/wishes.ts`: write-only endpoint, validated submissions, hashed browser submission keys, and prepared database statements.
- `migrations/`: result storage and the additive interaction-history migration.
- `public/_headers`: security headers for Cloudflare static assets.

Native radio inputs provide keyboard navigation. Navigation moves focus to the new heading and scrolls back to the card. Answers, notes, current step and confirmed-save status survive reloads in the same browser tab through sessionStorage. Drafts older than 24 hours are discarded on the next load. The questionnaire still works in memory if storage is blocked. Browsers may restore session storage when restoring closed tabs; this is not a guaranteed secure-erasure mechanism.

Answers are sent only after **Jetzt alles abschicken!** in the finale. Success appears only after the API acknowledges a database write. A random key in tab session storage makes retries and later edits update the same row. Different browser keys cannot overwrite each other's results. No invitation link is required; the endpoint accepts completed public submissions and is not proof of respondent identity.

The local draft also records timestamped page displays, option activations (including repeat taps), answer changes, popup opens/closes, and finale actions. The event sequence survives reloads in the same tab. No keystroke contents, pointer coordinates, IP addresses, or device fingerprints are collected. The free-text field is saved only as its final submitted value. Repeated displays are recorded independently; React StrictMode does not duplicate them. Displays in hidden tabs wait until the tab becomes visible. Displayed does not mean demonstrably read.

A maximum of 2,000 events is retained per draft; any excess is explicitly reported as an omitted count. Requests are limited to 512 KiB. This is a bounded local interaction history, uploaded with the final submission, not a live analytics stream. An abandoned form sends nothing.

## Deploy with Cloudflare Workers Builds

Live app: https://wunsch.app-pilot.workers.dev

The public URL is ready to share without a token. Older invitation-based clients remain compatible, but new clients use their own random submission keys.

For subsequent local deployments: `npm run build && npx wrangler deploy --env-file .env.cloudflare.local`.

| Setting        | Value                 |
| -------------- | --------------------- |
| Build command  | `npm run build`       |
| Deploy command | `npx wrangler deploy` |
| Root directory | Repository root       |
| Node version   | `22`                  |

Connect the repository to your existing Cloudflare Worker with these settings. `wrangler.jsonc` specifies both `worker/index.ts` and the built frontend in `dist`. API routes run through the Worker before static assets; other requests use Cloudflare’s asset serving. The Worker `name` in `wrangler.jsonc` must match the project name in the Cloudflare dashboard.

The project was initially configured for Pages. A Workers Build running `npx wrangler deploy` against `pages_build_output_dir` fails with **Missing entry-point to Worker script or to assets directory**. The configuration now targets Workers directly. Deploying only `dist` as static assets would omit the answer-saving API.

Production migration 0002 was applied and verified on 9 September 2026. For a fresh database, or to apply future pending migrations, run the migration command before deploying (already-applied migrations are skipped):

```sh
npx wrangler d1 migrations apply inge-wishes --remote --env-file .env.cloudflare.local
npm run build
npx wrangler deploy --env-file .env.cloudflare.local
```

`wrangler.jsonc` binds `DB` to `inge-wishes` (`78d1b51a-0eed-4a9d-8922-a170bd84c768`). Account selection is in the Git-ignored `.env.cloudflare.local`. The migration adds two nullable columns and preserves existing rows. Apply it **before** deploying: the new save statement requires those columns. The production migration was applied with user authorization; deployment remains a manual step. No wish entries were deleted.

The initial production schema check identified missing migration 0002 as the submission blocker. After applying it, a second read-only check confirmed both interaction-history columns are present. See [SECURITY_REVIEW.md](SECURITY_REVIEW.md) for the confirmed submission failure, fixes, validation and release steps. Database jurisdiction and account-wide settings are separate deployment checks.

### See Frau Inge’s results

Sign in to your Cloudflare account, open **D1 → inge-wishes → Console**, and run:

```sql
SELECT summary, interaction_summary, updated_at FROM wishes ORDER BY updated_at DESC;
```

Only your authenticated Cloudflare account has this read path; the app provides no public results API.

- `answers_json`: German questions, final answers and popup summaries.
- `summary`: readable answer/visit summary.
- `interaction_log_json`: each event in order, browser UTC time, action, readable target, input method when available, and answer state after a change.
- `interaction_summary`: the same history as readable text. This is the authoritative record of repeated popup openings and changed finale choices.
- `updated_at`: server timestamp of the acknowledged save.

Older rows have no event history; none is inferred or backfilled. Failed sends can be retried with the same key. All answers and the history update in one SQL statement.

Delete stored wishes when no longer needed through the D1 console. Backups and provider logs have their own retention settings. No automatic deletion is configured.

[Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
[Migration from Pages](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/) · [D1 EU jurisdiction](https://developers.cloudflare.com/d1/configuration/data-location/)

## Data handling

Unsent answers and interaction history stay in tab session storage. The privacy details in the app explain that the final send also includes the selection/popup history. Submitted answers, optional free text, visit choice, readable summaries, interaction history, a hashed browser key and an update timestamp are stored in D1. No external analytics, fonts, or AI models are used. The hosting provider handles HTTP requests and may retain its own logs. This implementation does not claim overall GDPR compliance based on the database location alone.

## Submission protection

The Worker requires the two rate-limit bindings in `wrangler.jsonc`: 10 attempts per browser submission key per 60 seconds and a shared 60-attempt budget. Missing or unavailable limiters fail closed; HTTP 429 includes a 60-second retry hint. These are approximate Cloudflare-location limits, not a strict worldwide quota or proof of respondent identity. Neither limiter stores IP addresses in D1.

The development-tool dependency `sharp` is pinned to 0.35.4 through `overrides` to fix GHSA-rgj7-g3m4-5g8c. Keep the override until the upstream dependency chain includes a patched version, and verify with `npm audit` before removing it.
