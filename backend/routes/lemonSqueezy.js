const express = require("express");
const { requireRole } = require("../auth/localAuth");
const ls = require("../services/lemonSqueezyService");
const audit = require("../governance/auditLog");

const router = express.Router();

router.get("/status", ...requireRole("viewer"), async (_req, res) => {
    try {
        const status = await ls.status();
        res.json({ ok: true, data: status });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.get("/revenue", ...requireRole("viewer"), async (_req, res) => {
    try {
        const revenue = await ls.getRevenue();
        ls.cacheRevenue(revenue);
        res.json({ ok: true, data: revenue });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.get("/orders", ...requireRole("viewer"), async (req, res) => {
    try {
        const result = await ls.getOrders({
            page: req.query.page || 1,
            perPage: req.query.perPage || 20
        });
        res.json({ ok: true, data: result });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.get("/subscriptions", ...requireRole("viewer"), async (req, res) => {
    try {
        const result = await ls.getSubscriptions({
            page: req.query.page || 1,
            status: req.query.status || undefined
        });
        res.json({ ok: true, data: result });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.get("/products", ...requireRole("viewer"), async (_req, res) => {
    try {
        const products = await ls.getProducts();
        res.json({ ok: true, data: products });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.get("/customers", ...requireRole("viewer"), async (req, res) => {
    try {
        const result = await ls.getCustomers({ page: req.query.page || 1 });
        res.json({ ok: true, data: result });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.get("/events", ...requireRole("viewer"), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const events = ls.getEvents(limit);
        res.json({ ok: true, data: events });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.get("/revenue-history", ...requireRole("viewer"), async (_req, res) => {
    try {
        const snapshots = ls.readSnapshots();
        res.json({ ok: true, data: snapshots.slice(-100) });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.post("/validate-license", ...requireRole("viewer"), async (req, res) => {
    try {
        const { licenseKey, instanceName } = req.body || {};
        if (!licenseKey) return res.status(400).json({ ok: false, error: "licenseKey is required" });
        const result = await ls.validateLicense(licenseKey, instanceName);
        res.json({ ok: true, data: result });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.post("/activate-license", ...requireRole("owner"), async (req, res) => {
    try {
        const { licenseKey, instanceName } = req.body || {};
        if (!licenseKey || !instanceName) {
            return res.status(400).json({ ok: false, error: "licenseKey and instanceName are required" });
        }
        const result = await ls.activateLicense(licenseKey, instanceName);
        audit.append("lemon_squeezy_license_activated", { actor: req.auth.name, instanceName });
        res.json({ ok: true, data: result });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.post("/deactivate-license", ...requireRole("owner"), async (req, res) => {
    try {
        const { licenseKey, instanceId } = req.body || {};
        if (!licenseKey || !instanceId) {
            return res.status(400).json({ ok: false, error: "licenseKey and instanceId are required" });
        }
        const result = await ls.deactivateLicense(licenseKey, instanceId);
        audit.append("lemon_squeezy_license_deactivated", { actor: req.auth.name, instanceId });
        res.json({ ok: true, data: result });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

module.exports = router;
