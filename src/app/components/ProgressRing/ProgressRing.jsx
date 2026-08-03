import "./ProgressRing.css";

export default function ProgressRing({ value, total, label = "kept", size = "large" }) {
	const percent = total ? Math.round((value / total) * 100) : 0;
	return (
		<div className={`kept-progress-ring ${size}`} style={{ "--progress": `${percent * 3.6}deg` }} aria-label={`${value} of ${total} ${label}`}>
			<div><strong>{value}</strong><span>of {total} {label}</span></div>
		</div>
	);
}
