# Kept hosting runbook

Kept has four hosted pieces:

1. Supabase owns passwordless authentication and the private database.
2. Resend delivers the Supabase sign-in code and optional reminder emails.
3. Vercel serves the React PWA.
4. A Render cron job sends scheduled Web Push reminders and email fallbacks.

## Public frontend variables

Set these in Vercel for Production, Preview, and Development:

```dotenv
VITE_DATA_PROVIDER=supabase
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_VAPID_PUBLIC_KEY=...
```

The publishable Supabase key and VAPID public key are safe to expose in the browser. Never add the Supabase service-role key, Resend API key, or VAPID private key to a `VITE_` variable.

## Supabase

- Create a project, link this repository, and apply the migration in `supabase/migrations`.
- In Authentication → URL Configuration, set the Site URL to the Vercel production URL and allow the Vercel preview pattern while testing.
- Set **Email OTP length** to `6` in Authentication → Sign In / Providers → Email.
- Replace the Magic Link email template with `supabase/templates/magic_link.html` and the Confirm sign up template with `supabase/templates/confirmation.html`. Both use `{{ .Token }}`, so new and returning users receive the same six-digit code expected by the app.
- Connect Resend as the Supabase email provider after its sending domain is verified.

## Render reminder job

Create a Blueprint from `render.yaml` and provide every secret marked `sync: false`. The cron job runs every minute but deduplicates successful deliveries in `notification_deliveries`. Render cron jobs have a minimum monthly charge.

## Acceptance pass

- Request and verify a real email OTP.
- Create, edit, pause, archive, and restore a habit.
- Save and clear build, count, sober, and lapse check-ins.
- Sign out and back in on another browser and confirm the same record appears.
- Enable notifications in the installed PWA and confirm `push_subscriptions` receives one row.
- Temporarily set a habit reminder a few minutes ahead, trigger the Render job, and confirm exactly one push or fallback email arrives.
- Confirm a second account cannot read or mutate the first account's rows.
