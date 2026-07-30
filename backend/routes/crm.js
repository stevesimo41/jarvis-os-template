const express =
    require("express");

const crm =
    require("../crm/crmEngine");

const liveCrmService =
    require("../services/liveCrmService");
const { requireRole } = require("../auth/localAuth");
const { sendError } = require("../http/apiResponse");
const portfolioService = require("../crm/portfolioService");
const xodusAgent = require("../agents/xodusMissionAgentService");
const jarvisOpps = require("../agents/jarvisOpportunitiesService");

const router =
    express.Router();

router.get(
    "/workspace/status",
    async (req, res) => {
        const venture = req.query.venture || "well-noticed";
        if (venture !== "well-noticed") {
            return res.json({
                status: "online",
                connected: false,
                mode: "local",
                venture,
                source: `JARVIS local CRM — ${venture} data`,
                provider: "json"
            });
        }
        try {
            const liveStatus = await liveCrmService.getStatus();
            res.json({
                status: "online",
                connected: true,
                mode: "live",
                venture,
                source: liveStatus.spreadsheet?.title || "Google Sheets CRM",
                provider: "google-sheets",
                spreadsheet: liveStatus.spreadsheet,
                entities: liveStatus.entities
            });
        } catch (error) {
            res.json({
                status: "online",
                connected: false,
                mode: "local",
                venture,
                source: "JARVIS local CRM (Google Sheets unavailable)",
                provider: "json",
                error: error.message
            });
        }
    }
);

function getVentureRecords(venture) {
    if (venture === "xodus") {
        const candidates = xodusAgent.getCandidatesByLane() || [];
        return candidates.map(c => ({
            id: c.id,
            name: c.name || c.organization || "Unknown",
            ventureId: "xodus",
            status: c.status || "researching",
            stage: c.stage || "researching",
            fit: c.fit || c.fitScore || 0,
            notes: c.notes || c.objective || "",
            nextAction: c.nextAction || "",
            source: c.source || "xodus-research",
            createdAt: c.createdAt || c.discoveredAt || ""
        }));
    }
    if (venture === "jarvis-opportunities") {
        const state = jarvisOpps.status();
        return (state.opportunities || []).map(o => ({
            id: o.id,
            name: o.title || "Unknown",
            ventureId: "jarvis-opportunities",
            status: o.stage || "discovered",
            stage: o.stage || "discovered",
            fit: o.fitScore || 0,
            fitGrade: o.fitGrade || "",
            notes: o.description || "",
            nextAction: o.nextAction || "",
            source: o.source || "jarvis-opportunities",
            createdAt: o.createdAt || ""
        }));
    }
    if (venture === "real-estate") {
        return crm.getEntity("organizations", "real-estate");
    }
    return crm.getEntity("organizations", venture || "well-noticed");
}

router.get(
    "/workspace/prospects",
    async (req, res) => {
        try {
            const venture = req.query.venture || "well-noticed";
            let records = [];
            let mode = "local";
            let total = 0;

            if (venture === "well-noticed") {
                try {
                    const liveResult = await liveCrmService.getEntity("prospects", { limit: 2000, offset: 0 });
                    records = liveResult.data || [];
                    total = liveResult.total || records.length;
                    mode = "live";
                } catch (liveError) {
                    records = crm.getEntity("organizations", "well-noticed");
                    total = records.length;
                    mode = "local";
                }
            } else {
                records = getVentureRecords(venture);
                total = records.length;
                mode = "local";
            }

            const limit = Math.min(
                Math.max(Number.parseInt(req.query.limit, 10) || 50, 1),
                500
            );
            const offset = Math.max(
                Number.parseInt(req.query.offset, 10) || 0,
                0
            );

            const searchQuery = (req.query.search || "").trim().toLowerCase();
            let filtered = records;
            if (searchQuery) {
                filtered = records.filter(record => {
                    return Object.values(record).some(value =>
                        String(value ?? "").toLowerCase().includes(searchQuery)
                    );
                });
            }

            total = filtered.length;
            const data = filtered.slice(offset, offset + limit);

            res.json({
                status: "online",
                mode,
                entity: "prospects",
                venture,
                total,
                count: data.length,
                limit,
                offset,
                hasMore: offset + data.length < total,
                data
            });
        } catch (error) {
            res.status(500).json({
                status: "error",
                error: error.message
            });
        }
    }
);

