import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import { formatFullDate } from "../../utils/dateUtils.js";
import { formatHabitState, getHabitDayState, isHabitScheduledOnDate } from "../../utils/habitUtils.js";
import HabitIcon from "../HabitIcon/HabitIcon.jsx";
import Modal from "../Modal/Modal.jsx";
import "./DaySheet.css";

export default function DaySheet({ dateKey, habits, checkIns, onClose }) {
	const scheduled = dateKey ? habits.filter((habit) => isHabitScheduledOnDate(habit, dateKey)) : [];
	return (
		<Modal open={Boolean(dateKey)} onClose={onClose} title={dateKey ? formatFullDate(dateKey) : "Day"} eyebrow="Daily record" className="kept-day-sheet">
			<div className="kept-day-sheet-body">
				{scheduled.length ? scheduled.map((habit) => {
					const state = getHabitDayState(habit, dateKey, checkIns);
					return (
						<Link key={habit.id} to={`/app/habits/${habit.id}`} style={{ "--habit-color": habit.color }}>
							<span className="kept-day-habit-icon"><HabitIcon name={habit.icon} /></span>
							<div><strong>{habit.name}</strong><small>{habit.mode === "quit" ? "Quit habit" : habit.metricType === "count" ? `${habit.targetValue} ${habit.unit}` : "Build habit"}</small></div>
							<span className={`kept-day-status ${state.state}`}><i />{formatHabitState(state, habit)}</span>
							<FiArrowRight />
						</Link>
					);
				}) : <div className="kept-day-empty"><span>UNSCHEDULED</span><strong>Nothing was due.</strong><p>This day is intentionally outside your current habit rhythm.</p></div>}
			</div>
		</Modal>
	);
}
