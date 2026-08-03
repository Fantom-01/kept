import { createClient } from "@supabase/supabase-js";

let client;

function getClient() {
	if (client) return client;

	const url = import.meta.env.VITE_SUPABASE_URL;
	const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
	if (!url || !publishableKey) {
		throw new Error("Kept is missing its Supabase public configuration.");
	}

	client = createClient(url, publishableKey, {
		auth: {
			autoRefreshToken: true,
			detectSessionInUrl: true,
			persistSession: true,
		},
	});
	return client;
}

function fail(error) {
	if (!error) return;
	const next = new Error(error.message || "Something went wrong.");
	next.status = error.status || (error.code === "PGRST116" ? 404 : 400);
	next.code = error.code;
	throw next;
}

function camelizeProfile(row) {
	if (!row) return null;
	return {
		id: row.user_id,
		userId: row.user_id,
		email: row.email,
		name: row.name,
		timezone: row.timezone,
		notificationPrivacy: row.notification_privacy,
		emailFallback: row.email_fallback,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function camelizeHabit(row) {
	if (!row) return null;
	return {
		id: row.id,
		userId: row.user_id,
		name: row.name,
		description: row.description,
		mode: row.mode,
		metricType: row.metric_type,
		targetValue: Number(row.target_value),
		unit: row.unit,
		color: row.color,
		icon: row.icon,
		startDate: row.start_date,
		schedule: row.schedule,
		reminders: row.reminders,
		pauses: row.pauses || [],
		pausedAt: row.paused_at,
		archivedAt: row.archived_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function camelizeCheckIn(row) {
	return {
		id: row.id,
		userId: row.user_id,
		habitId: row.habit_id,
		dateKey: row.date_key,
		slot: row.slot,
		status: row.status,
		value: Number(row.value),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function camelizeMilestone(row) {
	return {
		id: row.id,
		userId: row.user_id,
		habitId: row.habit_id,
		type: row.type,
		targetValue: Number(row.target_value),
		dueDate: row.due_date,
		rewardText: row.reward_text,
		consequenceText: row.consequence_text,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function profileChanges(changes) {
	const row = {};
	if (changes.name !== undefined) row.name = changes.name;
	if (changes.timezone !== undefined) row.timezone = changes.timezone;
	if (changes.notificationPrivacy !== undefined) row.notification_privacy = changes.notificationPrivacy;
	if (changes.emailFallback !== undefined) row.email_fallback = changes.emailFallback;
	return row;
}

function habitChanges(changes) {
	const row = {};
	const fields = {
		name: "name",
		description: "description",
		mode: "mode",
		metricType: "metric_type",
		targetValue: "target_value",
		unit: "unit",
		color: "color",
		icon: "icon",
		startDate: "start_date",
		schedule: "schedule",
		reminders: "reminders",
		pauses: "pauses",
		pausedAt: "paused_at",
		archivedAt: "archived_at",
	};
	Object.entries(fields).forEach(([key, column]) => {
		if (changes[key] !== undefined) row[column] = changes[key];
	});
	return row;
}

function milestoneChanges(input) {
	return {
		habit_id: input.habitId,
		type: input.type,
		target_value: input.targetValue,
		due_date: input.dueDate,
		reward_text: input.rewardText || "",
		consequence_text: input.consequenceText || "",
	};
}

async function currentUser() {
	const { data, error } = await getClient().auth.getUser();
	fail(error);
	if (!data.user) {
		const noSession = new Error("Your session has expired. Sign in again.");
		noSession.status = 401;
		throw noSession;
	}
	return data.user;
}

export const supabaseAdapter = {
	mode: "supabase",
	devCode: null,

	async requestOtp(email) {
		const normalized = email.trim().toLowerCase();
		if (!normalized.includes("@")) throw new Error("Enter a valid email address.");
		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
		const { error } = await getClient().auth.signInWithOtp({
			email: normalized,
			options: { shouldCreateUser: true, data: { timezone } },
		});
		fail(error);
		return { email: normalized };
	},

	async verifyOtp(email, code) {
		const { data, error } = await getClient().auth.verifyOtp({
			email: email.trim().toLowerCase(),
			token: String(code),
			type: "email",
		});
		fail(error);
		return { user: data.user, session: data.session };
	},

	async restoreSession() {
		const { data, error } = await getClient().auth.getSession();
		fail(error);
		return data.session ? { user: data.session.user, session: data.session } : null;
	},

	async signOut() {
		const { error } = await getClient().auth.signOut();
		fail(error);
		return null;
	},

	onAuthStateChange(callback) {
		const { data } = getClient().auth.onAuthStateChange((_event, session) => {
			callback(session ? { user: session.user, session } : null);
		});
		return () => data.subscription.unsubscribe();
	},

	async getProfile() {
		const user = await currentUser();
		let { data, error } = await getClient().from("profiles").select("*").eq("user_id", user.id).maybeSingle();
		fail(error);
		if (!data) {
			const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
			const fallbackName = user.email?.split("@")[0] || "Friend";
			({ data, error } = await getClient()
				.from("profiles")
				.upsert({ user_id: user.id, email: user.email, name: fallbackName, timezone }, { onConflict: "user_id" })
				.select("*")
				.single());
			fail(error);
		}
		return camelizeProfile(data);
	},

	async updateProfile(changes) {
		const user = await currentUser();
		const { data, error } = await getClient()
			.from("profiles")
			.update(profileChanges(changes))
			.eq("user_id", user.id)
			.select("*")
			.single();
		fail(error);
		return camelizeProfile(data);
	},

	async getHabits() {
		const { data, error } = await getClient().from("habits").select("*").order("created_at", { ascending: true });
		fail(error);
		return data.map(camelizeHabit);
	},

	async getHabit(habitId) {
		const { data, error } = await getClient().from("habits").select("*").eq("id", habitId).single();
		fail(error);
		return camelizeHabit(data);
	},

	async createHabit(input) {
		const milestone = input.milestone ? milestoneChanges(input.milestone) : null;
		const payload = habitChanges(input);
		const { data, error } = await getClient().rpc("create_habit_with_milestone", {
			habit_input: payload,
			milestone_input: milestone,
		});
		fail(error);
		return camelizeHabit(Array.isArray(data) ? data[0] : data);
	},

	async updateHabit(habitId, changes) {
		const { data, error } = await getClient()
			.from("habits")
			.update(habitChanges(changes))
			.eq("id", habitId)
			.select("*")
			.single();
		fail(error);
		return camelizeHabit(data);
	},

	async getCheckIns() {
		const { data, error } = await getClient().from("check_ins").select("*");
		fail(error);
		return data.map(camelizeCheckIn);
	},

	async saveCheckIn(input) {
		const user = await currentUser();
		const row = {
			user_id: user.id,
			habit_id: input.habitId,
			date_key: input.dateKey,
			slot: input.slot,
			status: input.status,
			value: Number(input.value || 0),
		};
		const { data, error } = await getClient()
			.from("check_ins")
			.upsert(row, { onConflict: "user_id,habit_id,date_key,slot" })
			.select("*")
			.single();
		fail(error);
		return camelizeCheckIn(data);
	},

	async clearCheckIn({ habitId, dateKey, slot }) {
		const { error } = await getClient()
			.from("check_ins")
			.delete()
			.eq("habit_id", habitId)
			.eq("date_key", dateKey)
			.eq("slot", slot);
		fail(error);
		return null;
	},

	async getMilestones() {
		const { data, error } = await getClient().from("milestones").select("*").order("created_at", { ascending: true });
		fail(error);
		return data.map(camelizeMilestone);
	},

	async createMilestone(input) {
		const user = await currentUser();
		const { data, error } = await getClient()
			.from("milestones")
			.insert({ ...milestoneChanges(input), user_id: user.id })
			.select("*")
			.single();
		fail(error);
		return camelizeMilestone(data);
	},

	async savePushSubscription(subscription) {
		const user = await currentUser();
		const json = subscription.toJSON ? subscription.toJSON() : subscription;
		const { data, error } = await getClient()
			.from("push_subscriptions")
			.upsert({
				user_id: user.id,
				endpoint: json.endpoint,
				expiration_time: json.expirationTime || null,
				p256dh: json.keys?.p256dh,
				auth: json.keys?.auth,
				user_agent: navigator.userAgent,
				last_seen_at: new Date().toISOString(),
			}, { onConflict: "endpoint" })
			.select("id")
			.single();
		fail(error);
		return data;
	},

	async removePushSubscription(endpoint) {
		const { error } = await getClient().from("push_subscriptions").delete().eq("endpoint", endpoint);
		fail(error);
		return null;
	},

	async resetLocalPreview() {
		throw new Error("Sample-data reset is only available in local preview mode.");
	},

	async exportData() {
		const user = await currentUser();
		const [profile, habits, checkIns, milestones] = await Promise.all([
			this.getProfile(),
			this.getHabits(),
			this.getCheckIns(),
			this.getMilestones(),
		]);
		return {
			exportedAt: new Date().toISOString(),
			user: { id: user.id, email: user.email, createdAt: user.created_at },
			profile,
			habits,
			checkIns,
			milestones,
		};
	},
};
