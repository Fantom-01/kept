/* global Deno */
import { createClient } from "npm:@supabase/supabase-js@2.112.0";
import { Resend } from "npm:resend@6.18.1";
import webpush from "npm:web-push@3.6.7";

const DAY_MS = 86_400_000;
const CLOCK_SKEW_DELAYS = [5_000, 20_000, 60_000];

function required(name) {
	const value = Deno.env.get(name);
	if (!value) throw new Error(`Missing required environment variable: ${name}`);
	return value;
}

function safeEqual(left, right) {
	if (!left || !right || left.length !== right.length) return false;
	let difference = 0;
	for (let index = 0; index < left.length; index += 1) {
		difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
	}
	return difference === 0;
}

function jsonResponse(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json; charset=utf-8" },
	});
}

function dateNumber(dateKey) {
	const [year, month, day] = dateKey.split("-").map(Number);
	return Date.UTC(year, month - 1, day);
}

function daysBetween(startKey, endKey) {
	return Math.round((dateNumber(endKey) - dateNumber(startKey)) / DAY_MS);
}

function monthsBetween(startKey, endKey) {
	const [startYear, startMonth] = startKey.split("-").map(Number);
	const [endYear, endMonth] = endKey.split("-").map(Number);
	return (endYear - startYear) * 12 + endMonth - startMonth;
}

function weekday(dateKey) {
	return new Date(`${dateKey}T12:00:00Z`).getUTCDay();
}

function mondayKey(dateKey) {
	const date = new Date(`${dateKey}T12:00:00Z`);
	const day = date.getUTCDay();
	date.setUTCDate(date.getUTCDate() + (day === 0 ? -6 : 1 - day));
	return date.toISOString().slice(0, 10);
}

function lastDayOfMonth(dateKey) {
	const [year, month] = dateKey.split("-").map(Number);
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function localClock(now, timezone) {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat("en-CA", {
			timeZone: timezone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hourCycle: "h23",
		}).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
	);
	return {
		dateKey: `${parts.year}-${parts.month}-${parts.day}`,
		hour: Number(parts.hour),
		minute: Number(parts.minute),
	};
}

function isScheduledOnDate(habit, dateKey) {
	if (!habit || dateKey < habit.start_date) return false;
	if (habit.archived_at && dateKey > habit.archived_at) return false;
	if ((habit.pauses || []).some((pause) => dateKey >= pause.startDate && (!pause.endDate || dateKey <= pause.endDate))) return false;
	if (habit.paused_at && !(habit.pauses || []).length && dateKey >= habit.paused_at) return false;

	const schedule = habit.schedule || {};
	const interval = Math.max(Number(schedule.interval) || 1, 1);
	if (schedule.cadence === "daily") return daysBetween(habit.start_date, dateKey) % interval === 0;

	if (schedule.cadence === "weekly") {
		const weekDistance = Math.floor(daysBetween(mondayKey(habit.start_date), mondayKey(dateKey)) / 7);
		return weekDistance >= 0 && weekDistance % interval === 0 && (schedule.weekdays || []).includes(weekday(dateKey));
	}

	if (schedule.cadence === "monthly") {
		const distance = monthsBetween(habit.start_date, dateKey);
		const day = Number(dateKey.slice(-2));
		const target = Math.min(Number(schedule.monthDay) || 1, lastDayOfMonth(dateKey));
		return distance >= 0 && distance % interval === 0 && day === target;
	}

	return false;
}

function dueReminders(habit, now, timezone, windowMinutes = 20) {
	const clock = localClock(now, timezone);
	if (!isScheduledOnDate(habit, clock.dateKey)) return [];
	const currentMinute = clock.hour * 60 + clock.minute;
	return (habit.schedule?.times || ["anytime"])
		.filter((slot) => /^\d{2}:\d{2}$/.test(slot))
		.filter((slot) => {
			const [hour, minute] = slot.split(":").map(Number);
			const elapsed = currentMinute - (hour * 60 + minute);
			return elapsed >= 0 && elapsed <= windowMinutes;
		})
		.map((slot) => ({ habit, dateKey: clock.dateKey, slot }));
}

function isClockSkewError(error) {
	return /JWT issued at future/i.test(error?.message || "");
}

