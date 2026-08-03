import { useQuery } from "@tanstack/react-query";
import { FiBarChart2, FiCalendar, FiCheckCircle, FiCloudOff, FiLogOut, FiPlus, FiSettings } from "react-icons/fi";
import { NavLink, Outlet } from "react-router-dom";
import { habitApi, runtimeMode } from "../../api/habitApi.js";
import { queryKeys } from "../../api/queryKeys.js";
import Brand from "../../components/Brand/Brand.jsx";
import QueryState from "../../components/QueryState/QueryState.jsx";
import { useAppContext } from "../../context/useAppContext.js";
import useOnlineStatus from "../../hooks/useOnlineStatus.js";
import "./AppLayout.css";

const navigation = [
	{ to: "/app", label: "Today", icon: FiCheckCircle, end: true },
	{ to: "/app/calendar", label: "Calendar", icon: FiCalendar },
	{ to: "/app/progress", label: "Progress", icon: FiBarChart2 },
	{ to: "/app/settings", label: "Settings", icon: FiSettings },
];

export default function AppLayout() {
	const { user, endSession } = useAppContext();
	const online = useOnlineStatus();
	const profile = useQuery({ queryKey: queryKeys.profile, queryFn: () => habitApi.getProfile(), enabled: Boolean(user) });
	const initials = (profile.data?.name || user?.email || "K").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

	async function signOut() {
		await endSession();
	}

	return (
		<div className="kept-app kept-shell">
			{!online && <div className="kept-offline-banner" role="status"><FiCloudOff /> You’re offline. {runtimeMode === "local" ? "Local check-ins still work on this device." : "Your saved record is safe; check-ins need a connection."}</div>}
			<aside className="kept-sidebar">
				<Brand />
				<div className="kept-local-chip"><span /> {runtimeMode === "supabase" ? "cloud" : "local"} data</div>
				<NavLink className="kept-new-habit-button" to="/app/habits/new"><FiPlus /> New habit</NavLink>
				<nav aria-label="Main navigation">
					{navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end}><Icon /> {label}</NavLink>)}
				</nav>
				<div className="kept-sidebar-thought"><span>THIS WEEK</span><p>Consistency beats intensity. Leave a little energy for tomorrow.</p></div>
				<div className="kept-sidebar-account">
					<div className="kept-avatar">{initials}</div>
					<div><strong>{profile.data?.name || "Kept user"}</strong><small>{user.email}</small></div>
					<button onClick={signOut} aria-label="Sign out" title="Sign out"><FiLogOut /></button>
				</div>
			</aside>
			<div className="kept-main-column">
				<header className="kept-mobile-header"><Brand /><div className="kept-mobile-actions"><NavLink to="/app/habits/new" aria-label="New habit"><FiPlus /></NavLink><button onClick={signOut} aria-label="Sign out" title="Sign out"><FiLogOut /></button></div></header>
				<main className="kept-content">
					<QueryState isLoading={profile.isLoading} error={profile.error} onRetry={profile.refetch}><Outlet context={{ profile: profile.data }} /></QueryState>
				</main>
			</div>
			<nav className="kept-bottom-nav" aria-label="Mobile navigation">
				{navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end}><Icon /><span>{label}</span></NavLink>)}
			</nav>
		</div>
	);
}
