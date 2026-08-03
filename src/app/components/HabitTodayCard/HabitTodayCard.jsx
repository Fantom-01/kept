import { useMemo } from "react";
import toast from "react-hot-toast";
import { FiCheck, FiMinus, FiPlus, FiRefreshCw, FiRotateCcw, FiX } from "react-icons/fi";
import { Link } from "react-router-dom";
import { useClearCheckIn, useSaveCheckIn } from "../../hooks/useHabitData.js";
import { getCheckIn, getHabitSlots, getHabitStats, isSuccessfulCheckIn, describeSchedule } from "../../utils/habitUtils.js";
import HabitIcon from "../HabitIcon/HabitIcon.jsx";
import "./HabitTodayCard.css";

function friendlyTime(slot) {
	if (slot === "anytime") return "Anytime";
	const [hour, minute] = slot.split(":").map(Number);
	return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(2026, 0, 1, hour, minute));
}

export default function HabitTodayCard({ habit, dateKey, checkIns }) {
	const saveCheckIn = useSaveCheckIn();
	const clearCheckIn = useClearCheckIn();
	const slots = getHabitSlots(habit);
	const stats = useMemo(() => getHabitStats(habit, checkIns, dateKey), [habit, checkIns, dateKey]);
	const busy = saveCheckIn.isPending || clearCheckIn.isPending;

	function undoToast(input) {
		toast((toastItem) => (
			<span className="kept-undo-toast"><span>Kept. Nicely done.</span><button onClick={async () => { await clearCheckIn.mutateAsync(input); toast.dismiss(toastItem.id); }}>Undo</button></span>
		), { icon: "✓" });
	}

	async function toggleBinary(slot, entry) {
		const input = { habitId: habit.id, dateKey, slot };
		if (isSuccessfulCheckIn(habit, entry)) return clearCheckIn.mutateAsync(input);
		await saveCheckIn.mutateAsync({ ...input, status: "completed", value: 1 });
		undoToast(input);
	}

	async function changeCount(slot, entry, amount) {
		const input = { habitId: habit.id, dateKey, slot };
		const previous = Number(entry?.value || 0);
		const next = Math.max(0, previous + amount);
		if (next === 0) return clearCheckIn.mutateAsync(input);
		await saveCheckIn.mutateAsync({ ...input, status: next >= habit.targetValue ? "completed" : "partial", value: next });
		if (previous < habit.targetValue && next >= habit.targetValue) undoToast(input);
	}

	async function recordQuit(slot, status) {
		const input = { habitId: habit.id, dateKey, slot };
		await saveCheckIn.mutateAsync({ ...input, status, value: status === "sober" ? 1 : 0 });
		if (status === "sober") undoToast(input);
		else toast.custom((toastItem) => (
			<div className={`kept-lapse-toast ${toastItem.visible ? "visible" : "hidden"}`} role="status">
				<span className="kept-lapse-toast-icon"><FiRefreshCw /></span>
				<div><strong>Recorded without judgment</strong><p>A lapse is information. What matters now is your next choice.</p></div>
				<button onClick={() => toast.dismiss(toastItem.id)} aria-label="Dismiss notification"><FiX /></button>
			</div>
		), { duration: 5000, position: "top-center" });
	}

	return (
		<article className="kept-today-card kept-panel" style={{ "--habit-color": habit.color }}>
			<div className="kept-habit-identity">
				<span className="kept-habit-icon"><HabitIcon name={habit.icon} /></span>
				<div>
					<Link to={`/app/habits/${habit.id}`}>{habit.name}</Link>
					<p>{describeSchedule(habit)} · <strong>{stats.currentStreak}</strong> current streak</p>
				</div>
			</div>
			<div className="kept-habit-slots">
				{slots.map((slot) => {
					const entry = getCheckIn(checkIns, habit.id, dateKey, slot);
					const success = isSuccessfulCheckIn(habit, entry);
					return (
						<div className={`kept-slot-row ${success ? "is-complete" : ""} ${entry?.status === "lapse" ? "is-lapse" : ""}`} key={slot}>
							{slots.length > 1 && <span className="kept-slot-time">{friendlyTime(slot)}</span>}
							{habit.mode === "quit" ? (
								<div className="kept-quit-actions">
									<button className={`kept-sober-button ${entry?.status === "sober" ? "active" : ""}`} disabled={busy} onClick={() => entry?.status === "sober" ? clearCheckIn.mutate({ habitId: habit.id, dateKey, slot }) : recordQuit(slot, "sober")}>
										<FiCheck /> {entry?.status === "sober" ? "On track" : "Stayed on track"}
									</button>
									<button className="kept-lapse-button" disabled={busy} onClick={() => recordQuit(slot, "lapse")}>{entry?.status === "lapse" ? "Lapse recorded" : "Record a lapse"}</button>
								</div>
							) : habit.metricType === "count" ? (
								<div className="kept-count-actions">
									<button disabled={busy || !entry?.value} onClick={() => changeCount(slot, entry, -Math.max(1, Math.round(habit.targetValue / 4)))} aria-label={`Remove ${habit.unit}`}><FiMinus /></button>
									<div><strong>{entry?.value || 0}</strong><span>/ {habit.targetValue} {habit.unit}</span></div>
									<button disabled={busy} onClick={() => changeCount(slot, entry, Math.max(1, Math.round(habit.targetValue / 4)))} aria-label={`Add ${habit.unit}`}><FiPlus /></button>
								</div>
							) : (
								<button className={`kept-check-button ${success ? "active" : ""}`} disabled={busy} onClick={() => toggleBinary(slot, entry)}>
									{success ? <><FiCheck /> Done</> : <><span /> Check in</>}
								</button>
							)}
						</div>
					);
				})}
			</div>
			<Link className="kept-card-detail-link" to={`/app/habits/${habit.id}`} aria-label={`View ${habit.name}`}><FiRotateCcw /> History</Link>
		</article>
	);
}
