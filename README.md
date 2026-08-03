# Kept

Kept is a warm-accountability habit tracker for building habits and leaving old ones behind. It supports a local preview adapter for development and a hosted Supabase adapter for real accounts, cross-device persistence, Row Level Security, scheduled Web Push reminders, and Resend email delivery.

## Run locally

Requirements match the other projects in `/Users/mac/Developer`:

- Node 24
- npm 11+

```bash
npm install
npm run dev
```

Open the URL printed by Vite. The sign-in screen is intentionally realistic, but it does not send email in local mode:

1. Use any valid-looking email address.
2. Continue to the verification screen.
3. Click the displayed local preview code, `202626`, to fill it.
4. Verify to enter a seeded workspace.

Each new local email receives its own sample habits and history. Data stays in that browser under `kept_local_database_v1`.

To run against Supabase, copy `.env.example` to `.env.local`, set `VITE_DATA_PROVIDER=supabase`, and provide the three public Supabase/VAPID values. Apply the migration in `supabase/migrations` first.

## Useful scripts

```bash
npm run dev       # local development server
npm run build     # production build used for PWA testing
npm run preview   # serve the production build locally
npm run lint      # ESLint
npm test          # scheduling and local-adapter tests
```

Use `npm run build && npm run preview` when testing installation, the service worker, offline shell, and PWA icons. The regular Vite development server intentionally does not register the service worker so it cannot cache stale development files.

## Architecture

- `src/app/api/adapters/localAdapter.js` provides seeded, browser-only preview data.
- `src/app/api/adapters/supabaseAdapter.js` provides hosted Auth, database, export, and push-subscription persistence.
- `src/app/api/habitApi.js` selects the active data provider.
- `src/app/hooks/useHabitData.js` contains TanStack Query queries and mutations used by the screens.
- `src/app/utils/habitUtils.js` owns recurrence, state, streak, consistency, and milestone calculations.
- `src/app/pages` and `src/app/components` follow the colocated JSX/CSS structure used in Roadkit.
- `public/manifest.webmanifest` and `public/sw.js` provide the installable PWA shell and Web Push handler.
- `server/runReminders.js` is the Render cron entrypoint for push and email fallback delivery.
- `supabase/migrations` owns the production schema, RLS policies, indexes, triggers, and transactional habit creation function.

Screens never read persistence directly. Both adapters preserve the same components, query keys, mutations, and interaction patterns.

## Local test checklist

- Complete and undo a binary habit from Today.
- Increment a quantity habit past its target.
- Record “Stayed on track” and a lapse on the quit habit.
- Inspect the combined calendar and filter it to one habit.
- Edit a past date from an individual habit’s history.
- Create daily, every-two-days, weekly, twice-daily, and monthly habits.
- Pause/resume and archive/restore a habit.
- Add count and streak milestones.
- Export or reset sample data from Settings.
- Run the production preview and test browser notification permission and installation.

## Hosted architecture

- Supabase Auth email OTP, with Resend as custom SMTP.
- Supabase Postgres with RLS for profiles, habits, schedules, check-ins, milestones, and push subscriptions.
- A Node.js cron service on Render for reminder scheduling, Web Push, and Resend fallback delivery.
- Vercel for the Vite frontend.

See `docs/HOSTING.md` for the deployment and acceptance checklist. Do not place service-role, Resend, or VAPID private keys in Vite environment variables.
