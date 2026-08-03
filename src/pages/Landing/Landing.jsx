import { FiArrowRight, FiCalendar, FiCheck, FiTrendingUp } from "react-icons/fi";
import { Link } from "react-router-dom";
import { runtimeMode } from "../../app/api/habitApi.js";
import Brand from "../../app/components/Brand/Brand.jsx";
import "./Landing.css";

const previewHabits = [
	{ name: "Morning walk", color: "#2f7d5b", status: "done" },
	{ name: "Read 20 pages", color: "#e76f51", status: "12 / 20" },
	{ name: "No late-night scrolling", color: "#6d5bd0", status: "on track" },
];

export default function Landing() {
	const hosted = runtimeMode === "supabase";
	return (
		<div className="kept-landing">
			<header>
				<Brand to="/" />
				<Link to="/app/sign-in">{hosted ? "Sign in" : "Open local preview"} <FiArrowRight /></Link>
			</header>
			<main>
				<section className="kept-landing-copy">
					<span className="kept-landing-pill"><FiCheck /> Made for honest progress</span>
					<h1>Keep promises.<br /><em>Not pressure.</em></h1>
					<p>
						Build the habits you want, leave the ones you don’t, and see the full story—even when a streak isn’t perfect.
					</p>
					<div className="kept-landing-actions">
						<Link to="/app/sign-in">{hosted ? "Start tracking" : "Try the local app"} <FiArrowRight /></Link>
						<span>{hosted ? "Private by default. No password needed." : "No account service connected yet."}</span>
					</div>
				</section>

				<section className="kept-product-preview" aria-label="Product preview">
					<div className="kept-preview-topbar">
						<div><small>MONDAY, AUGUST 3</small><strong>Good morning, Alex</strong></div>
						<button aria-label="Add habit">+</button>
					</div>
					<div className="kept-preview-progress">
						<div><span>2</span><small>of 4 kept</small></div>
						<p>Two small promises left for today. You’re closer than you think.</p>
					</div>
					<div className="kept-preview-list">
						{previewHabits.map((habit) => (
							<article key={habit.name} style={{ "--habit-color": habit.color }}>
								<span />
								<div><strong>{habit.name}</strong><small>Current rhythm · 8 days</small></div>
								<button className={habit.status === "done" ? "done" : ""}>
									{habit.status === "done" ? <FiCheck /> : habit.status}
								</button>
							</article>
						))}
					</div>
					<div className="kept-preview-nav"><FiCheck /><FiCalendar /><FiTrendingUp /></div>
				</section>
			</main>
			<footer><span>Build. Quit. Keep going.</span><span>{hosted ? "Private habit tracking · v0.2" : "Local-first preview · v0.1"}</span></footer>
		</div>
	);
}
