module.exports = {
    getRepository: () => ({ status: "stub" }),
    appendToSheet: async () => ({ ok: true, rows: 0 }),
    status: () => ({ prospects: 0, enrichments: 0, lastRun: null }),
    getProspects: () => []
};
