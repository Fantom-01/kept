import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FiArchive, FiArrowLeft, FiCalendar, FiCheck, FiEdit3, FiFlag, FiPause, FiPlay, FiPlus, FiRotateCcw, FiTrendingUp } from "react-icons/fi";
import { Link, useNavigate, useParams } from "react-router-dom";
import HabitIcon from "../../components/HabitIcon/HabitIcon.jsx";
import MilestoneCard from "../../components/MilestoneCard/MilestoneCard.jsx";
import Modal from "../../components/Modal/Modal.jsx";
import MonthCalendar from "../../components/MonthCalendar/MonthCalendar.jsx";
import QueryState from "../../components/QueryState/QueryState.jsx";
import { useCheckIns, useCreateMilestone, useHabit, useMilestones, useSaveCheckIn, useClearCheckIn, useUpdateHabit } from "../../hooks/useHabitData.js";
import { addDays, dateRange, formatFullDate, formatShortDate, toDateKey } from "../../utils/dateUtils.js";
import { describeSchedule, describeTarget, getCheckIn, getHabitDayState, getHabitSlots, getHabitStats, isHabitScheduledOnDate } from "../../utils/habitUtils.js";
import "./HabitDetails.css";

export default function HabitDetails() {
	const { habitId } = useParams();
	const habit = useHabit(habitId);
	const checkIns = useCheckIns();
	const milestones = useMilestones();
	const updateHabit = useUpdateHabit();
	const navigate = useNavigate();
	const [month] = useState(() => new Date());
	const [editingDate, setEditingDate] = useState(null);
	const [addingMilestone, setAddingMilestone] = useState(false);
	const data = habit.data;
	const stats = useMemo(() => data ? getHabitStats(data, checkIns.data || []) : null, [data, checkIns.data]);
	const history = useMemo(() => {
		if (!data) return [];
		const today = toDateKey();
		const start = data.startDate > toDateKey(addDays(today, -60)) ? data.startDate : toDateKey(addDays(today, -60));
		return dateRange(start, today).filter((dateKey) => isHabitScheduledOnDate(data, dateKey)).reverse().slice(0, 14);
	}, [data]);
	const habitMilestones = (milestones.data || []).filter((item) => item.habitId === habitId);

	async function togglePause() {
		const today = toDateKey();
		const pauses = [...(data.pauses || [])];
		if (data.pausedAt) {
			const openIndex = pauses.findLastIndex((pause) => !pause.endDate);
			if (openIndex >= 0 && pauses[openIndex].startDate === today) pauses.splice(openIndex, 1);
			else if (openIndex >= 0) pauses[openIndex] = { ...pauses[openIndex], endDate: toDateKey(addDays(today, -1)) };
			await updateHabit.mutateAsync({ habitId, changes: { pausedAt: null, pauses } });
			toast.success("Habit resumed. Future check-ins are back on the calendar.");
		} else {
			pauses.push({ startDate: today, endDate: null });
			await updateHabit.mutateAsync({ habitId, changes: { pausedAt: today, pauses } });
			toast("Habit paused. Your previous record stays intact.", { icon: "Ⅱ" });
		}
	}

	async function toggleArchive() {
		await updateHabit.mutateAsync({ habitId, changes: { archivedAt: data.archivedAt ? null : toDateKey() } });
		toast.success(data.archivedAt ? "Habit restored." : "Habit archived. Its history is still here.");
		if (!data.archivedAt) navigate("/app");
	}

	return (
		<QueryState isLoading={habit.isLoading || checkIns.isLoading || milestones.isLoading} error={habit.error || checkIns.error || milestones.error} onRetry={() => { habit.refetch(); checkIns.refetch(); milestones.refetch(); }}>
			{data && <div className="kept-habit-details" style={{ "--habit-color": data.color }}>
				<div className="kept-detail-topbar"><Link to="/app"><FiArrowLeft /> Today</Link><div><button className="kept-secondary-button" onClick={togglePause} disabled={updateHabit.isPending}>{data.pausedAt ? <><FiPlay /> Resume</> : <><FiPause /> Pause</>}</button><Link className="kept-primary-button" to={`/app/habits/${habitId}/edit`}><FiEdit3 /> Edit habit</Link></div></div>

				<header className="kept-detail-hero kept-panel">
					<span className="kept-detail-icon"><HabitIcon name={data.icon} /></span>
					<div><p>{data.mode === "quit" ? "QUIT HABIT" : "BUILD HABIT"}{data.pausedAt ? " · PAUSED" : ""}{data.archivedAt ? " · ARCHIVED" : ""}</p><h1>{data.name}</h1><span>{data.description || "A clear practice with room to keep returning."}</span></div>
					<dl><div><dt>Rhythm</dt><dd>{describeSchedule(data)}</dd></div><div><dt>Target</dt><dd>{describeTarget(data)}</dd></div><div><dt>Started</dt><dd>{formatShortDate(data.startDate)}</dd></div></dl>
				</header>

				<section className="kept-detail-stats">
					<Stat icon={<FiTrendingUp />} value={stats.currentStreak} label="Current streak" detail="Successful scheduled periods" />
					<Stat icon={<FiFlag />} value={stats.bestStreak} label="Best streak" detail="Your longest rhythm" />
					<Stat icon={<FiCheck />} value={`${stats.consistency30}%`} label="30-day consistency" detail={`${stats.successfulDays} successful days total`} />
					<Stat icon={<FiCalendar />} value={stats.totalScheduledDays} label="Opportunities" detail="Since this habit began" />
				</section>

				<div className="kept-detail-grid">
					<section>
						<div className="kept-detail-section-heading"><div><h2>Habit calendar</h2><p>Tap a day to view or correct its record.</p></div><Link to={`/app/calendar?habit=${habitId}`}>Full calendar</Link></div>
						<div style={{ "--habit-color": data.color }}><MonthCalendar month={month} habits={[data]} checkIns={checkIns.data || []} selectedHabitId={habitId} onDayClick={(dateKey) => isHabitScheduledOnDate(data, dateKey) && setEditingDate(dateKey)} /></div>
					</section>

					<aside>
						<div className="kept-detail-section-heading"><div><h2>Recent record</h2><p>History stays editable.</p></div></div>
						<div className="kept-history-list kept-panel">{history.map((dateKey) => { const state = getHabitDayState(data, dateKey, checkIns.data || []); return <button key={dateKey} onClick={() => setEditingDate(dateKey)}><span className={`kept-history-state ${state.state}`}><i /></span><div><strong>{formatShortDate(dateKey)}</strong><small>{historyLabel(state, data)}</small></div><FiEdit3 /></button>; })}</div>
					</aside>
				</div>

				<section className="kept-detail-milestones">
					<div className="kept-detail-section-heading"><div><h2>Milestones</h2><p>Finish lines that support the practice.</p></div><button className="kept-secondary-button" onClick={() => setAddingMilestone(true)}><FiPlus /> Add milestone</button></div>
					{habitMilestones.length ? <div className="kept-detail-milestone-grid">{habitMilestones.map((item) => <MilestoneCard key={item.id} milestone={item} habit={data} checkIns={checkIns.data || []} />)}</div> : <div className="kept-no-milestones kept-panel"><p>No milestones yet. The habit still counts without one.</p></div>}
				</section>

				<footer className="kept-detail-danger"><div><strong>{data.archivedAt ? "Restore this habit" : "Archive this habit"}</strong><p>{data.archivedAt ? "Return it to your active habit list." : "Stop future scheduling while keeping every past check-in."}</p></div><button className={data.archivedAt ? "kept-secondary-button" : "kept-danger-button"} onClick={toggleArchive} disabled={updateHabit.isPending}>{data.archivedAt ? <FiRotateCcw /> : <FiArchive />} {data.archivedAt ? "Restore" : "Archive"}</button></footer>

				<HistoryEditor open={Boolean(editingDate)} dateKey={editingDate} habit={data} checkIns={checkIns.data || []} onClose={() => setEditingDate(null)} />
				<NewMilestoneModal open={addingMilestone} onClose={() => setAddingMilestone(false)} habit={data} />
			</div>}
		</QueryState>
	);
}

