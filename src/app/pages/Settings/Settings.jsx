import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FiBell, FiCheck, FiDatabase, FiDownload, FiGlobe, FiHardDrive, FiLock, FiMoon, FiRefreshCw, FiSmartphone, FiSun, FiUser } from "react-icons/fi";
import { useOutletContext } from "react-router-dom";
import { habitApi, runtimeMode } from "../../api/habitApi.js";
import { queryKeys } from "../../api/queryKeys.js";
import { useTheme } from "../../hooks/useTheme.js";
import "./Settings.css";

const commonTimezones = [
	"Africa/Lagos",
	"Europe/London",
	"Europe/Berlin",
	"America/New_York",
	"America/Chicago",
	"America/Los_Angeles",
	"Asia/Dubai",
	"Asia/Tokyo",
	"Australia/Sydney",
];

function applicationServerKey(value) {
	const padding = "=".repeat((4 - (value.length % 4)) % 4);
	const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
	return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}

export default function Settings() {
	const { profile } = useOutletContext();
	const hosted = runtimeMode === "supabase";
	const queryClient = useQueryClient();
	const { theme, toggleTheme } = useTheme();
	const [form, setForm] = useState(profile);
	const [permission, setPermission] = useState(() => "Notification" in window ? Notification.permission : "unsupported");
	const [pushReady, setPushReady] = useState(false);
	const [installPrompt, setInstallPrompt] = useState(() => window.keptInstallPrompt || null);
	const updateProfile = useMutation({
		mutationFn: (changes) => habitApi.updateProfile(changes),
		onSuccess: (saved) => {
			queryClient.setQueryData(queryKeys.profile, saved);
			toast.success("Settings saved.");
		},
	});
	const resetPreview = useMutation({
		mutationFn: () => habitApi.resetLocalPreview(),
		onSuccess: async () => {
			await queryClient.invalidateQueries();
			toast.success("Sample habits restored.");
		},
	});

	useEffect(() => {
		const ready = () => setInstallPrompt(window.keptInstallPrompt || null);
		window.addEventListener("kept:install-ready", ready);
		return () => window.removeEventListener("kept:install-ready", ready);
	}, []);

	useEffect(() => {
		if (!hosted || !("serviceWorker" in navigator)) return;
		navigator.serviceWorker.ready
			.then((registration) => registration.pushManager.getSubscription())
			.then((subscription) => setPushReady(Boolean(subscription)))
			.catch(() => setPushReady(false));
	}, [hosted]);

	const timezoneOptions = useMemo(() => Array.from(new Set([form.timezone, ...commonTimezones])).filter(Boolean), [form.timezone]);

	function update(field, value) {
		setForm((current) => ({ ...current, [field]: value }));
	}

	async function saveProfile(event) {
		event.preventDefault();
		await updateProfile.mutateAsync({
			name: form.name.trim(),
			timezone: form.timezone,
			notificationPrivacy: form.notificationPrivacy,
			emailFallback: form.emailFallback,
		});
	}

	async function enableNotifications() {
		if (!("Notification" in window)) return toast.error("This browser does not support notifications.");
		const result = await Notification.requestPermission();
		setPermission(result);
		if (result === "granted") {
			const registration = await navigator.serviceWorker?.ready;
			if (hosted) {
				const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
				if (!registration || !publicKey) return toast.error("Push reminders are not configured yet.");
				const existing = await registration.pushManager.getSubscription();
				const subscription = existing || await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: applicationServerKey(publicKey),
				});
				await habitApi.savePushSubscription(subscription);
				setPushReady(true);
			}
			if (registration) await registration.showNotification("Kept reminders are ready", { body: "A gentle check-in will appear at the times you choose.", icon: "/pwa-192.png" });
			else new Notification("Kept reminders are ready", { body: "A gentle check-in will appear at the times you choose.", icon: "/pwa-192.png" });
			toast.success(hosted ? "Scheduled reminders enabled." : "Browser notifications enabled.");
		}
	}

	async function testNotification() {
		if (permission !== "granted") return enableNotifications();
		const registration = await navigator.serviceWorker?.getRegistration();
		if (registration) await registration.showNotification("A habit is waiting", { body: form.notificationPrivacy === "private" ? "A small check-in keeps your record honest." : "Open Kept for your next check-in.", icon: "/pwa-192.png" });
		else new Notification("A habit is waiting", { body: "Open Kept for your next check-in." });
	}

	async function installApp() {
		if (!installPrompt) return;
		await installPrompt.prompt();
		await installPrompt.userChoice;
		window.keptInstallPrompt = null;
		setInstallPrompt(null);
	}

	async function exportData() {
		const data = await habitApi.exportData();
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `kept-export-${new Date().toISOString().slice(0, 10)}.json`;
		link.click();
		URL.revokeObjectURL(url);
		toast.success("Data exported.");
	}

	function confirmReset() {
		if (window.confirm("Replace your current local habits and check-ins with the original sample data?")) resetPreview.mutate();
	}

	return (
		<div className="kept-settings-page">
			<div className="kept-page-heading"><div><p className="kept-eyebrow">YOUR SPACE</p><h1>Settings</h1><p>Adjust how Kept feels, reminds you, and stores your record.</p></div></div>

			<div className="kept-settings-grid">
				<nav aria-label="Settings sections"><a href="#appearance"><FiMoon /> Appearance</a><a href="#profile"><FiUser /> Profile</a><a href="#reminders"><FiBell /> Reminders</a><a href="#app"><FiSmartphone /> App install</a><a href="#data"><FiDatabase /> Local data</a></nav>
				<div className="kept-settings-content">
					<section id="appearance" className="kept-settings-section kept-panel">
						<header><span>{theme === "dark" ? <FiMoon /> : <FiSun />}</span><div><h2>Appearance</h2><p>Choose the palette that feels easiest on your eyes.</p></div></header>
						<div className="kept-settings-body">
							<div className="kept-setting-row kept-theme-row"><div><strong>Dark mode</strong><p>{theme === "dark" ? "On · using the low-light palette" : "Off · using the light palette"}</p></div><button type="button" className={`kept-theme-switch ${theme}`} role="switch" aria-checked={theme === "dark"} aria-label="Dark mode" onClick={toggleTheme}><FiSun aria-hidden="true" /><span aria-hidden="true"><i /></span><FiMoon aria-hidden="true" /></button></div>
						</div>
					</section>

					<section id="profile" className="kept-settings-section kept-panel">
						<header><span><FiUser /></span><div><h2>Profile and timezone</h2><p>{hosted ? "Your saved timezone keeps reminders and calendar days aligned wherever you travel." : "The local preview follows this device’s calendar day."}</p></div></header>
						<form onSubmit={saveProfile}>
							<div className="kept-form-field"><label htmlFor="settings-name">Display name</label><input id="settings-name" value={form.name} onChange={(event) => update("name", event.target.value)} required /></div>
							<div className="kept-form-field"><label htmlFor="settings-timezone">Reminder timezone</label><select id="settings-timezone" value={form.timezone} onChange={(event) => update("timezone", event.target.value)}>{timezoneOptions.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}</select><small>Historical records keep their original date. Local day boundaries continue to follow this device.</small></div>
							<button className="kept-primary-button" disabled={updateProfile.isPending}>{updateProfile.isPending ? "Saving…" : "Save profile"}</button>
						</form>
					</section>

					<section id="reminders" className="kept-settings-section kept-panel">
						<header><span><FiBell /></span><div><h2>Reminder defaults</h2><p>{hosted ? "Enable push delivery for the time slots on each habit; email can step in when push is unavailable." : "Local testing can verify browser permission and notification appearance."}</p></div></header>
						<div className="kept-settings-body">
							<div className="kept-setting-row"><div><strong>Browser notifications</strong><p>Current permission: <span className={`permission-${permission}`}>{permission}</span>{hosted && pushReady ? " · subscribed" : ""}</p></div><button className="kept-secondary-button" onClick={permission === "granted" && (!hosted || pushReady) ? testNotification : enableNotifications}>{permission === "granted" && (!hosted || pushReady) ? "Send test" : "Enable"}</button></div>
							<div className="kept-form-field"><label htmlFor="notification-copy">Lock-screen text</label><select id="notification-copy" value={form.notificationPrivacy} onChange={(event) => update("notificationPrivacy", event.target.value)}><option value="habit-name">Show the habit name</option><option value="private">Use private generic text</option></select></div>
							<label className="kept-setting-checkbox"><input type="checkbox" checked={form.emailFallback} onChange={(event) => update("emailFallback", event.target.checked)} /><span><strong>Email fallback</strong><small>Use Resend only when there is no active push subscription.</small></span></label>
							<button className="kept-primary-button" onClick={saveProfile} disabled={updateProfile.isPending}>Save reminder defaults</button>
						</div>
					</section>

					<section id="app" className="kept-settings-section kept-panel">
						<header><span><FiSmartphone /></span><div><h2>Install Kept</h2><p>{hosted ? "Install Kept for a focused app experience and reliable push notifications." : "Use a production preview to test the manifest, offline shell, and Home Screen experience locally."}</p></div></header>
						<div className="kept-settings-body">
							<div className="kept-install-card"><div className="kept-install-icon"><FiCheck /></div><div><strong>Keep it within reach</strong><p>{installPrompt ? "This browser is ready to install Kept." : "If the install button is unavailable, use your browser’s Add to Home Screen or Install App menu."}</p></div><button className="kept-primary-button" onClick={installApp} disabled={!installPrompt}>Install app</button></div>
							<div className="kept-ios-note"><FiGlobe /><p><strong>Testing on iPhone?</strong><span>Open the local/hosted address in Safari, use Share → Add to Home Screen, then launch Kept from the new icon before enabling push.</span></p></div>
						</div>
					</section>

					<section id="data" className="kept-settings-section kept-panel">
						<header><span><FiHardDrive /></span><div><h2>{hosted ? "Account data" : "Local preview data"}</h2><p>{hosted ? "Your private record is stored in Supabase and can be downloaded whenever you like." : "Everything currently lives in this browser."}</p></div><span className="kept-runtime-badge">{runtimeMode}</span></header>
						<div className="kept-settings-body">
							<div className="kept-data-actions"><button className="kept-secondary-button" onClick={exportData}><FiDownload /> Export JSON</button>{!hosted && <button className="kept-danger-button" onClick={confirmReset} disabled={resetPreview.isPending}><FiRefreshCw /> {resetPreview.isPending ? "Resetting…" : "Reset sample data"}</button>}</div>
							<div className="kept-data-note"><FiLock /><p>{hosted ? "Row-level security keeps every habit, check-in, milestone, and device subscription scoped to your account." : "No network requests are made for accounts, habits, check-ins, or milestones."}</p></div>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