function errorSummary(error) {
	const code = error?.code ? ` [${error.code}]` : "";
	return `${error?.message || String(error)}${code}`;
}

async function runSupabaseQuery(label, operation) {
	for (let attempt = 0; attempt <= CLOCK_SKEW_DELAYS.length; attempt += 1) {
		let result;
		try {
			result = await operation();
		} catch (error) {
			if (!isClockSkewError(error) || attempt === CLOCK_SKEW_DELAYS.length) {
				throw new Error(`${label} failed after ${attempt + 1} ${attempt === 0 ? "attempt" : "attempts"}: ${errorSummary(error)}`);
			}
			await new Promise((resolve) => setTimeout(resolve, CLOCK_SKEW_DELAYS[attempt]));
			continue;
		}

		if (!result?.error) return result;
		if (!isClockSkewError(result.error) || attempt === CLOCK_SKEW_DELAYS.length) {
			throw new Error(`${label} failed after ${attempt + 1} ${attempt === 0 ? "attempt" : "attempts"}: ${errorSummary(result.error)}`);
		}
		await new Promise((resolve) => setTimeout(resolve, CLOCK_SKEW_DELAYS[attempt]));
	}
	throw new Error(`${label} failed unexpectedly.`);
}

function indexBy(rows, key) {
	return rows.reduce((map, row) => map.set(row[key], row), new Map());
}

function groupBy(rows, key) {
	return rows.reduce((map, row) => {
		const value = row[key];
		map.set(value, [...(map.get(value) || []), row]);
		return map;
	}, new Map());
}

function reminderCopy(habit, profile) {
	const privateCopy = habit.reminders?.privateCopy || profile.notification_privacy === "private";
	if (privateCopy) return { title: "A habit is waiting", body: "A small check-in keeps your record honest." };
	return {
		title: habit.name,
		body: habit.mode === "quit" ? "Take a breath and record how this period went." : "Your next check-in is ready when you are.",
	};
}

function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, (character) => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#039;",
	})[character]);
}

function deliveryKey(item, channel) {
	return `${item.habit.user_id}:${item.habit.id}:${item.dateKey}:${item.slot}:${channel}`;
}

async function recordDelivery(supabase, item, channel) {
	await runSupabaseQuery(`Record ${channel} delivery`, () => supabase.from("notification_deliveries").upsert({
		user_id: item.habit.user_id,
		habit_id: item.habit.id,
		date_key: item.dateKey,
		slot: item.slot,
		channel,
	}, { onConflict: "user_id,habit_id,date_key,slot,channel", ignoreDuplicates: true }));
}

async function sendPush({ supabase, subscriptions, item, profile, appUrl }) {
	const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
	const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
	if (!subscriptions.length || !publicKey || !privateKey) return false;
	const copy = reminderCopy(item.habit, profile);
	const payload = JSON.stringify({ ...copy, url: `${appUrl}/app/habits/${item.habit.id}` });
	let delivered = false;

	for (const subscription of subscriptions) {
		try {
			await webpush.sendNotification({
				endpoint: subscription.endpoint,
				expirationTime: subscription.expiration_time,
				keys: { p256dh: subscription.p256dh, auth: subscription.auth },
			}, payload, { TTL: 60 * 60 });
			delivered = true;
		} catch (error) {
			if (error.statusCode === 404 || error.statusCode === 410) {
				await runSupabaseQuery("Remove expired push subscription", () => supabase.from("push_subscriptions").delete().eq("id", subscription.id));
				continue;
			}
			console.error(`Push delivery failed for subscription ${subscription.id}: ${error.message}`);
		}
	}
	return delivered;
}

async function sendEmail({ resend, item, profile, appUrl }) {
	const from = Deno.env.get("RESEND_FROM_EMAIL");
	if (!resend || !profile.email || !from) return false;
	const copy = reminderCopy(item.habit, profile);
	const habitUrl = `${appUrl}/app/habits/${encodeURIComponent(item.habit.id)}`;
	const { error } = await resend.emails.send({
		from,
		to: [profile.email],
		subject: copy.title,
		html: `<div style="font-family:Arial,sans-serif;color:#20231f"><h1 style="font-size:24px">${escapeHtml(copy.title)}</h1><p>${escapeHtml(copy.body)}</p><p><a href="${habitUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#24694f;color:white;text-decoration:none">Open Kept</a></p></div>`,
		headers: { "Idempotency-Key": `reminder-${item.habit.id}-${item.dateKey}-${item.slot}` },
	});
	if (error) throw new Error(error.message);
	return true;
}

