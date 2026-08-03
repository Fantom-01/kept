import { describe, expect, it } from "vitest";
import { dueReminders, isScheduledOnDate, localClock } from "./reminderSchedule.js";

const habit = {
	start_date: "2026-08-01",
	archived_at: null,
	paused_at: null,
	pauses: [],
	schedule: { cadence: "daily", interval: 2, weekdays: [], monthDay: 1, times: ["08:00"] },
};

describe("reminder scheduling", () => {
	it("uses the profile timezone for the local reminder clock", () => {
		expect(localClock(new Date("2026-08-03T07:04:00Z"), "Africa/Lagos")).toEqual({
			dateKey: "2026-08-03",
			hour: 8,
			minute: 4,
		});
	});

	it("matches recurrence without changing the user's local date", () => {
		expect(isScheduledOnDate(habit, "2026-08-03")).toBe(true);
		expect(isScheduledOnDate(habit, "2026-08-04")).toBe(false);
	});

	it("keeps a short delivery window so a delayed cron run is not missed", () => {
		expect(dueReminders(habit, new Date("2026-08-03T07:07:00Z"), "Africa/Lagos")).toHaveLength(1);
		expect(dueReminders(habit, new Date("2026-08-03T07:11:00Z"), "Africa/Lagos")).toHaveLength(0);
	});
});
