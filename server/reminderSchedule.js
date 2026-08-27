const DAY_MS = 86_400_000;

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

export function localClock(now, timezone) {
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

export function isScheduledOnDate(habit, dateKey) {
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

export function dueReminders(habit, now, timezone, windowMinutes = 20) {
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
