import { useMemo } from "react";
import { FiArrowRight, FiCalendar, FiPlus } from "react-icons/fi";
import { Link, useOutletContext } from "react-router-dom";
import EmptyState from "../../components/EmptyState/EmptyState.jsx";
import HabitTodayCard from "../../components/HabitTodayCard/HabitTodayCard.jsx";
import MilestoneCard from "../../components/MilestoneCard/MilestoneCard.jsx";
import ProgressRing from "../../components/ProgressRing/ProgressRing.jsx";
import QueryState from "../../components/QueryState/QueryState.jsx";
import { useCheckIns, useHabits, useMilestones } from "../../hooks/useHabitData.js";
import { formatDayHeading, toDateKey } from "../../utils/dateUtils.js";
import { getHabitSlots, getCheckIn, isHabitScheduledOnDate, isSuccessfulCheckIn, getMilestoneProgress } from "../../utils/habitUtils.js";
import "./Today.css";

function greeting() {
	const hour = new Date().getHours();
	if (hour < 12) return "Good morning";
	if (hour < 18) return "Good afternoon";
	return "Good evening";
}

export default function Today() {
	const { profile } = useOutletContext();
	const habits = useHabits();
	const checkIns = useCheckIns();
	const milestones = useMilestones();
	const todayKey = toDateKey();

	const activeHabits = useMemo(() => (habits.data || []).filter((habit) => !habit.archivedAt && !habit.pausedAt), [habits.data]);
	const todayHabits = useMemo(() => activeHabits.filter((habit) => isHabitScheduledOnDate(habit, todayKey)), [activeHabits, todayKey]);
	const summary = useMemo(() => {
		let total = 0;
		let completed = 0;
		todayHabits.forEach((habit) => getHabitSlots(habit).forEach((slot) => {
			total += 1;
			if (isSuccessfulCheckIn(habit, getCheckIn(checkIns.data || [], habit.id, todayKey, slot))) completed += 1;
		}));
		return { total, completed };
	}, [todayHabits, checkIns.data, todayKey]);

	const activeMilestones = useMemo(() => (milestones.data || []).map((milestone) => {
		const habit = activeHabits.find((item) => item.id === milestone.habitId);
		return habit ? { milestone, habit, result: getMilestoneProgress(milestone, habit, checkIns.data || []) } : null;
	}).filter(Boolean).filter((item) => item.result.status === "in-progress").slice(0, 2), [milestones.data, activeHabits, checkIns.data]);

	const loading = habits.isLoading || checkIns.isLoading || milestones.isLoading;
	const error = habits.error || checkIns.error || milestones.error;

	return (
		<div className="kept-today">
			<div className="kept-page-heading kept-today-heading">
				<div><p className="kept-eyebrow">{formatDayHeading().toUpperCase()}</p><h1>{greeting()}, {profile.name?.split(" ")[0] || "there"}</h1><p>Keep the record honest. The day doesn’t need to be perfect.</p></div>
				<Link className="kept-primary-button" to="/app/habits/new"><FiPlus /> New habit</Link>
			</div>

			<QueryState isLoading={loading} error={error} onRetry={() => { habits.refetch(); checkIns.refetch(); milestones.refetch(); }}>
				{activeHabits.length === 0 ? (
					<EmptyState icon={<FiCalendar />} title="Start with one honest habit" message="Pick something small enough to do on a difficult day. You can build from there." action="Create your first habit" to="/app/habits/new" />
				) : (
					<>
						<section className="kept-day-summary">
							<ProgressRing value={summary.completed} total={summary.total} />
							<div><span>TODAY’S RHYTHM</span><h2>{summary.total === 0 ? "A quiet day in your schedule." : summary.completed === summary.total ? "Everything scheduled is kept." : `${summary.total - summary.completed} small ${summary.total - summary.completed === 1 ? "promise" : "promises"} left.`}</h2><p>{summary.total === 0 ? "Rest counts when it’s part of the plan." : summary.completed === summary.total ? "Enjoy the feeling—then let the streak take care of itself." : "You don’t need a burst of motivation. Just the next check-in."}</p></div>
							<Link to="/app/calendar">See the month <FiArrowRight /></Link>
						</section>

						<div className="kept-today-grid">
							<section className="kept-today-list-section">
								<div className="kept-section-heading"><div><h2>Scheduled for today</h2><p>{todayHabits.length} {todayHabits.length === 1 ? "habit" : "habits"} in today’s plan.</p></div><span>{summary.completed}/{summary.total}</span></div>
								{todayHabits.length ? <div className="kept-today-list">{todayHabits.map((habit) => <HabitTodayCard key={habit.id} habit={habit} dateKey={todayKey} checkIns={checkIns.data || []} />)}</div> : <div className="kept-rest-day kept-panel"><span>REST DAY</span><h3>Nothing is due today.</h3><p>Your habit history remains exactly as planned. Take the day without inventing extra work.</p></div>}
							</section>

							<aside className="kept-today-aside">
								<div className="kept-section-heading"><div><h2>Within reach</h2><p>Milestones moving forward.</p></div><Link to="/app/progress">All</Link></div>
								{activeMilestones.length ? <div className="kept-today-milestones">{activeMilestones.map(({ milestone, habit }) => <MilestoneCard key={milestone.id} milestone={milestone} habit={habit} checkIns={checkIns.data || []} compact />)}</div> : <div className="kept-aside-empty kept-panel"><p>No active milestones. Add one when a habit needs a finish line.</p></div>}
								<div className="kept-week-note kept-panel"><span>A BETTER STREAK</span><strong>Show up again.</strong><p>The best recovery metric is how quickly you return after a miss.</p></div>
							</aside>
						</div>
					</>
				)}
			</QueryState>
		</div>
	);
}
