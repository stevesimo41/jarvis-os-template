module.exports = {
    metrics: () => ({ total: 0, active: 0, completed: 0 }),
    getCampaignsDue: () => [],
    createCampaign: () => ({ id: "stub", status: "created" }),
    createNoEmailCampaign: () => ({ id: "stub", status: "created" }),
    listCampaigns: () => [],
    advanceCampaign: async () => ({}),
    executeStep: async () => ({}),
    recordResponse: () => ({})
};
