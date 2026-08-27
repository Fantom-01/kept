import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App.jsx";
import { queryClient } from "./app/api/queryClient.js";
import { AppProvider } from "./app/context/AppContext.jsx";
import { initializeTheme } from "./app/theme/theme.js";

initializeTheme();

window.addEventListener("beforeinstallprompt", (event) => {
	event.preventDefault();
	window.keptInstallPrompt = event;
	window.dispatchEvent(new CustomEvent("kept:install-ready"));
});

if ("serviceWorker" in navigator && import.meta.env.PROD) {
	window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js"));
}

createRoot(document.getElementById("root")).render(
	<StrictMode>
		<BrowserRouter>
			<QueryClientProvider client={queryClient}>
				<AppProvider>
					<App />
				</AppProvider>
			</QueryClientProvider>
		</BrowserRouter>
	</StrictMode>,
);
