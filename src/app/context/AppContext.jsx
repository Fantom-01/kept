import { useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { authApi } from "../api/habitApi.js";
import { queryKeys } from "../api/queryKeys.js";
import { AppContext } from "./appContext.js";

export function AppProvider({ children }) {
	const queryClient = useQueryClient();
	const session = useQuery({
		queryKey: queryKeys.session,
		queryFn: () => authApi.restoreSession(),
		staleTime: Infinity,
		retry: false,
	});

	function startSession(data) {
		queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== queryKeys.session[0] });
		queryClient.setQueryData(queryKeys.session, data);
	}

	async function endSession() {
		await queryClient.cancelQueries();
		await authApi.signOut();
		queryClient.setQueryData(queryKeys.session, null);
	}

	useEffect(() => authApi.onAuthStateChange?.((nextSession) => {
		if (!nextSession) queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== queryKeys.session[0] });
		queryClient.setQueryData(queryKeys.session, nextSession);
	}), [queryClient]);

	return (
		<AppContext.Provider
			value={{
				user: session.data?.user || null,
				loading: session.isLoading,
				startSession,
				endSession,
			}}
		>
			{children}
		</AppContext.Provider>
	);
}
