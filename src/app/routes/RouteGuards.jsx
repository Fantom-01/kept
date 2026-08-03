import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppContext } from "../context/useAppContext.js";
import PageLoader from "../components/PageLoader/PageLoader.jsx";

export function ProtectedRoute() {
	const { user, loading } = useAppContext();
	const location = useLocation();
	if (loading) return <PageLoader />;
	if (!user) return <Navigate to="/app/sign-in" replace state={{ from: location.pathname }} />;
	return <Outlet />;
}

export function PublicOnlyRoute() {
	const { user, loading } = useAppContext();
	if (loading) return <PageLoader />;
	return user ? <Navigate to="/app" replace /> : <Outlet />;
}
