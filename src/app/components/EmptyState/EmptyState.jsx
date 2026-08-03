import { Link } from "react-router-dom";
import "./EmptyState.css";

export default function EmptyState({ icon, title, message, action, to }) {
	return (
		<div className="kept-empty-state">
			<span>{icon}</span>
			<h2>{title}</h2>
			<p>{message}</p>
			{action && to && <Link className="kept-primary-button" to={to}>{action}</Link>}
		</div>
	);
}
