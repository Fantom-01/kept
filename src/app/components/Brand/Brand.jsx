import { FiCheck } from "react-icons/fi";
import { Link } from "react-router-dom";
import "./Brand.css";

export default function Brand({ compact = false, to = "/app" }) {
	return (
		<Link className={`kept-brand ${compact ? "compact" : ""}`} to={to} aria-label="Kept home">
			<span><FiCheck /></span>
			{!compact && <strong>kept.</strong>}
		</Link>
	);
}
