import { getMonthGrid, isToday, toDateKey } from "../../utils/dateUtils.js";
import { formatHabitState, getHabitDayState, isHabitScheduledOnDate } from "../../utils/habitUtils.js";
import "./MonthCalendar.css";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MonthCalendar({ month, habits, checkIns, selectedHabitId = "all", onDayClick }) {
	const days = getMonthGrid(month);
	const selectedHabit = habits.find((habit) => habit.id === selectedHabitId);
	return (
		<div className={`kept-month-calendar kept-panel ${selectedHabit ? "single-habit" : "combined"}`}>
			<div className="kept-calendar-weekdays">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
			<div className="kept-calendar-grid">
				{days.map((date) => {
					const dateKey = toDateKey(date);
					const inMonth = date.getMonth() === month.getMonth();
					const scheduledHabits = habits.filter((habit) => isHabitScheduledOnDate(habit, dateKey));
					const singleState = selectedHabit ? getHabitDayState(selectedHabit, dateKey, checkIns) : null;
					return (
						<button
							key={dateKey}
							className={`kept-calendar-day ${inMonth ? "" : "outside"} ${isToday(dateKey) ? "today" : ""} ${singleState ? `state-${singleState.state}` : ""}`}
							onClick={() => onDayClick(dateKey)}
							aria-label={`${date.toLocaleDateString("en", { month: "long", day: "numeric" })}, ${scheduledHabits.length} scheduled habits`}
						>
							<time>{date.getDate()}</time>
							{selectedHabit ? (
								singleState?.state !== "unscheduled" && <span className="kept-single-state"><i />{formatHabitState(singleState, selectedHabit)}</span>
							) : (
								<div className="kept-day-markers">
									{scheduledHabits.slice(0, 4).map((habit) => {
										const state = getHabitDayState(habit, dateKey, checkIns);
										return <span key={habit.id} className={`state-${state.state}`} style={{ "--marker-color": habit.color }} title={`${habit.name}: ${formatHabitState(state, habit)}`} />;
									})}
									{scheduledHabits.length > 4 && <small>+{scheduledHabits.length - 4}</small>}
								</div>
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}