function Stat({ icon, value, label, detail }) {
	return <article className="kept-detail-stat kept-panel"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div></article>;
}

function historyLabel(state, habit) {
	if (state.state === "completed") return "Completed";
	if (state.state === "sober") return "Stayed on track";
	if (state.state === "lapse") return "Lapse recorded";
	if (state.state === "partial") return habit.metricType === "count" ? `${state.value} of ${habit.targetValue} ${habit.unit}` : "Partially complete";
	if (state.state === "missed") return habit.mode === "quit" ? "Unconfirmed" : "Missed";
	return "Waiting for check-in";
}

function HistoryEditor({ open, dateKey, habit, checkIns, onClose }) {
	return (
		<Modal open={open} onClose={onClose} title={dateKey ? formatFullDate(dateKey) : "Edit history"} eyebrow="Correct the record">
			<div className="kept-history-editor">
				<p>Changes immediately recalculate this habit’s streaks, consistency, and milestone progress.</p>
				{dateKey && getHabitSlots(habit).map((slot) => <SlotEditor key={slot} slot={slot} dateKey={dateKey} habit={habit} entry={getCheckIn(checkIns, habit.id, dateKey, slot)} />)}
			</div>
		</Modal>
	);
}

function SlotEditor({ slot, dateKey, habit, entry }) {
	const save = useSaveCheckIn();
	const clear = useClearCheckIn();
	const [value, setValue] = useState(entry?.value || 0);
	const input = { habitId: habit.id, dateKey, slot };
	async function saveCount() { const number = Number(value); if (!number) return clear.mutateAsync(input); await save.mutateAsync({ ...input, value: number, status: number >= habit.targetValue ? "completed" : "partial" }); toast.success("History updated."); }
	async function setStatus(status, nextValue) { await save.mutateAsync({ ...input, status, value: nextValue }); toast.success("History updated."); }
	return (
		<div className="kept-slot-editor">
			<div><strong>{slot === "anytime" ? "Daily check-in" : slot}</strong><small>{entry ? `Currently: ${historyLabel(getHabitDayState(habit, dateKey, [entry]), habit)}` : "No check-in recorded"}</small></div>
			{habit.mode === "quit" ? <div className="kept-history-buttons"><button className={entry?.status === "sober" ? "active" : ""} onClick={() => setStatus("sober", 1)}>On track</button><button className={entry?.status === "lapse" ? "lapse active" : "lapse"} onClick={() => setStatus("lapse", 0)}>Lapse</button><button onClick={() => clear.mutateAsync(input)}>Clear</button></div> : habit.metricType === "count" ? <div className="kept-history-count"><input type="number" min="0" value={value} onChange={(event) => setValue(event.target.value)} aria-label={`Amount in ${habit.unit}`} /><span>{habit.unit}</span><button onClick={saveCount}>Save</button></div> : <div className="kept-history-buttons"><button className={entry?.status === "completed" ? "active" : ""} onClick={() => setStatus("completed", 1)}>Completed</button><button onClick={() => clear.mutateAsync(input)}>Clear</button></div>}
		</div>
	);
}

