import { describe, expect, it, vi } from "vitest";
import { isSupabaseClockSkewError, runSupabaseQuery } from "./supabaseRetry.js";

const clockSkewError = { code: "PGRST303", message: "JWT issued at future" };

describe("Supabase query retries", () => {
	it("recognizes only the JWT clock-skew failure", () => {
		expect(isSupabaseClockSkewError(clockSkewError)).toBe(true);
		expect(isSupabaseClockSkewError({ code: "PGRST301", message: "JWT expired" })).toBe(false);
	});

	it("waits and retries a transient clock-skew response", async () => {
		const operation = vi.fn()
			.mockResolvedValueOnce({ data: null, error: clockSkewError })
			.mockResolvedValueOnce({ data: [{ id: 1 }], error: null });
		const wait = vi.fn().mockResolvedValue();
		const warn = vi.fn();

		const result = await runSupabaseQuery("Load habits", operation, { delays: [5_000], wait, warn });

		expect(result.data).toEqual([{ id: 1 }]);
		expect(operation).toHaveBeenCalledTimes(2);
		expect(wait).toHaveBeenCalledWith(5_000);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("Supabase clock skew detected"));
	});

	it("does not retry a permanent database error", async () => {
		const operation = vi.fn().mockResolvedValue({ data: null, error: { code: "42501", message: "permission denied" } });
		const wait = vi.fn();

		await expect(runSupabaseQuery("Load profiles", operation, { delays: [5_000], wait })).rejects.toThrow("Load profiles failed after 1 attempt: permission denied [42501]");
		expect(operation).toHaveBeenCalledTimes(1);
		expect(wait).not.toHaveBeenCalled();
	});

	it("reports the phase after exhausting clock-skew retries", async () => {
		const operation = vi.fn().mockResolvedValue({ data: null, error: clockSkewError });
		const wait = vi.fn().mockResolvedValue();

		await expect(runSupabaseQuery("Record email delivery", operation, { delays: [5_000, 20_000], wait, warn: vi.fn() })).rejects.toThrow("Record email delivery failed after 3 attempts: JWT issued at future [PGRST303]");
		expect(operation).toHaveBeenCalledTimes(3);
	});
});
