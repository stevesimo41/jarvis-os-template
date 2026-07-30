module.exports = {
    getProjectStats: () => ({ activeProjects: 0, byStatus: { inProgress: 0, blocked: 0, completed: 0 }, totalBlockers: 0 }),
    listProjects: () => [],
    assignAgent: () => ({}),
    advanceProject: () => ({})
};
