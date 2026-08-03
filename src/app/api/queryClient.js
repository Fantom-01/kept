import { QueryClient } from "@tanstack/react-query";

function shouldRetry(failureCount, error) {
	if (error?.status >= 400 && error?.status < 500) return false;
	return failureCount < 2;
}

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 20_000,
			gcTime: 10 * 60_000,
			retry: shouldRetry,
			refetchOnWindowFocus: true,
			refetchOnReconnect: true,
		},
		mutations: { retry: false },
	},
});
