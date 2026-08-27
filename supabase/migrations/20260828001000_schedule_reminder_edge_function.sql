create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- The values are configured out-of-band so deployment credentials never enter
-- source control. Create these Vault secrets before relying on the schedule:
--   kept_project_url
--   kept_reminder_worker_secret
select cron.unschedule(jobid)
from cron.job
where jobname = 'kept-send-reminders';

select cron.schedule(
	'kept-send-reminders',
	'*/5 * * * *',
	$$
	select net.http_post(
		url := (
			select decrypted_secret
			from vault.decrypted_secrets
			where name = 'kept_project_url'
		) || '/functions/v1/send-reminders',
		headers := jsonb_build_object(
			'Content-Type', 'application/json',
			'x-kept-worker-key', (
				select decrypted_secret
				from vault.decrypted_secrets
				where name = 'kept_reminder_worker_secret'
			)
		),
		body := jsonb_build_object('scheduled_at', now()),
		timeout_milliseconds := 100000
	) as request_id;
	$$
);
