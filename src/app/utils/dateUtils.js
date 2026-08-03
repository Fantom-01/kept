const DAY_MS = 86_400_000;

function pad(value) {
	return String(value).padStart(2, "0");
}

export function toDateKey(date = new Date()) {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateKey(dateKey) {
	const [year, month, day] = dateKey.split("-").map(Number);
	return new Date(year, month - 1, day, 12);
}

export function addDays(dateOrKey, amount) {
	const date = typeof dateOrKey === "string" ? fromDateKey(dateOrKey) : new Date(dateOrKey);
	date.setDate(date.getDate() + amount);
	return date;
}

export function addMonths(dateOrKey, amount) {
	const date = typeof dateOrKey === "string" ? fromDateKey(dateOrKey) : new Date(dateOrKey);
	const originalDay = date.getDate();
	date.setDate(1);
	date.setMonth(date.getMonth() + amount);
	date.setDate(Math.min(originalDay, lastDayOfMonth(date.getFullYear(), date.getMonth())));
	return date;
}

export function daysBetween(startKey, endKey) {
	const start = fromDateKey(startKey);
	const end = fromDateKey(endKey);
	const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
	const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
	return Math.round((endUtc - startUtc) / DAY_MS);
}

export function monthsBetween(startKey, endKey) {
	const start = fromDateKey(startKey);
	const end = fromDateKey(endKey);
	return (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
}

export function startOfWeek(dateOrKey) {
	const date = typeof dateOrKey === "string" ? fromDateKey(dateOrKey) : new Date(dateOrKey);
	const day = date.getDay();
	return addDays(date, day === 0 ? -6 : 1 - day);
}

export function lastDayOfMonth(year, monthIndex) {
	return new Date(year, monthIndex + 1, 0, 12).getDate();
}

export function getMonthGrid(monthDate) {
	const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 12);
	const start = startOfWeek(first);
	return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function dateRange(startKey, endKey) {
	const days = [];
	for (let cursor = fromDateKey(startKey); toDateKey(cursor) <= endKey; cursor = addDays(cursor, 1)) {
		days.push(toDateKey(cursor));
	}
	return days;
}

export function formatDayHeading(date = new Date()) {
	return new Intl.DateTimeFormat("en", {
		weekday: "long",
		month: "long",
		day: "numeric",
	}).format(date);
}

export function formatShortDate(dateOrKey) {
	const date = typeof dateOrKey === "string" ? fromDateKey(dateOrKey) : dateOrKey;
	return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

export function formatFullDate(dateOrKey) {
	const date = typeof dateOrKey === "string" ? fromDateKey(dateOrKey) : dateOrKey;
	return new Intl.DateTimeFormat("en", {
		weekday: "long",
		month: "long",
		day: "numeric",
		year: "numeric",
	}).format(date);
}

export function formatMonth(date) {
	return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(date);
}

export function isToday(dateOrKey) {
	return toDateKey(typeof dateOrKey === "string" ? fromDateKey(dateOrKey) : dateOrKey) === toDateKey();
}

export function isPast(dateKey) {
	return dateKey < toDateKey();
}

export function weekdayLabel(dayIndex, length = "short") {
	const base = new Date(2026, 0, 4 + dayIndex, 12);
	return new Intl.DateTimeFormat("en", { weekday: length }).format(base);
}
