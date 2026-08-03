import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import webpush from "web-push";
import { dueReminders } from "./reminderSchedule.js";

function required(name) {
	const value = process.env[name];
	if (!value) throw new Error(`Missing required environment variable: ${name}`);
	return value;
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
	if (privateCopy) {
		return {
			title: "A habit is waiting",
			body: "A small check-in keeps your record honest.",
		};
	}
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
	const { error } = await supabase.from("notification_deliveries").upsert({
		user_id: item.habit.user_id,
		habit_id: item.habit.id,
		date_key: item.dateKey,
		slot: item.slot,
		channel,
	}, { onConflict: "user_id,habit_id,date_key,slot,channel", ignoreDuplicates: true });
	if (error) throw error;
}

async function sendPush({ supabase, subscriptions, item, profile, appUrl }) {
	if (!subscriptions.length || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return false;
	const copy = reminderCopy(item.habit, profile);
	const payload = JSON.stringify({
		...copy,
		url: `${appUrl}/app/habits/${item.habit.id}`,
	});
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
				await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
				continue;
			}
			console.error(`Push delivery failed for subscription ${subscription.id}: ${error.message}`);
		}
	}
	return delivered;
}

async function sendEmail({ resend, item, profile, appUrl }) {
	if (!resend || !profile.email || !process.env.RESEND_FROM_EMAIL) return false;
	const copy = reminderCopy(item.habit, profile);
	const title = escapeHtml(copy.title);
	const body = escapeHtml(copy.body);
	const habitUrl = `${appUrl}/app/habits/${encodeURIComponent(item.habit.id)}`;
	const { error } = await resend.emails.send({
		from: process.env.RESEND_FROM_EMAIL,
		to: [profile.email],
		subject: copy.title,
		html: `<div style="font-family:Arial,sans-serif;color:#20231f"><h1 style="font-size:24px">${title}</h1><p>${body}</p><p><a href="${habitUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#24694f;color:white;text-decoration:none">Open Kept</a></p></div>`,
		headers: { "Idempotency-Key": `reminder-${item.habit.id}-${item.dateKey}-${item.slot}` },
	});
	if (error) throw new Error(error.message);
	return true;
}

export async function runReminders(now = new Date()) {
	const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	const appUrl = required("APP_URL").replace(/\/$/, "");
	const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

	if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
		webpush.setVapidDetails(
			process.env.VAPID_SUBJECT || "mailto:hello@kept.app",
			process.env.VAPID_PUBLIC_KEY,
			process.env.VAPID_PRIVATE_KEY,
		);
	}

	const [habitsResult, profilesResult, subscriptionsResult] = await Promise.all([
		supabase.from("habits").select("*").contains("reminders", { enabled: true }),
		supabase.from("profiles").select("*"),
		supabase.from("push_subscriptions").select("*"),
	]);
	for (const result of [habitsResult, profilesResult, subscriptionsResult]) {
		if (result.error) throw result.error;
	}

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
		supabase.from("check_ins").select("habit_id,date_key,slot").in("habit_id", habitIds).in("date_key", dateKeys),
		supabase.from("notification_deliveries").select("user_id,habit_id,date_key,slot,channel").in("habit_id", habitIds).in("date_key", dateKeys),
	]);
	if (checkInsResult.error) throw checkInsResult.error;
	if (deliveriesResult.error) throw deliveriesResult.error;

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

if (import.meta.url === `file://${process.argv[1]}`) {
	runReminders()
		.then((summary) => console.log(`Reminder pass complete: ${summary.delivered}/${summary.candidates} delivered.`))
		.catch((error) => {
			console.error(`Reminder pass failed: ${error.message}`);
			process.exitCode = 1;
		});
}
