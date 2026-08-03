create extension if not exists pgcrypto;

create table public.profiles (
	user_id uuid primary key references auth.users(id) on delete cascade,
	email text not null,
	name text not null default 'Friend' check (char_length(name) between 1 and 80),
	timezone text not null default 'UTC' check (char_length(timezone) between 1 and 80),
	notification_privacy text not null default 'habit-name' check (notification_privacy in ('habit-name', 'private')),
	email_fallback boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.habits (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	name text not null check (char_length(name) between 2 and 120),
	description text not null default '' check (char_length(description) <= 1000),
	mode text not null check (mode in ('build', 'quit')),
	metric_type text not null check (metric_type in ('binary', 'count')),
	target_value numeric not null default 1 check (target_value > 0),
	unit text not null default 'times' check (char_length(unit) between 1 and 40),
	color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
	icon text not null check (char_length(icon) between 1 and 40),
	start_date date not null,
	schedule jsonb not null check (jsonb_typeof(schedule) = 'object'),
	reminders jsonb not null default '{"enabled": false, "emailFallback": false, "privateCopy": false}'::jsonb check (jsonb_typeof(reminders) = 'object'),
	pauses jsonb not null default '[]'::jsonb check (jsonb_typeof(pauses) = 'array'),
	paused_at date,
	archived_at date,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (id, user_id)
);

create index habits_user_created_idx on public.habits (user_id, created_at);
create index habits_reminders_idx on public.habits using gin (reminders);

create table public.check_ins (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	habit_id uuid not null,
	date_key date not null,
	slot text not null check (char_length(slot) between 1 and 20),
	status text not null check (status in ('completed', 'partial', 'sober', 'lapse')),
	value numeric not null default 0 check (value >= 0),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	foreign key (habit_id, user_id) references public.habits(id, user_id) on delete cascade,
	unique (user_id, habit_id, date_key, slot)
);

create index check_ins_user_date_idx on public.check_ins (user_id, date_key desc);
create index check_ins_habit_date_idx on public.check_ins (habit_id, date_key desc);

create table public.milestones (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	habit_id uuid not null,
	type text not null check (type in ('count', 'streak')),
	target_value numeric not null check (target_value > 0),
	due_date date not null,
	reward_text text not null default '' check (char_length(reward_text) <= 500),
	consequence_text text not null default '' check (char_length(consequence_text) <= 500),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	foreign key (habit_id, user_id) references public.habits(id, user_id) on delete cascade
);

create index milestones_user_due_idx on public.milestones (user_id, due_date);
create index milestones_habit_idx on public.milestones (habit_id);

create table public.push_subscriptions (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	endpoint text not null unique,
	expiration_time bigint,
	p256dh text not null,
	auth text not null,
	user_agent text not null default '',
	created_at timestamptz not null default now(),
	last_seen_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create table public.notification_deliveries (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	habit_id uuid not null,
	date_key date not null,
	slot text not null,
	channel text not null check (channel in ('push', 'email')),
	delivered_at timestamptz not null default now(),
	foreign key (habit_id, user_id) references public.habits(id, user_id) on delete cascade,
	unique (user_id, habit_id, date_key, slot, channel)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create trigger habits_set_updated_at before update on public.habits
for each row execute function public.set_updated_at();

create trigger check_ins_set_updated_at before update on public.check_ins
for each row execute function public.set_updated_at();

create trigger milestones_set_updated_at before update on public.milestones
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
	insert into public.profiles (user_id, email, name, timezone)
	values (
		new.id,
		coalesce(new.email, ''),
		coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Friend'),
		coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'UTC')
	)
	on conflict (user_id) do update set email = excluded.email;
	return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create trigger on_auth_user_email_changed
after update of email on auth.users
for each row when (old.email is distinct from new.email)
execute function public.handle_new_user();

insert into public.profiles (user_id, email, name, timezone)
select
	id,
	coalesce(email, ''),
	coalesce(nullif(raw_user_meta_data ->> 'name', ''), nullif(split_part(coalesce(email, ''), '@', 1), ''), 'Friend'),
	coalesce(nullif(raw_user_meta_data ->> 'timezone', ''), 'UTC')
from auth.users
on conflict (user_id) do nothing;

create or replace function public.create_habit_with_milestone(
	habit_input jsonb,
	milestone_input jsonb default null
)
returns public.habits
language plpgsql
security invoker
set search_path = ''
as $$
declare
	created_habit public.habits;
	owner_id uuid := (select auth.uid());
begin
	if owner_id is null then
		raise exception 'Authentication required' using errcode = '42501';
	end if;

	insert into public.habits (
		user_id, name, description, mode, metric_type, target_value, unit,
		color, icon, start_date, schedule, reminders, pauses, paused_at, archived_at
	)
	values (
		owner_id,
		habit_input ->> 'name',
		coalesce(habit_input ->> 'description', ''),
		habit_input ->> 'mode',
		habit_input ->> 'metric_type',
		(habit_input ->> 'target_value')::numeric,
		habit_input ->> 'unit',
		habit_input ->> 'color',
		habit_input ->> 'icon',
		(habit_input ->> 'start_date')::date,
		habit_input -> 'schedule',
		coalesce(habit_input -> 'reminders', '{"enabled": false}'::jsonb),
		coalesce(habit_input -> 'pauses', '[]'::jsonb),
		nullif(habit_input ->> 'paused_at', '')::date,
		nullif(habit_input ->> 'archived_at', '')::date
	)
	returning * into created_habit;

	if milestone_input is not null and jsonb_typeof(milestone_input) = 'object' then
		insert into public.milestones (
			user_id, habit_id, type, target_value, due_date, reward_text, consequence_text
		)
		values (
			owner_id,
			created_habit.id,
			milestone_input ->> 'type',
			(milestone_input ->> 'target_value')::numeric,
			(milestone_input ->> 'due_date')::date,
			coalesce(milestone_input ->> 'reward_text', ''),
			coalesce(milestone_input ->> 'consequence_text', '')
		);
	end if;

	return created_habit;
end;
$$;

alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.check_ins enable row level security;
alter table public.milestones enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_deliveries enable row level security;

create policy profiles_owner on public.profiles
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy habits_owner on public.habits
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy check_ins_owner on public.check_ins
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy milestones_owner on public.milestones
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy push_subscriptions_owner on public.push_subscriptions
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.habits to authenticated;
grant select, insert, update, delete on public.check_ins to authenticated;
grant select, insert, update, delete on public.milestones to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
revoke all on public.notification_deliveries from anon, authenticated;

revoke all on function public.create_habit_with_milestone(jsonb, jsonb) from public, anon;
grant execute on function public.create_habit_with_milestone(jsonb, jsonb) to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
