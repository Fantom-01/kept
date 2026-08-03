import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ProtectedRoute, PublicOnlyRoute } from "./app/routes/RouteGuards.jsx";
import PageLoader from "./app/components/PageLoader/PageLoader.jsx";
import Landing from "./pages/Landing/Landing.jsx";
import "./App.css";

const AuthLayout = lazy(() => import("./app/layouts/AuthLayout/AuthLayout.jsx"));
const AppLayout = lazy(() => import("./app/layouts/AppLayout/AppLayout.jsx"));
const SignIn = lazy(() => import("./app/pages/SignIn/SignIn.jsx"));
const Verify = lazy(() => import("./app/pages/Verify/Verify.jsx"));
const Today = lazy(() => import("./app/pages/Today/Today.jsx"));
const Calendar = lazy(() => import("./app/pages/Calendar/Calendar.jsx"));
const Progress = lazy(() => import("./app/pages/Progress/Progress.jsx"));
const HabitForm = lazy(() => import("./app/pages/HabitForm/HabitForm.jsx"));
const HabitDetails = lazy(() => import("./app/pages/HabitDetails/HabitDetails.jsx"));
const Settings = lazy(() => import("./app/pages/Settings/Settings.jsx"));

export default function App() {
	return (
		<>
			<Toaster position="top-right" gutter={12} toastOptions={{ duration: 3500, className: "kept-toast-default" }} />
			<Suspense fallback={<PageLoader />}>
				<Routes>
					<Route path="/" element={<Landing />} />
					<Route element={<PublicOnlyRoute />}>
						<Route element={<AuthLayout />}>
							<Route path="/app/sign-in" element={<SignIn />} />
							<Route path="/app/verify" element={<Verify />} />
						</Route>
					</Route>
					<Route element={<ProtectedRoute />}>
						<Route path="/app" element={<AppLayout />}>
							<Route index element={<Today />} />
							<Route path="calendar" element={<Calendar />} />
							<Route path="progress" element={<Progress />} />
							<Route path="habits/new" element={<HabitForm />} />
							<Route path="habits/:habitId" element={<HabitDetails />} />
							<Route path="habits/:habitId/edit" element={<HabitForm />} />
							<Route path="settings" element={<Settings />} />
						</Route>
					</Route>
					<Route path="/app/*" element={<Navigate to="/app" replace />} />
				</Routes>
			</Suspense>
		</>
	);
}
