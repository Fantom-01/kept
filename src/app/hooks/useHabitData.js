import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { habitApi } from "../api/habitApi.js";
import { queryKeys } from "../api/queryKeys.js";

export function useHabits() {
	return useQuery({ queryKey: queryKeys.habits, queryFn: () => habitApi.getHabits() });
}

export function useHabit(habitId) {
	return useQuery({
		queryKey: queryKeys.habit(habitId),
		queryFn: () => habitApi.getHabit(habitId),
		enabled: Boolean(habitId),
	});
}

export function useCheckIns() {
	return useQuery({ queryKey: queryKeys.checkIns, queryFn: () => habitApi.getCheckIns() });
}

export function useMilestones() {
	return useQuery({ queryKey: queryKeys.milestones, queryFn: () => habitApi.getMilestones() });
}

function useInvalidateHabitData() {
	const queryClient = useQueryClient();
	return () => Promise.all([
		queryClient.invalidateQueries({ queryKey: queryKeys.habits }),
		queryClient.invalidateQueries({ queryKey: queryKeys.checkIns }),
		queryClient.invalidateQueries({ queryKey: queryKeys.milestones }),
	]);
}

export function useSaveCheckIn() {
	const invalidate = useInvalidateHabitData();
	return useMutation({ mutationFn: (input) => habitApi.saveCheckIn(input), onSuccess: invalidate });
}

export function useClearCheckIn() {
	const invalidate = useInvalidateHabitData();
	return useMutation({ mutationFn: (input) => habitApi.clearCheckIn(input), onSuccess: invalidate });
}

export function useCreateHabit() {
	const invalidate = useInvalidateHabitData();
	return useMutation({ mutationFn: (input) => habitApi.createHabit(input), onSuccess: invalidate });
}

export function useUpdateHabit() {
	const invalidate = useInvalidateHabitData();
	return useMutation({ mutationFn: ({ habitId, changes }) => habitApi.updateHabit(habitId, changes), onSuccess: invalidate });
}

export function useCreateMilestone() {
	const invalidate = useInvalidateHabitData();
	return useMutation({ mutationFn: (input) => habitApi.createMilestone(input), onSuccess: invalidate });
}
