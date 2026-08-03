import { useMemo, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiFilter } from "react-icons/fi";
import { useSearchParams } from "react-router-dom";
import DaySheet from "../../components/DaySheet/DaySheet.jsx";
import MonthCalendar from "../../components/MonthCalendar/MonthCalendar.jsx";
import QueryState from "../../components/QueryState/QueryState.jsx";
import { useCheckIns, useHabits } from "../../hooks/useHabitData.js";
import { addMonths, formatMonth } from "../../utils/dateUtils.js";
import { getHabitStats } from "../../utils/habitUtils.js";
import "./Calendar.css";

export default function Calendar() {
	const habits = useHabits();
	const checkIns = useCheckIns();
	const [searchParams, setSearchParams] = useSearchParams();
	const selectedHabitId = searchParams.get("habit") || "all";
	const [month, setMonth] = useState(() => new Date());
	const [selectedDate, setSelectedDate] = useState(null);
	const visibleHabits = useMemo(() => (habits.data || []).filter((habit) => !habit.archivedAt), [habits.data]);
	const selectedHabit = visibleHabits.find((habit) => habit.id === selectedHabitId);
	const stats = selectedHabit ? getHabitStats(selectedHabit, checkIns.data || []) : null;

	function changeFilter(event) {
		const value = event.target.value;
		setSearchParams(value === "all" ? {} : { habit: value });
	}

	return (
		<div className="kept-calendar-page">
			<div className="kept-page-heading">
				<div><p className="kept-eyebrow">YOUR RECORD</p><h1>Calendar</h1><p>Progress has texture. Look for the rhythm, not a flawless block of color.</p></div>
				<label className="kept-calendar-filter"><FiFilter /><span className="kept-visually-hidden">Filter calendar by habit</span><select aria-label="Filter calendar by habit" value={selectedHabitId} onChange={changeFilter}><option value="all">All habits</option>{visibleHabits.map((habit) => <option key={habit.id} value={habit.id}>{habit.name}</option>)}</select></label>
			</div>
			<QueryState isLoading={habits.isLoading || checkIns.isLoading} error={habits.error || checkIns.error} onRetry={() => { habits.refetch(); checkIns.refetch(); }}>
				<div className="kept-calendar-toolbar">
					<div><button onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month"><FiChevronLeft /></button><h2>{formatMonth(month)}</h2><button onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month"><FiChevronRight /></button></div>
					{selectedHabit ? <div className="kept-calendar-stats"><span><strong>{stats.currentStreak}</strong> current</span><span><strong>{stats.bestStreak}</strong> best</span><span><strong>{stats.consistency30}%</strong> 30-day</span></div> : <p>{visibleHabits.length} active habits · tap any day for details</p>}
				</div>
				<div style={selectedHabit ? { "--habit-color": selectedHabit.color } : undefined}><MonthCalendar month={month} habits={selectedHabit ? [selectedHabit] : visibleHabits} checkIns={checkIns.data || []} selectedHabitId={selectedHabitId} onDayClick={setSelectedDate} /></div>
				<div className="kept-calendar-legend">
					<span><i className="complete" /> Kept</span><span><i className="partial" /> Partial</span><span><i className="missed" /> Missed / unconfirmed</span><span><i className="lapse" /> Lapse</span><span><i className="scheduled" /> Scheduled</span>
				</div>
				<DaySheet dateKey={selectedDate} habits={selectedHabit ? [selectedHabit] : visibleHabits} checkIns={checkIns.data || []} onClose={() => setSelectedDate(null)} />
			</QueryState>
		</div>
	);
}
