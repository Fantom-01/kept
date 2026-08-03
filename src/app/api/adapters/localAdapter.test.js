import { describe, expect, it } from "vitest";
import { localAdapter } from "./localAdapter.js";

describe("local adapter", () => {
	it("creates a local OTP session and seeds a useful preview", async () => {
		const attempt = await localAdapter.requestOtp("YOU@kept.local");
		expect(attempt.email).toBe("you@kept.local");
		const session = await localAdapter.verifyOtp(attempt.email, attempt.devCode);
		expect(session.user.email).toBe("you@kept.local");
		expect(await localAdapter.getHabits()).toHaveLength(4);
		expect((await localAdapter.getCheckIns()).length).toBeGreaterThan(20);
	});

	it("persists created habits through the same interface used by hosted data", async () => {
		const attempt = await localAdapter.requestOtp("tester@kept.local");
		await localAdapter.verifyOtp(attempt.email, attempt.devCode);
		const created = await localAdapter.createHabit({
			name: "Drink water",
			description: "",
			mode: "build",
			metricType: "count",
			targetValue: 8,
			unit: "glasses",
			color: "#3478c7",
			icon: "water",
			startDate: "2026-08-03",
			schedule: { cadence: "daily", interval: 1, weekdays: [], monthDay: 1, times: ["09:00"] },
			reminders: { enabled: true, emailFallback: false, privateCopy: false },
			pauses: [],
		});
		expect((await localAdapter.getHabit(created.id)).name).toBe("Drink water");
	});

	it("rejects data access after sign-out", async () => {
		const attempt = await localAdapter.requestOtp("logout@kept.local");
		await localAdapter.verifyOtp(attempt.email, attempt.devCode);
		await localAdapter.signOut();
		await expect(localAdapter.getHabits()).rejects.toMatchObject({ status: 401 });
	});

	it("keeps separate local accounts isolated and restores the latest session", async () => {
		const firstAttempt = await localAdapter.requestOtp("first@kept.local");
		await localAdapter.verifyOtp(firstAttempt.email, firstAttempt.devCode);
		await localAdapter.createHabit({
			name: "First account only",
			mode: "build",
			metricType: "binary",
			targetValue: 1,
			unit: "time",
			startDate: "2026-08-03",
			schedule: { cadence: "daily", interval: 1, weekdays: [], monthDay: 1, times: ["09:00"] },
		});
		expect(await localAdapter.getHabits()).toHaveLength(5);

		await localAdapter.signOut();
		const secondAttempt = await localAdapter.requestOtp("second@kept.local");
		const secondSession = await localAdapter.verifyOtp(secondAttempt.email, secondAttempt.devCode);
		expect(await localAdapter.getHabits()).toHaveLength(4);
		expect((await localAdapter.restoreSession()).user.id).toBe(secondSession.user.id);
	});
});
