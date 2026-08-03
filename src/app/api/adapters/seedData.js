import { addDays, toDateKey } from "../../utils/dateUtils.js";
import { getHabitSlots, isHabitScheduledOnDate } from "../../utils/habitUtils.js";

function id() {
	return crypto.randomUUID();
}

export function createSeedData(user) {
	const today = toDateKey();
	const startDate = toDateKey(addDays(today, -44));
	const habits = [
		{
			id: id(),
			userId: user.id,
			name: "Morning walk",
			description: "Get outside before the day gets noisy.",
			mode: "build",
			metricType: "binary",
			targetValue: 1,
			unit: "walk",
			color: "#2f7d5b",
			icon: "walk",
			startDate,
			schedule: { cadence: "daily", interval: 1, weekdays: [], monthDay: 1, times: ["07:30"] },
			reminders: { enabled: true, emailFallback: false, privateCopy: false },
			createdAt: new Date().toISOString(),
		},
		{
			id: id(),
			userId: user.id,
			name: "Read 20 pages",
			description: "Trade a little screen time for a better story.",
			mode: "build",
			metricType: "count",
			targetValue: 20,
			unit: "pages",
			color: "#e76f51",
			icon: "book",
			startDate,
			schedule: { cadence: "daily", interval: 1, weekdays: [], monthDay: 1, times: ["21:00"] },
			reminders: { enabled: true, emailFallback: true, privateCopy: false },
			createdAt: new Date().toISOString(),
		},
		{
			id: id(),
			userId: user.id,
			name: "No late-night scrolling",
			description: "Protect the hour before sleep.",
			mode: "quit",
			metricType: "binary",
			targetValue: 1,
			unit: "day",
			color: "#6d5bd0",
			icon: "moon",
			startDate,
			schedule: { cadence: "daily", interval: 1, weekdays: [], monthDay: 1, times: ["22:15"] },
			reminders: { enabled: true, emailFallback: false, privateCopy: true },
			createdAt: new Date().toISOString(),
		},
		{
			id: id(),
			userId: user.id,
			name: "Strength training",
			description: "A short, deliberate session is enough.",
			mode: "build",
			metricType: "binary",
			targetValue: 1,
			unit: "session",
			color: "#3478c7",
			icon: "strength",
			startDate,
			schedule: { cadence: "weekly", interval: 1, weekdays: [2, 4, 6], monthDay: 1, times: ["18:00"] },
			reminders: { enabled: true, emailFallback: false, privateCopy: false },
			createdAt: new Date().toISOString(),
		},
	];

	const checkIns = [];
	for (let offset = -44; offset <= 0; offset += 1) {
		const dateKey = toDateKey(addDays(today, offset));
		habits.forEach((habit, habitIndex) => {
			if (!isHabitScheduledOnDate(habit, dateKey)) return;
			if (offset === 0) return;
			const shouldMiss = (Math.abs(offset) + habitIndex * 3) % (habitIndex === 2 ? 11 : 8) === 0;
			if (shouldMiss) return;
			getHabitSlots(habit).forEach((slot) => {
				checkIns.push({
					id: id(),
					userId: user.id,
					habitId: habit.id,
					dateKey,
					slot,
					status: habit.mode === "quit" ? "sober" : "completed",
					value: habit.metricType === "count" ? 16 + ((Math.abs(offset) * 3) % 14) : 1,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				});
			});
		});
	}

	const milestones = [
		{
			id: id(),
			userId: user.id,
			habitId: habits[0].id,
			type: "streak",
			targetValue: 14,
			dueDate: toDateKey(addDays(today, 18)),
			rewardText: "Take myself out for a slow Saturday breakfast.",
			consequenceText: "Put the phone away for the next evening.",
			createdAt: new Date().toISOString(),
		},
		{
			id: id(),
			userId: user.id,
			habitId: habits[1].id,
			type: "count",
			targetValue: 1000,
			dueDate: toDateKey(addDays(today, 12)),
			rewardText: "Buy the next book on the list.",
			consequenceText: "No streaming until the next reading session is done.",
			createdAt: new Date().toISOString(),
		},
	];

	return { habits, checkIns, milestones };
}
