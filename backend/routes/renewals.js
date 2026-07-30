const express = require("express");
const crypto = require("crypto");
const { requireRole } = require("../auth/localAuth");
const crm = require("../crm/crmEngine");
const briefs = require("../services/renewalBriefService");
const audit = require("../governance/auditLog");
const router = express.Router();

router.get("/briefs", (_req, res) => res.json({ ok: true, data: { briefs: briefs.list(), eligibleCustomers: briefs.eligible().length } }));
router.get("/briefs/:organizationId", (req, res) => { try { return res.json({ ok: true, data: briefs.brief(req.params.organizationId) }); } catch (error) { return res.status(404).json({ ok: false, error: error.message }); } });
router.post("/customers/import", ...requireRole("owner"), (req, res) => {
    if (req.body?.confirmation !== "IMPORT REVIEWED CUSTOMER") return res.status(400).json({ ok: false, error: "confirmation must exactly equal IMPORT REVIEWED CUSTOMER" });
    const input = req.body?.customer || {};
    if (!String(input.name || "").trim()) return res.status(400).json({ ok: false, error: "customer.name is required" });
    if (!["customer", "renewal"].includes(input.status) && !["active", "partner"].includes(input.relationshipStatus)) return res.status(400).json({ ok: false, error: "Reviewed record must be classified as customer, renewal, active, or partner" });
    if (String(input.id || "").startsWith("well-noticed-apco")) return res.status(409).json({ ok: false, error: "APCO is a prospect snapshot and cannot be relabeled through customer intake" });
    const record = crm.createEntity("organizations", { ...input, id: input.id || `well-noticed-customer-${crypto.randomUUID()}`, ventureId: "well-noticed", source: input.source || "owner-reviewed-import", reviewedBy: req.auth.name, reviewedAt: new Date().toISOString() });
    audit.append("well_noticed_customer_imported", { actor: req.auth.name, requestId: req.id, organizationId: record.id });
    return res.status(201).json({ ok: true, data: { customer: record, brief: briefs.brief(record.id) } });
});

module.exports = router;
