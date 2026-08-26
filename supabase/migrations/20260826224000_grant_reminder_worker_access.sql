-- The reminder worker uses the server-only service role through PostgREST.
-- RLS bypass does not replace the underlying table privileges, so grant only
-- the operations needed to discover, deliver, and de-duplicate reminders.
grant usage on schema public to service_role;

grant select on public.profiles to service_role;
grant select on public.habits to service_role;
grant select on public.check_ins to service_role;
grant select, delete on public.push_subscriptions to service_role;
grant select, insert on public.notification_deliveries to service_role;