function NewMilestoneModal({ open, onClose, habit }) {
	const create = useCreateMilestone();
	const [form, setForm] = useState({ type: "count", targetValue: habit.metricType === "count" ? habit.targetValue * 10 : 14, dueDate: toDateKey(addDays(new Date(), 30)), rewardText: "", consequenceText: "" });
	function update(field, value) { setForm((current) => ({ ...current, [field]: value })); }
	async function submit(event) { event.preventDefault(); await create.mutateAsync({ ...form, targetValue: Number(form.targetValue), habitId: habit.id }); toast.success("Milestone added."); onClose(); }
	return (
		<Modal open={open} onClose={onClose} title="Add a milestone" eyebrow={habit.name}>
			<form className="kept-new-milestone" onSubmit={submit}>
				<div className="kept-form-field"><label htmlFor="new-milestone-type">Measure</label><select id="new-milestone-type" value={form.type} onChange={(event) => update("type", event.target.value)}><option value="count">Total count</option><option value="streak">Best streak</option></select></div>
				<div className="kept-form-field"><label htmlFor="new-milestone-target">Target</label><input id="new-milestone-target" type="number" min="1" value={form.targetValue} onChange={(event) => update("targetValue", event.target.value)} /></div>
				<div className="kept-form-field"><label htmlFor="new-milestone-due">Due date</label><input id="new-milestone-due" type="date" min={toDateKey()} value={form.dueDate} onChange={(event) => update("dueDate", event.target.value)} /></div>
				<div className="kept-form-field"><label htmlFor="new-milestone-reward">Reward <span>(optional)</span></label><input id="new-milestone-reward" value={form.rewardText} onChange={(event) => update("rewardText", event.target.value)} /></div>
				<div className="kept-form-field"><label htmlFor="new-milestone-cost">If missed <span>(optional)</span></label><input id="new-milestone-cost" value={form.consequenceText} onChange={(event) => update("consequenceText", event.target.value)} /></div>
				<button className="kept-primary-button" disabled={create.isPending}>{create.isPending ? "Adding…" : "Add milestone"}</button>
			</form>
		</Modal>
	);
}
