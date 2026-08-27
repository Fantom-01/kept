const DEFAULT_CLOCK_SKEW_DELAYS = [5_000, 20_000, 60_000];

function errorSummary(error) {
	const code = error?.code ? ` [${error.code}]` : "";
	return `${error?.message || String(error)}${code}`;
}

function contextualError(label, error, attempts) {
	return new Error(`${label} failed after ${attempts} ${attempts === 1 ? "attempt" : "attempts"}: ${errorSummary(error)}`, { cause: error });
}

export function isSupabaseClockSkewError(error) {
	return /JWT issued at future/i.test(error?.message || "");
}

export async function runSupabaseQuery(label, operation, {
	delays = DEFAULT_CLOCK_SKEW_DELAYS,
	wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
	warn = console.warn,
} = {}) {
	for (let attempt = 0; attempt <= delays.length; attempt += 1) {
		let result;
		try {
			result = await operation();
		} catch (error) {
			if (!isSupabaseClockSkewError(error) || attempt === delays.length) throw contextualError(label, error, attempt + 1);
			warn(`${label}: Supabase clock skew detected; retrying in ${Math.round(delays[attempt] / 1000)}s (${attempt + 1}/${delays.length}).`);
			await wait(delays[attempt]);
			continue;
		}

		if (!result?.error) return result;
		if (!isSupabaseClockSkewError(result.error) || attempt === delays.length) {
			throw contextualError(label, result.error, attempt + 1);
		}

		warn(`${label}: Supabase clock skew detected; retrying in ${Math.round(delays[attempt] / 1000)}s (${attempt + 1}/${delays.length}).`);
		await wait(delays[attempt]);
	}

	throw new Error(`${label} failed unexpectedly.`);
}
