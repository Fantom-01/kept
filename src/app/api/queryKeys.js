export const queryKeys = {
	session: ["session"],
	profile: ["profile"],
	habits: ["habits"],
	habit: (habitId) => ["habits", habitId],
	checkIns: ["check-ins"],
	milestones: ["milestones"],
};
