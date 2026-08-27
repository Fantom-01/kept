import { afterEach, describe, expect, it, vi } from "vitest";
import { applyTheme, getPreferredTheme, initializeTheme, THEME_STORAGE_KEY } from "./theme.js";

afterEach(() => {
	delete document.documentElement.dataset.theme;
	document.documentElement.style.colorScheme = "";
	document.querySelector('meta[name="theme-color"]')?.remove();
	vi.restoreAllMocks();
});

describe("theme preferences", () => {
	it("uses and applies a saved preference before the app renders", () => {
		localStorage.setItem(THEME_STORAGE_KEY, "dark");

		expect(getPreferredTheme()).toBe("dark");
		expect(initializeTheme()).toBe("dark");
		expect(document.documentElement.dataset.theme).toBe("dark");
	});

	it("persists a selection and updates the browser theme color", () => {
		const meta = document.createElement("meta");
		meta.name = "theme-color";
		document.head.append(meta);

		applyTheme("dark");

		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
		expect(document.documentElement.style.colorScheme).toBe("dark");
		expect(meta.content).toBe("#111612");
	});
});
