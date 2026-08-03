import { FiAward, FiCalendar, FiFlag } from "react-icons/fi";
import { formatShortDate } from "../../utils/dateUtils.js";
import { getMilestoneProgress } from "../../utils/habitUtils.js";
import "./MilestoneCard.css";

export default function MilestoneCard({ milestone, habit, checkIns, compact = false }) {
	const result = getMilestoneProgress(milestone, habit, checkIns);
	return (
		<article className={`kept-milestone-card kept-panel ${compact ? "compact" : ""} ${result.status}`}>
			<div className="kept-milestone-icon">{result.status === "achieved" ? <FiAward /> : <FiFlag />}</div>
			<div className="kept-milestone-copy">
				<span>{milestone.type === "streak" ? "STREAK MILESTONE" : "COUNT MILESTONE"}</span>
				<strong>{milestone.targetValue} {milestone.type === "streak" ? "successful periods" : habit.metricType === "count" ? habit.unit : "check-ins"}</strong>
				{milestone.dueDate && <small><FiCalendar /> Due {formatShortDate(milestone.dueDate)}</small>}
			</div>
			<div className="kept-milestone-value"><strong>{Math.min(result.progress, milestone.targetValue)}</strong><span>/ {milestone.targetValue}</span></div>
			<div className="kept-milestone-track"><span style={{ width: `${result.percent}%` }} /></div>
			{!compact && (milestone.rewardText || milestone.consequenceText) && (
				<div className="kept-milestone-promises">
					{milestone.rewardText && <p><span>Reward</span>{milestone.rewardText}</p>}
					{milestone.consequenceText && <p><span>If missed</span>{milestone.consequenceText}</p>}
				</div>
			)}
		</article>
	);
}