router.get(
    "/",
    (req, res) => {

        try {

            res.json({
                status: "online",
                system: "JARVIS CRM",
                dashboard:
                    crm.getDashboard()
            });

        } catch (error) {

            res.status(500).json({
                status: "error",
                error:
                    error.message
            });

        }

    }
);

router.get(
    "/ventures",
    (req, res) => {

        res.json({
            status: "online",
            ventures:
                crm.getVentures()
        });

    }
);

router.get("/portfolio", (_req, res) => {
    res.json({ ok: true, data: portfolioService.portfolio() });
});

router.get("/portfolio/:ventureId", (req, res) => {
    const venture = crm.getVentures().find(item => item.id === req.params.ventureId);
    if (!venture) return res.status(404).json({ ok: false, error: "CRM venture not found" });
    return res.json({ ok: true, data: portfolioService.laneSummary(venture) });
});

router.get(
    "/venture/:ventureId",
    (req, res) => {

        try {

            const result =
                crm.getVenture(
                    req.params.ventureId
                );

            if (!result) {

                return res
                    .status(404)
                    .json({
                        status: "error",
                        error:
                            "CRM venture not found"
                    });

            }

            res.json({
                status: "online",
                ...result
            });

        } catch (error) {

            res.status(500).json({
                status: "error",
                error:
                    error.message
            });

        }

    }
);

router.get(
    "/discovery/local-ohio",
    (req, res) => {

        try {

            const discovery =
                require("../agents/marketDiscoveryAgent");

            const result =
                discovery.discoverLocalOhioProspects();

            res.json({
                status: "success",
                mode: "simulate",
                count: result.length,
                prospects: result,
                crmMutations: false,
                externalActions: false
            });

        } catch (error) {

            res.status(500).json({
                status: "error",
                error:
                    error.message
            });

        }

    }
);


router.get(
    "/live/status",
    async (req, res) => {
        try {
            const result =
                await liveCrmService
                    .getStatus();

            res.json({
                status: "online",
                mode: "live",
                ...result
            });
        } catch (error) {
            res.status(503).json({
                status: "error",
                mode: "live",
                error: error.message
            });
        }
    }
);

router.get(
    "/live",
    async (req, res) => {
        try {
            const status =
                await liveCrmService
                    .getStatus();

            res.json({
                status: "online",
                mode: "live",
                endpoints: {
                    status:
                        "/api/crm/live/status",
                    prospects:
                        "/api/crm/live/prospects",
                    customers:
                        "/api/crm/live/customers",
                    invoices:
                        "/api/crm/live/invoices",
                    all:
                        "/api/crm/live/all",
                    sheet5:
                        "/api/crm/live/sheet5"
                },
                spreadsheet:
                    status.spreadsheet,
                entities:
                    status.entities
            });
        } catch (error) {
            res.status(503).json({
                status: "error",
                mode: "live",
                error: error.message
            });
        }
    }
);

router.get(
    "/live/:entity",
    async (req, res) => {
        try {
            const result =
                await liveCrmService
                    .getEntity(
                        req.params.entity,
                        req.query
                    );

            res.json({
                status: "online",
                mode: "live",
                ...result
            });
        } catch (error) {
            const unsupported =
                error.message.startsWith(
                    "Unsupported live CRM entity:"
                );

            res.status(
                unsupported ? 400 : 503
            ).json({
                status: "error",
                mode: "live",
                entity:
                    req.params.entity,
                error:
                    error.message
            });
        }
    }
);

router.post(
    "/:entity",
    ...requireRole("owner"),
    (req, res) => {
        return sendError(req, res, {
            statusCode: 403,
            code: "GOVERNANCE_REQUIRED",
            message: "Direct CRM writes are disabled. Use a governed workflow."
        });
    }
);

router.patch(
    "/:entity/:id",
    ...requireRole("owner"),
    (req, res) => {
        return sendError(req, res, {
            statusCode: 403,
            code: "GOVERNANCE_REQUIRED",
            message: "Direct CRM writes are disabled. Use a governed workflow."
        });
    }
);

router.get(
    "/:entity",
    (req, res) => {
        try {
            const data = crm.getEntity(
                req.params.entity,
                req.query.venture
            );

            res.json({
                status: "online",
                entity: req.params.entity,
                venture: req.query.venture || null,
                count: data.length,
                data
            });
        } catch (error) {
            res.status(400).json({
                status: "error",
                error: error.message
            });
        }
    }
);

module.exports = router;