async function runReminders(now = new Date()) {
	const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
		auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
	});
	const appUrl = required("APP_URL").replace(/\/$/, "");
	const resendApiKey = Deno.env.get("RESEND_API_KEY");
	const resend = resendApiKey ? new Resend(resendApiKey) : null;

	if (Deno.env.get("VAPID_PUBLIC_KEY") && Deno.env.get("VAPID_PRIVATE_KEY")) {
		webpush.setVapidDetails(
			Deno.env.get("VAPID_SUBJECT") || "mailto:hello@kept.app",
			Deno.env.get("VAPID_PUBLIC_KEY"),
			Deno.env.get("VAPID_PRIVATE_KEY"),
		);
	}

	const [habitsResult, profilesResult, subscriptionsResult] = await Promise.all([
		runSupabaseQuery("Load reminder-enabled habits", () => supabase.from("habits").select("*").contains("reminders", { enabled: true })),
		runSupabaseQuery("Load reminder profiles", () => supabase.from("profiles").select("*")),
		runSupabaseQuery("Load push subscriptions", () => supabase.from("push_subscriptions").select("*")),
	]);

	const profiles = indexBy(profilesResult.data, "user_id");
	const subscriptions = groupBy(subscriptionsResult.data, "user_id");
	const candidates = habitsResult.data.flatMap((habit) => {
		const profile = profiles.get(habit.user_id);
		return profile ? dueReminders(habit, now, profile.timezone) : [];
	});
	if (!candidates.length) return { candidates: 0, delivered: 0 };

	const habitIds = [...new Set(candidates.map((item) => item.habit.id))];
	const dateKeys = [...new Set(candidates.map((item) => item.dateKey))];
	const [checkInsResult, deliveriesResult] = await Promise.all([
		runSupabaseQuery("Load completed check-ins", () => supabase.from("check_ins").select("habit_id,date_key,slot").in("habit_id", habitIds).in("date_key", dateKeys)),
		runSupabaseQuery("Load reminder deliveries", () => supabase.from("notification_deliveries").select("user_id,habit_id,date_key,slot,channel").in("habit_id", habitIds).in("date_key", dateKeys)),
	]);

	const completed = new Set(checkInsResult.data.map((row) => `${row.habit_id}:${row.date_key}:${row.slot}`));
	const deliveries = new Set(deliveriesResult.data.map((row) => `${row.user_id}:${row.habit_id}:${row.date_key}:${row.slot}:${row.channel}`));
	let delivered = 0;

	for (const item of candidates) {
		if (completed.has(`${item.habit.id}:${item.dateKey}:${item.slot}`)) continue;
		const profile = profiles.get(item.habit.user_id);
		let sent = deliveries.has(deliveryKey(item, "push")) || deliveries.has(deliveryKey(item, "email"));

		if (!sent) {
			sent = await sendPush({
				supabase,
				subscriptions: subscriptions.get(item.habit.user_id) || [],
				item,
				profile,
				appUrl,
			});
			if (sent) await recordDelivery(supabase, item, "push");
		}

		const wantsEmail = item.habit.reminders?.emailFallback && profile.email_fallback;
		if (!sent && wantsEmail && !deliveries.has(deliveryKey(item, "email"))) {
			sent = await sendEmail({ resend, item, profile, appUrl });
			if (sent) await recordDelivery(supabase, item, "email");
		}

		if (sent) delivered += 1;
	}

	return { candidates: candidates.length, delivered };
}

Deno.serve(async (request) => {
	if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
	if (!safeEqual(request.headers.get("x-kept-worker-key") || "", required("REMINDER_WORKER_SECRET"))) {
		return jsonResponse({ error: "Unauthorized" }, 401);
	}

	try {
		const summary = await runReminders();
		console.log(`Reminder pass complete: ${summary.delivered}/${summary.candidates} delivered.`);
		return jsonResponse({ ok: true, ...summary });
	} catch (error) {
		console.error(`Reminder pass failed: ${error.message}`);
		return jsonResponse({ ok: false, error: error.message }, 500);
	}
});
