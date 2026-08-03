import { useMemo } from "react";
import { FiArrowRight, FiAward, FiCheckCircle, FiRefreshCw, FiTrendingUp } from "react-icons/fi";
import { Link } from "react-router-dom";
import HabitIcon from "../../components/HabitIcon/HabitIcon.jsx";
import MilestoneCard from "../../components/MilestoneCard/MilestoneCard.jsx";
import QueryState from "../../components/QueryState/QueryState.jsx";
import { useCheckIns, useHabits, useMilestones } from "../../hooks/useHabitData.js";
import { addDays, toDateKey, weekdayLabel } from "../../utils/dateUtils.js";
import { getHabitDayState, getHabitStats, getMilestoneProgress, isHabitScheduledOnDate } from "../../utils/habitUtils.js";
import "./Progress.css";

export default function Progress() {
	const habits = useHabits();
	const checkIns = useCheckIns();
	const milestones = useMilestones();
	const activeHabits = useMemo(() => (habits.data || []).filter((habit) => !habit.archivedAt), [habits.data]);
	const habitStats = useMemo(() => activeHabits.map((habit) => ({ habit, stats: getHabitStats(habit, checkIns.data || []) })), [activeHabits, checkIns.data]);
	const week = useMemo(() => makeWeek(activeHabits, checkIns.data || []), [activeHabits, checkIns.data]);
	const overall = useMemo(() => {
		const total = week.reduce((sum, day) => sum + day.total, 0);
		const kept = week.reduce((sum, day) => sum + day.kept, 0);
		const consistency = habitStats.length ? Math.round(habitStats.reduce((sum, item) => sum + item.stats.consistency30, 0) / habitStats.length) : 0;
		const best = Math.max(0, ...habitStats.map((item) => item.stats.bestStreak));
		return { total, kept, consistency, best };
	}, [week, habitStats]);
	const milestoneGroups = useMemo(() => {
		const groups = { "in-progress": [], achieved: [], missed: [] };
		(milestones.data || []).forEach((milestone) => {
			const habit = activeHabits.find((item) => item.id === milestone.habitId);
			if (!habit) return;
			const result = getMilestoneProgress(milestone, habit, checkIns.data || []);
			groups[result.status].push({ milestone, habit });
		});
		return groups;
	}, [milestones.data, activeHabits, checkIns.data]);

	return (
		<div className="kept-progress-page">
			<div className="kept-page-heading"><div><p className="kept-eyebrow">THE LONG VIEW</p><h1>Progress</h1><p>Streaks are useful. Consistency and recovery tell the fuller story.</p></div></div>
			<QueryState isLoading={habits.isLoading || checkIns.isLoading || milestones.isLoading} error={habits.error || checkIns.error || milestones.error} onRetry={() => { habits.refetch(); checkIns.refetch(); milestones.refetch(); }}>
				<section className="kept-progress-overview">
					<article className="kept-progress-lead kept-panel"><span>30-DAY CONSISTENCY</span><strong>{overall.consistency}%</strong><p>{overall.consistency >= 80 ? "Your systems are carrying more of the work now." : overall.consistency >= 50 ? "A real rhythm is taking shape. Keep it sustainable." : "The record is early. Focus on returning, not catching up."}</p><div className="kept-big-track"><i style={{ width: `${overall.consistency}%` }} /></div></article>
					<Metric icon={<FiCheckCircle />} value={`${overall.kept}/${overall.total}`} label="Kept this week" />
					<Metric icon={<FiAward />} value={overall.best} label="Best streak" />
					<Metric icon={<FiRefreshCw />} value={activeHabits.length} label="Active practices" />
				</section>

				<section className="kept-week-pulse kept-panel">
					<div className="kept-progress-section-heading"><div><h2>This week’s pulse</h2><p>Successful scheduled habit-days.</p></div><span>{overall.kept} of {overall.total}</span></div>
					<div className="kept-week-bars">{week.map((day) => <div key={day.dateKey}><div><span style={{ height: `${day.percent}%` }} /><i style={{ top: `${100 - day.percent}%` }}>{day.total ? `${day.kept}/${day.total}` : "rest"}</i></div><strong>{day.label}</strong></div>)}</div>
				</section>

				<section className="kept-habit-progress-section">
					<div className="kept-progress-section-heading"><div><h2>Habit by habit</h2><p>Compare recent consistency without turning it into a competition.</p></div></div>
					<div className="kept-habit-progress-grid">{habitStats.map(({ habit, stats }) => <Link key={habit.id} className="kept-habit-progress-card kept-panel" to={`/app/habits/${habit.id}`} style={{ "--habit-color": habit.color }}><span className="kept-progress-habit-icon"><HabitIcon name={habit.icon} /></span><div className="kept-progress-habit-title"><strong>{habit.name}</strong><small>{habit.mode === "quit" ? "Quit habit" : "Build habit"}</small></div><FiArrowRight /><div className="kept-progress-numbers"><span><strong>{stats.currentStreak}</strong>current</span><span><strong>{stats.bestStreak}</strong>best</span><span><strong>{stats.consistency30}%</strong>30 days</span></div><div className="kept-habit-track"><i style={{ width: `${stats.consistency30}%` }} /></div></Link>)}</div>
				</section>

				<section className="kept-progress-milestones">
					<div className="kept-progress-section-heading"><div><h2>Milestones</h2><p>Targets, rewards, and honest outcomes.</p></div><span>{milestoneGroups["in-progress"].length} active</span></div>
					{milestoneGroups["in-progress"].length ? <div className="kept-progress-milestone-grid">{milestoneGroups["in-progress"].map(({ milestone, habit }) => <MilestoneCard key={milestone.id} milestone={milestone} habit={habit} checkIns={checkIns.data || []} />)}</div> : <div className="kept-progress-empty kept-panel"><FiTrendingUp /><p>No active milestones. Add one from a habit’s detail page when a finish line would help.</p></div>}
					{(milestoneGroups.achieved.length > 0 || milestoneGroups.missed.length > 0) && <details className="kept-past-milestones"><summary>Past outcomes ({milestoneGroups.achieved.length + milestoneGroups.missed.length})</summary><div className="kept-progress-milestone-grid">{[...milestoneGroups.achieved, ...milestoneGroups.missed].map(({ milestone, habit }) => <MilestoneCard key={milestone.id} milestone={milestone} habit={habit} checkIns={checkIns.data || []} />)}</div></details>}
				</section>
			</QueryState>
		</div>
	);
}

function Metric({ icon, value, label }) {
	return <article className="kept-progress-metric kept-panel"><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>;
}

function makeWeek(habits, checkIns) {
	return Array.from({ length: 7 }, (_, index) => {
		const date = addDays(new Date(), index - 6);
		const dateKey = toDateKey(date);
		const scheduled = habits.filter((habit) => isHabitScheduledOnDate(habit, dateKey));
		const kept = scheduled.filter((habit) => {
			const state = getHabitDayState(habit, dateKey, checkIns).state;
			return state === "completed" || state === "sober";
		}).length;
		return { dateKey, label: weekdayLabel(date.getDay(), "narrow"), total: scheduled.length, kept, percent: scheduled.length ? Math.round((kept / scheduled.length) * 100) : 4 };
	});
}
