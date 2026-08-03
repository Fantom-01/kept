import { describe, expect, it } from "vitest";
import {
	formatHabitState,
	getHabitDayState,
	getHabitStats,
	getMilestoneProgress,
	isHabitScheduledOnDate,
} from "./habitUtils.js";

function habit(overrides = {}) {
	return {
		id: "habit-1",
		name: "Test habit",
		mode: "build",
		metricType: "binary",
		targetValue: 1,
		unit: "time",
		startDate: "2026-01-01",
		schedule: { cadence: "daily", interval: 1, weekdays: [], monthDay: 1, times: ["anytime"] },
		pauses: [],
		...overrides,
	};
}

function checkIn(dateKey, overrides = {}) {
	return {
		id: `check-${dateKey}`,
		habitId: "habit-1",
		dateKey,
		slot: "anytime",
		status: "completed",
		value: 1,
		...overrides,
	};
}

describe("habit recurrence", () => {
	it("anchors every-N-day schedules to the start date", () => {
		const everyTwoDays = habit({ schedule: { cadence: "daily", interval: 2, weekdays: [], monthDay: 1, times: ["anytime"] } });
		expect(isHabitScheduledOnDate(everyTwoDays, "2026-01-01")).toBe(true);
		expect(isHabitScheduledOnDate(everyTwoDays, "2026-01-02")).toBe(false);
		expect(isHabitScheduledOnDate(everyTwoDays, "2026-01-03")).toBe(true);
	});

	it("supports selected weekdays and week intervals", () => {
		const mondaysEveryTwoWeeks = habit({
			startDate: "2026-01-05",
			schedule: { cadence: "weekly", interval: 2, weekdays: [1], monthDay: 1, times: ["anytime"] },
		});
		expect(isHabitScheduledOnDate(mondaysEveryTwoWeeks, "2026-01-05")).toBe(true);
		expect(isHabitScheduledOnDate(mondaysEveryTwoWeeks, "2026-01-12")).toBe(false);
		expect(isHabitScheduledOnDate(mondaysEveryTwoWeeks, "2026-01-19")).toBe(true);
	});

	it("clamps day 31 to the end of shorter months", () => {
		const monthly = habit({
			startDate: "2026-01-31",
			schedule: { cadence: "monthly", interval: 1, weekdays: [], monthDay: 31, times: ["anytime"] },
		});
		expect(isHabitScheduledOnDate(monthly, "2026-02-28")).toBe(true);
		expect(isHabitScheduledOnDate(monthly, "2026-02-27")).toBe(false);
	});

	it("excludes paused ranges without rewriting later dates", () => {
		const paused = habit({ pauses: [{ startDate: "2026-01-03", endDate: "2026-01-05" }] });
		expect(isHabitScheduledOnDate(paused, "2026-01-04")).toBe(false);
		expect(isHabitScheduledOnDate(paused, "2026-01-06")).toBe(true);
	});

	it("keeps the archive day in history while stopping future scheduling", () => {
		const archived = habit({ archivedAt: "2026-01-03" });
		expect(isHabitScheduledOnDate(archived, "2026-01-03")).toBe(true);
		expect(isHabitScheduledOnDate(archived, "2026-01-04")).toBe(false);

		const stats = getHabitStats(archived, [checkIn("2026-01-03")], "2026-01-03");
		expect(stats.successfulDays).toBe(1);
		expect(stats.currentStreak).toBe(1);
	});
});

describe("habit states and progress", () => {
	it("marks an unconfirmed quit day as missed, never as a lapse", () => {
		const quitHabit = habit({ mode: "quit", unit: "day" });
		const state = getHabitDayState(quitHabit, "2026-01-01", [], "2026-01-02");
		expect(state.state).toBe("missed");
		expect(formatHabitState(state, quitHabit)).toBe("Unconfirmed");
	});

	it("keeps partial quantity records distinct from completion", () => {
		const reading = habit({ metricType: "count", targetValue: 20, unit: "pages" });
		const partial = getHabitDayState(reading, "2026-01-01", [checkIn("2026-01-01", { status: "partial", value: 12 })], "2026-01-01");
		const complete = getHabitDayState(reading, "2026-01-01", [checkIn("2026-01-01", { value: 20 })], "2026-01-01");
		expect(partial.state).toBe("partial");
		expect(complete.state).toBe("completed");
	});

	it("requires every time slot for a twice-daily habit", () => {
		const twiceDaily = habit({ schedule: { cadence: "daily", interval: 1, weekdays: [], monthDay: 1, times: ["08:00", "20:00"] } });
		const morning = checkIn("2026-01-01", { slot: "08:00" });
		const evening = checkIn("2026-01-01", { id: "check-evening", slot: "20:00" });

		expect(getHabitDayState(twiceDaily, "2026-01-01", [morning], "2026-01-01").state).toBe("partial");
		expect(getHabitDayState(twiceDaily, "2026-01-01", [morning, evening], "2026-01-01").state).toBe("completed");
	});

	it("keeps explicit quit lapses separate from unconfirmed days", () => {
		const quitHabit = habit({ mode: "quit", unit: "day" });
		const lapse = getHabitDayState(quitHabit, "2026-01-01", [checkIn("2026-01-01", { status: "lapse", value: 0 })], "2026-01-01");
		expect(lapse.state).toBe("lapse");
		expect(formatHabitState(lapse, quitHabit)).toBe("Lapse recorded");
	});

	it("calculates current and best streaks across a miss", () => {
		const entries = ["2026-01-01", "2026-01-02", "2026-01-04", "2026-01-05"].map((dateKey) => checkIn(dateKey));
		const stats = getHabitStats(habit(), entries, "2026-01-05");
		expect(stats.bestStreak).toBe(2);
		expect(stats.currentStreak).toBe(2);
		expect(stats.successfulDays).toBe(4);
	});

	it("evaluates count and streak milestones", () => {
		const reading = habit({ metricType: "count", targetValue: 20, unit: "pages" });
		const entries = [
			checkIn("2026-01-01", { value: 20 }),
			checkIn("2026-01-02", { value: 15 }),
			checkIn("2026-01-03", { value: 25 }),
		];
		const count = getMilestoneProgress({ type: "count", targetValue: 60, dueDate: "2026-01-10" }, reading, entries, "2026-01-03");
		const streak = getMilestoneProgress({ type: "streak", targetValue: 2, dueDate: "2026-01-10" }, reading, entries, "2026-01-03");
		expect(count.status).toBe("achieved");
		expect(streak.status).toBe("in-progress");
	});

	it("marks an unmet milestone as missed only after its due date", () => {
		const milestone = { type: "count", targetValue: 5, dueDate: "2026-01-03" };
		expect(getMilestoneProgress(milestone, habit(), [checkIn("2026-01-01")], "2026-01-03").status).toBe("in-progress");
		expect(getMilestoneProgress(milestone, habit(), [checkIn("2026-01-01")], "2026-01-04").status).toBe("missed");
	});
});
