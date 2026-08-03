import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import HabitForm from "./HabitForm.jsx";

function renderHabitForm() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});

	return render(
		<MemoryRouter initialEntries={["/app/habits/new"]}>
			<QueryClientProvider client={queryClient}>
				<HabitForm />
			</QueryClientProvider>
		</MemoryRouter>,
	);
}

describe("HabitForm", () => {
	it("keeps custom time slots while moving between form steps", async () => {
		const user = userEvent.setup();
		renderHabitForm();

		await user.type(screen.getByLabelText("Habit name"), "Mobility practice");
		await user.click(screen.getByRole("button", { name: /^continue/i }));

		const firstTime = screen.getByLabelText("Time slot 1");
		fireEvent.input(firstTime, { target: { value: "07:30" } });
		expect(firstTime).toHaveValue("07:30");

		await user.click(screen.getByRole("button", { name: /^continue/i }));
		await user.click(screen.getByRole("button", { name: /^back$/i }));

		expect(screen.getByLabelText("Time slot 1")).toHaveValue("07:30");
	});

	it("gives support toggles and repeated time controls distinct accessible names", async () => {
		const user = userEvent.setup();
		renderHabitForm();

		await user.type(screen.getByLabelText("Habit name"), "Read intentionally");
		await user.click(screen.getByRole("button", { name: /^continue/i }));
		await user.click(screen.getByRole("button", { name: /add another time/i }));

		expect(screen.getByRole("button", { name: "Remove time slot 1" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Remove time slot 2" })).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /^continue/i }));

		expect(screen.getByRole("button", { name: "Toggle reminders" })).toHaveAttribute("aria-pressed", "true");
		expect(screen.getByRole("button", { name: "Toggle milestone" })).toHaveAttribute("aria-pressed", "false");
	});
});
