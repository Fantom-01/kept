import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App.jsx";
import { localAdapter } from "./app/api/adapters/localAdapter.js";
import { AppProvider } from "./app/context/AppContext.jsx";

async function renderSignedInApp() {
	const attempt = await localAdapter.requestOtp("you@kept.local");
	await localAdapter.verifyOtp(attempt.email, attempt.devCode);
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});

	return render(
		<MemoryRouter initialEntries={["/app"]}>
			<QueryClientProvider client={queryClient}>
				<AppProvider>
					<App />
				</AppProvider>
			</QueryClientProvider>
		</MemoryRouter>,
	);
}

describe("Kept app shell", () => {
	it("signs out cleanly without showing an expired-session error", async () => {
		const user = userEvent.setup();
		await renderSignedInApp();

		await screen.findByRole("heading", { name: /good (morning|afternoon|evening), alex/i });
		const signOutButtons = screen.getAllByRole("button", { name: "Sign out" });
		expect(signOutButtons).toHaveLength(2);
		await user.click(signOutButtons[0]);

		expect(await screen.findByRole("heading", { name: "Continue with email" })).toBeInTheDocument();
		expect(screen.queryByText("Something went sideways.")).not.toBeInTheDocument();
	});

	it("uses a supportive custom notification for a recorded lapse", async () => {
		const user = userEvent.setup();
		await renderSignedInApp();

		const lapseButton = await screen.findByRole("button", { name: "Record a lapse" });
		await user.click(lapseButton);

		expect(await screen.findByText("Recorded without judgment")).toBeInTheDocument();
		expect(screen.getByText("A lapse is information. What matters now is your next choice.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Dismiss notification" })).toBeInTheDocument();
	});
});
