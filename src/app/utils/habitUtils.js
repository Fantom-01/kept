import {
	addDays,
	dateRange,
	daysBetween,
	fromDateKey,
	lastDayOfMonth,
	monthsBetween,
	startOfWeek,
	toDateKey,
	weekdayLabel,
} from "./dateUtils.js";

export const HABIT_COLORS = [
	"#2f7d5b",
	"#e76f51",
	"#6d5bd0",
	"#d99c25",
	"#3478c7",
	"#c74c75",
	"#34766f",
	"#835f3b",
];

export const HABIT_ICONS = ["walk", "book", "water", "strength", "leaf", "focus", "moon", "spark"];

export function isHabitScheduledOnDate(habit, dateKey) {
	if (!habit || dateKey < habit.startDate) return false;
	// The archive date remains part of the historical record. Archiving removes
	// the habit from active views immediately, while recurrence stops tomorrow.
	if (habit.archivedAt && dateKey > habit.archivedAt) return false;
	if ((habit.pauses || []).some((pause) => dateKey >= pause.startDate && (!pause.endDate || dateKey <= pause.endDate))) return false;
	if (habit.pausedAt && !(habit.pauses || []).length && dateKey >= habit.pausedAt) return false;

	const schedule = habit.schedule;
	const interval = Math.max(Number(schedule.interval) || 1, 1);
	const date = fromDateKey(dateKey);

	if (schedule.cadence === "daily") {
		return daysBetween(habit.startDate, dateKey) % interval === 0;
	}

	if (schedule.cadence === "weekly") {
		const startWeek = toDateKey(startOfWeek(habit.startDate));
		const dateWeek = toDateKey(startOfWeek(dateKey));
		const weekDistance = Math.floor(daysBetween(startWeek, dateWeek) / 7);
		return weekDistance % interval === 0 && schedule.weekdays.includes(date.getDay());
	}

	if (schedule.cadence === "monthly") {
		const distance = monthsBetween(habit.startDate, dateKey);
		const targetDay = Math.min(
			Number(schedule.monthDay) || 1,
			lastDayOfMonth(date.getFullYear(), date.getMonth()),
		);
		return distance >= 0 && distance % interval === 0 && date.getDate() === targetDay;
	}

	return false;
}

export function getHabitSlots(habit) {
	const times = habit.schedule?.times?.filter(Boolean) || [];
	return times.length ? times : ["anytime"];
}

export function getCheckIn(checkIns, habitId, dateKey, slot = "anytime") {
	return checkIns.find(
		(checkIn) =>
			checkIn.habitId === habitId &&
			checkIn.dateKey === dateKey &&
			checkIn.slot === slot,
	);
}

export function isSuccessfulCheckIn(habit, checkIn) {
	if (!checkIn) return false;
	if (habit.mode === "quit") return checkIn.status === "sober";
	if (habit.metricType === "count") return Number(checkIn.value) >= Number(habit.targetValue);
	return checkIn.status === "completed";
}

export function getHabitDayState(habit, dateKey, checkIns, todayKey = toDateKey()) {
	if (!isHabitScheduledOnDate(habit, dateKey)) {
		return { state: "unscheduled", completed: 0, total: 0, value: 0 };
	}

	const slots = getHabitSlots(habit);
	const entries = slots.map((slot) => getCheckIn(checkIns, habit.id, dateKey, slot));
	const completed = entries.filter((entry) => isSuccessfulCheckIn(habit, entry)).length;
	const value = entries.reduce((total, entry) => total + Number(entry?.value || 0), 0);

	if (entries.some((entry) => entry?.status === "lapse")) {
		return { state: "lapse", completed, total: slots.length, value };
	}
	if (completed === slots.length) {
		return {
			state: habit.mode === "quit" ? "sober" : "completed",
			completed,
			total: slots.length,
			value,
		};
	}
	if (entries.some(Boolean)) {
		return { state: "partial", completed, total: slots.length, value };
	}
	if (dateKey < todayKey) {
		return { state: "missed", completed: 0, total: slots.length, value: 0 };
	}
	return { state: "pending", completed: 0, total: slots.length, value: 0 };
}

