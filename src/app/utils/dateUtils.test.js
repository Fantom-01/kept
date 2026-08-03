import { describe, expect, it } from "vitest";
import { addMonths, dateRange, toDateKey } from "./dateUtils.js";

describe("date utilities", () => {
	it("moves between months without skipping a shorter month", () => {
		expect(toDateKey(addMonths("2026-01-31", 1))).toBe("2026-02-28");
		expect(toDateKey(addMonths("2026-03-31", -1))).toBe("2026-02-28");
	});

	it("builds inclusive calendar ranges", () => {
		expect(dateRange("2026-02-27", "2026-03-02")).toEqual([
			"2026-02-27",
			"2026-02-28",
			"2026-03-01",
			"2026-03-02",
		]);
	});
});
