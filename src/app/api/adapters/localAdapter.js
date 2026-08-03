import { createSeedData } from "./seedData.js";
import { toDateKey } from "../../utils/dateUtils.js";

const STORAGE_KEY = "kept_local_database_v1";
const SESSION_KEY = "kept_local_session";
const OTP_KEY = "kept_local_otp";
const DEV_CODE = "202626";

function id() {
	return crypto.randomUUID();
}

function wait(value, duration = 90) {
	return new Promise((resolve) => window.setTimeout(() => resolve(structuredClone(value)), duration));
}

function fail(message, status = 400) {
	const error = new Error(message);
	error.status = status;
	throw error;
}

function readDatabase() {
	const saved = localStorage.getItem(STORAGE_KEY);
	if (saved) return JSON.parse(saved);
	return { version: 1, users: [], profiles: [], habits: [], checkIns: [], milestones: [] };
}

function writeDatabase(database) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
	window.dispatchEvent(new CustomEvent("kept:local-change"));
}

function currentUser(database = readDatabase()) {
	const userId = localStorage.getItem(SESSION_KEY);
	const user = database.users.find((item) => item.id === userId);
	if (!user) fail("Your local session has expired. Sign in again.", 401);
	return user;
}

function ownedRows(rows, userId) {
	return rows.filter((row) => row.userId === userId);
}

export const localAdapter = {
	mode: "local",
	devCode: DEV_CODE,

	async requestOtp(email) {
		const normalized = email.trim().toLowerCase();
		if (!normalized.includes("@")) fail("Enter a valid email address.");
		sessionStorage.setItem(OTP_KEY, JSON.stringify({ email: normalized, code: DEV_CODE, requestedAt: Date.now() }));
		return wait({ email: normalized, devCode: DEV_CODE });
	},

	async verifyOtp(email, code) {
		const attempt = JSON.parse(sessionStorage.getItem(OTP_KEY) || "null");
		if (!attempt || attempt.email !== email.trim().toLowerCase()) fail("Request a fresh sign-in code.");
		if (String(code) !== attempt.code) fail("That code is not correct.");
		if (Date.now() - attempt.requestedAt > 10 * 60_000) fail("That code has expired. Request a new one.");

		const database = readDatabase();
		let user = database.users.find((item) => item.email === attempt.email);
		if (!user) {
			user = { id: id(), email: attempt.email, createdAt: new Date().toISOString() };
			database.users.push(user);
			database.profiles.push({
				id: id(),
				userId: user.id,
				name: "Alex",
				timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
				notificationPrivacy: "habit-name",
				emailFallback: true,
			});
			const seed = createSeedData(user);
			database.habits.push(...seed.habits);
			database.checkIns.push(...seed.checkIns);
			database.milestones.push(...seed.milestones);
			writeDatabase(database);
		}
		localStorage.setItem(SESSION_KEY, user.id);
		sessionStorage.removeItem(OTP_KEY);
		return wait({ user });
	},

	async restoreSession() {
		const database = readDatabase();
		const userId = localStorage.getItem(SESSION_KEY);
		const user = database.users.find((item) => item.id === userId) || null;
		return wait(user ? { user } : null, 40);
	},

	async signOut() {
		localStorage.removeItem(SESSION_KEY);
		return wait(null);
	},

	async getProfile() {
		const database = readDatabase();
		const user = currentUser(database);
		return wait(database.profiles.find((profile) => profile.userId === user.id));
	},

	async updateProfile(changes) {
		const database = readDatabase();
		const user = currentUser(database);
		const index = database.profiles.findIndex((profile) => profile.userId === user.id);
		database.profiles[index] = { ...database.profiles[index], ...changes, updatedAt: new Date().toISOString() };
		writeDatabase(database);
		return wait(database.profiles[index]);
	},

	async getHabits() {
		const database = readDatabase();
		const user = currentUser(database);
		return wait(ownedRows(database.habits, user.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
	},

	async getHabit(habitId) {
		const habits = await this.getHabits();
		const habit = habits.find((item) => item.id === habitId);
		if (!habit) fail("Habit not found.", 404);
		return habit;
	},

	async createHabit(input) {
		const database = readDatabase();
		const user = currentUser(database);
		const habit = {
			...input,
			id: id(),
			userId: user.id,
			createdAt: new Date().toISOString(),
		};
		database.habits.push(habit);
		if (input.milestone?.targetValue) {
			database.milestones.push({
				...input.milestone,
				id: id(),
				userId: user.id,
				habitId: habit.id,
				createdAt: new Date().toISOString(),
			});
		}
		delete habit.milestone;
		writeDatabase(database);
		return wait(habit);
	},

	async updateHabit(habitId, changes) {
		const database = readDatabase();
		const user = currentUser(database);
		const index = database.habits.findIndex((habit) => habit.id === habitId && habit.userId === user.id);
		if (index < 0) fail("Habit not found.", 404);
		database.habits[index] = { ...database.habits[index], ...changes, updatedAt: new Date().toISOString() };
		writeDatabase(database);
		return wait(database.habits[index]);
	},

	async getCheckIns() {
		const database = readDatabase();
		const user = currentUser(database);
		return wait(ownedRows(database.checkIns, user.id));
	},

	async saveCheckIn(input) {
		const database = readDatabase();
		const user = currentUser(database);
		const index = database.checkIns.findIndex(
			(item) =>
				item.userId === user.id &&
				item.habitId === input.habitId &&
				item.dateKey === input.dateKey &&
				item.slot === input.slot,
		);
		const checkIn = {
			...(index >= 0 ? database.checkIns[index] : { id: id(), userId: user.id, createdAt: new Date().toISOString() }),
			...input,
			updatedAt: new Date().toISOString(),
		};
		if (index >= 0) database.checkIns[index] = checkIn;
		else database.checkIns.push(checkIn);
		writeDatabase(database);
		return wait(checkIn, 60);
	},

	async clearCheckIn({ habitId, dateKey, slot }) {
		const database = readDatabase();
		const user = currentUser(database);
		database.checkIns = database.checkIns.filter(
			(item) =>
				!(item.userId === user.id && item.habitId === habitId && item.dateKey === dateKey && item.slot === slot),
		);
		writeDatabase(database);
		return wait(null, 60);
	},

	async getMilestones() {
		const database = readDatabase();
		const user = currentUser(database);
		return wait(ownedRows(database.milestones, user.id));
	},

	async createMilestone(input) {
		const database = readDatabase();
		const user = currentUser(database);
		const milestone = { ...input, id: id(), userId: user.id, createdAt: new Date().toISOString() };
		database.milestones.push(milestone);
		writeDatabase(database);
		return wait(milestone);
	},

	async resetLocalPreview() {
		const database = readDatabase();
		const user = currentUser(database);
		database.habits = database.habits.filter((row) => row.userId !== user.id);
		database.checkIns = database.checkIns.filter((row) => row.userId !== user.id);
		database.milestones = database.milestones.filter((row) => row.userId !== user.id);
		const seed = createSeedData(user);
		database.habits.push(...seed.habits);
		database.checkIns.push(...seed.checkIns);
		database.milestones.push(...seed.milestones);
		writeDatabase(database);
		return wait({ resetAt: toDateKey() });
	},

	async exportData() {
		const database = readDatabase();
		const user = currentUser(database);
		return wait({
			exportedAt: new Date().toISOString(),
			user,
			profile: database.profiles.find((profile) => profile.userId === user.id),
			habits: ownedRows(database.habits, user.id),
			checkIns: ownedRows(database.checkIns, user.id),
			milestones: ownedRows(database.milestones, user.id),
		});
	},
};
