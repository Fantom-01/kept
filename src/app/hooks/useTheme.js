import { useCallback, useEffect, useState } from "react";
import { applyTheme, getCurrentTheme } from "../theme/theme.js";

export function useTheme() {
	const [theme, setThemeState] = useState(getCurrentTheme);

	useEffect(() => {
		function handleThemeChange(event) {
			setThemeState(event.detail.theme);
		}
		window.addEventListener("kept:theme-change", handleThemeChange);
		return () => window.removeEventListener("kept:theme-change", handleThemeChange);
	}, []);

	const setTheme = useCallback((nextTheme) => applyTheme(nextTheme), []);
	const toggleTheme = useCallback(() => applyTheme(getCurrentTheme() === "dark" ? "light" : "dark"), []);

	return { theme, setTheme, toggleTheme };
}
