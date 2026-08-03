import { FiCalendar, FiCheckCircle, FiHeart } from "react-icons/fi";
import { Outlet } from "react-router-dom";
import { runtimeMode } from "../../api/habitApi.js";
import Brand from "../../components/Brand/Brand.jsx";
import "./AuthLayout.css";

export default function AuthLayout() {
	const hosted = runtimeMode === "supabase";
	return (
		<div className="kept-auth-shell">
			<section className="kept-auth-panel">
				<Brand to="/" />
				<div className="kept-auth-message">
					<span>{hosted ? "YOUR PRIVATE PRACTICE" : "LOCAL PREVIEW"}</span>
					<h1>A clearer record of the days you showed up.</h1>
					<p>{hosted ? "Your habits, check-ins, and progress follow you across devices." : "Your preview data stays in this browser."}</p>
				</div>
				<div className="kept-auth-promises">
					<div><FiCheckCircle /><span><strong>Quick check-ins</strong><small>One tap, then move on.</small></span></div>
					<div><FiCalendar /><span><strong>Honest history</strong><small>See wins, misses, and recovery.</small></span></div>
					<div><FiHeart /><span><strong>Warm accountability</strong><small>No shame dressed up as motivation.</small></span></div>
				</div>
			</section>
			<section className="kept-auth-content"><Outlet /></section>
		</div>
	);
}
