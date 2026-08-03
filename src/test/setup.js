import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach } from "vitest";

function memoryStorage() {
	let values = new Map();
	return {
		getItem: (key) => values.has(String(key)) ? values.get(String(key)) : null,
		setItem: (key, value) => values.set(String(key), String(value)),
		removeItem: (key) => values.delete(String(key)),
		clear: () => { values = new Map(); },
		key: (index) => Array.from(values.keys())[index] || null,
		get length() { return values.size; },
	};
}

Object.defineProperty(globalThis, "localStorage", { value: memoryStorage(), configurable: true });
Object.defineProperty(globalThis, "sessionStorage", { value: memoryStorage(), configurable: true });
Object.defineProperty(globalThis, "matchMedia", {
	value: (query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
	}),
	configurable: true,
});

beforeEach(() => {
	localStorage.clear();
	sessionStorage.clear();
});

afterEach(() => {
	document.body.innerHTML = "";
});