export function getHabitStats(habit, checkIns, endKey = toDateKey()) {
	const scheduledDates = dateRange(habit.startDate, endKey).filter((dateKey) =>
		isHabitScheduledOnDate(habit, dateKey),
	);
	let running = 0;
	let bestStreak = 0;
	let successfulDays = 0;

	for (const dateKey of scheduledDates) {
		const state = getHabitDayState(habit, dateKey, checkIns, endKey).state;
		const success = state === "completed" || state === "sober";
		if (success) {
			running += 1;
			successfulDays += 1;
			bestStreak = Math.max(bestStreak, running);
		} else if (dateKey < endKey || !["pending", "partial"].includes(state)) {
			running = 0;
		}
	}

	let currentStreak = 0;
	for (let index = scheduledDates.length - 1; index >= 0; index -= 1) {
		const dateKey = scheduledDates[index];
		const state = getHabitDayState(habit, dateKey, checkIns, endKey).state;
		if (dateKey === endKey && ["pending", "partial"].includes(state)) continue;
		if (state === "completed" || state === "sober") currentStreak += 1;
		else break;
	}

	function consistency(windowDays) {
		const startKey = toDateKey(addDays(endKey, -(windowDays - 1)));
		const windowDates = scheduledDates.filter((dateKey) => dateKey >= startKey);
		if (!windowDates.length) return 0;
		const wins = windowDates.filter((dateKey) => {
			const state = getHabitDayState(habit, dateKey, checkIns, endKey).state;
			return state === "completed" || state === "sober";
		}).length;
		return Math.round((wins / windowDates.length) * 100);
	}

	return {
		currentStreak,
		bestStreak,
		successfulDays,
		totalScheduledDays: scheduledDates.length,
		consistency7: consistency(7),
		consistency30: consistency(30),
		consistency90: consistency(90),
	};
}

export function getMilestoneProgress(milestone, habit, checkIns, todayKey = toDateKey()) {
	const endKey = milestone.dueDate && milestone.dueDate < todayKey ? milestone.dueDate : todayKey;
	let progress;

	if (milestone.type === "streak") {
		progress = getHabitStats(habit, checkIns, endKey).bestStreak;
	} else {
		const relevant = checkIns.filter(
			(checkIn) =>
				checkIn.habitId === habit.id &&
				checkIn.dateKey >= habit.startDate &&
				checkIn.dateKey <= endKey,
		);
		if (habit.metricType === "count") {
			progress = relevant.reduce((total, checkIn) => total + Number(checkIn.value || 0), 0);
		} else {
			progress = relevant.filter((checkIn) => isSuccessfulCheckIn(habit, checkIn)).length;
		}
	}

	const achieved = progress >= milestone.targetValue;
	const missed = !achieved && milestone.dueDate && milestone.dueDate < todayKey;
	return {
		progress,
		percent: Math.min(Math.round((progress / milestone.targetValue) * 100), 100),
		status: achieved ? "achieved" : missed ? "missed" : "in-progress",
	};
}

export function formatHabitState(state, habit) {
	if (state.state === "completed") return "Completed";
	if (state.state === "sober") return "On track";
	if (state.state === "lapse") return "Lapse recorded";
	if (state.state === "missed") return habit.mode === "quit" ? "Unconfirmed" : "Missed";
	if (state.state === "partial") return habit.metricType === "count" ? `${state.value} ${habit.unit}` : `${state.completed}/${state.total} done`;
	if (state.state === "pending") return "Scheduled";
	return "Not scheduled";
}

export function describeSchedule(habit) {
	const { cadence, interval, weekdays, monthDay, times } = habit.schedule;
	let schedule;
	if (cadence === "daily") schedule = interval === 1 ? "Every day" : `Every ${interval} days`;
	else if (cadence === "weekly") {
		const labels = weekdays.map((day) => weekdayLabel(day, "short")).join(", ");
		schedule = interval === 1 ? labels : `Every ${interval} weeks · ${labels}`;
	} else schedule = interval === 1 ? `Monthly on day ${monthDay}` : `Every ${interval} months on day ${monthDay}`;

	if (times?.length > 1) schedule += ` · ${times.length} times`;
	return schedule;
}

export function describeTarget(habit) {
	if (habit.mode === "quit") return "Stay on track";
	if (habit.metricType === "count") return `${habit.targetValue} ${habit.unit || "times"}`;
	return "One check-in";
}
