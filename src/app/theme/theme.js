export const THEME_STORAGE_KEY = "kept_theme";
export const THEMES = ["light", "dark"];

const themeColors = {
	light: "#f4f1e8",
	dark: "#111612",
};

function isTheme(value) {
	return THEMES.includes(value);
}

export function getPreferredTheme() {
	if (typeof window === "undefined") return "light";
	const saved = window.localStorage?.getItem(THEME_STORAGE_KEY);
	if (isTheme(saved)) return saved;
	return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getCurrentTheme() {
	if (typeof document === "undefined") return getPreferredTheme();
	return isTheme(document.documentElement.dataset.theme)
		? document.documentElement.dataset.theme
		: getPreferredTheme();
}

export function applyTheme(theme, { persist = true, announce = true } = {}) {
	const nextTheme = isTheme(theme) ? theme : "light";
	if (typeof document !== "undefined") {
		document.documentElement.dataset.theme = nextTheme;
		document.documentElement.style.colorScheme = nextTheme;
		document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColors[nextTheme]);
	}
	if (persist && typeof window !== "undefined") window.localStorage?.setItem(THEME_STORAGE_KEY, nextTheme);
	if (announce && typeof window !== "undefined") {
		window.dispatchEvent(new CustomEvent("kept:theme-change", { detail: { theme: nextTheme } }));
	}
	return nextTheme;
}

export function initializeTheme() {
	return applyTheme(getPreferredTheme(), { persist: false, announce: false });
}
