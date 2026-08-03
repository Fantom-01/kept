# Kept local acceptance pass

Run this checklist before replacing the local adapter with Supabase.

## Authentication and persistence

- Sign in with a new email and the displayed development code.
- Refresh the page and confirm the session and seeded habits remain.
- Sign out, sign back in, and confirm the same local data returns.
- Use a second email and confirm it receives a separate workspace.

## Habit creation

- Create a binary daily habit.
- Create an every-two-days habit and verify alternating calendar days.
- Create a Tuesday/Thursday weekly habit.
- Create a twice-daily habit with two time slots.
- Create a monthly day-31 habit and inspect a shorter month.
- Create a quantity habit and a quit habit.

## Check-ins and corrections

- Complete a binary habit and use Undo from the toast.
- Increment and decrement a quantity habit.
- Record a quit habit as on track.
- Record a lapse and confirm the copy remains supportive.
- Leave a past quit-habit day empty and confirm it reads “Unconfirmed,” not “Lapse.”
- Edit an old check-in and confirm streak, consistency, calendar, and milestone progress update.

## Lifecycle and milestones

- Pause and resume a habit; paused dates should not become missed dates.
- Archive and restore a habit; historical check-ins should remain.
- Add count and streak milestones with rewards and consequences.
- Verify achieved, active, and missed milestone treatments.

## Responsive PWA pass

- Review Today, Calendar, Progress, Habit, and Settings on desktop and a narrow mobile viewport.
- Run `npm run build && npm run preview`.
- Install the app through the browser or Add to Home Screen.
- Deny and then allow notifications in separate browser profiles if possible.
- Send a local test notification from Settings.
- Load the production preview once, go offline, and confirm the cached shell opens.
