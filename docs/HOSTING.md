# Kept hosting runbook

Kept has four hosted pieces:

1. Supabase owns passwordless authentication and the private database.
2. Resend delivers the Supabase sign-in code and optional reminder emails.
3. Vercel serves the React PWA.
4. Supabase Cron invokes a protected Edge Function that sends Web Push reminders and email fallbacks.

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

## Supabase Cron reminder job

The `send-reminders` Edge Function runs from Supabase Cron every five minutes. Its server-only secrets are `APP_URL`, `REMINDER_WORKER_SECRET`, `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL`. Supabase injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically. Store the same `REMINDER_WORKER_SECRET` in Supabase Vault and send it to the function as `x-kept-worker-key`; never expose it in the browser or repository.

The function accepts reminders up to 20 minutes late and deduplicates successful deliveries in `notification_deliveries`. Cron run history is available in `cron.job_run_details`, and Edge Function execution logs are available in the Supabase Dashboard.

Managed Supabase projects can occasionally return `PGRST303: JWT issued at future` when the gateway and PostgREST clocks briefly disagree. The worker retries only this specific transient response with bounded backoff; permissions, invalid credentials, and other permanent errors still fail immediately with the database phase included in the log.

The GitHub Actions workflow remains available through `workflow_dispatch` as a manual fallback only. Do not re-enable its scheduled trigger while Supabase Cron is active, because both workers could race to deliver the same reminder.

## Acceptance pass

- Request and verify a real email OTP.
- Create, edit, pause, archive, and restore a habit.
- Save and clear build, count, sober, and lapse check-ins.
- Sign out and back in on another browser and confirm the same record appears.
- Enable notifications in the installed PWA and confirm `push_subscriptions` receives one row.
- Temporarily set a habit reminder a few minutes ahead, confirm the Supabase Cron job invokes `send-reminders`, and verify exactly one push or fallback email arrives.
- Confirm a second account cannot read or mutate the first account's rows.
