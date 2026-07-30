const crypto = require("crypto");
const path = require("path");
const { readJson, writeJsonAtomic } = require("../storage/atomicJsonStore");

const API_BASE = "https://api.lemonsqueezy.com/v1";
const LICENSE_API_BASE = "https://api.lemonsqueezy.com/v1/licenses";

function apiKey() {
    return process.env.LEMON_SQUEEZY_API_KEY || "";
}

function storeId() {
    return process.env.LEMON_SQUEEZY_STORE_ID || "439770";
}

function webhookSecret() {
    return process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "";
}

function headers() {
    return {
        "Authorization": `Bearer ${apiKey()}`,
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json"
    };
}

function dataDir() {
    return path.join(__dirname, "../data/lemon-squeezy");
}

function eventsPath() {
    return path.join(dataDir(), "webhook-events.json");
}

function snapshotsPath() {
    return path.join(dataDir(), "revenue-snapshots.json");
}

function readEvents() {
    return readJson(eventsPath(), []);
}

function writeEvents(events) {
    writeJsonAtomic(eventsPath(), events);
}

function readSnapshots() {
    return readJson(snapshotsPath(), []);
}

function writeSnapshots(snapshots) {
    writeJsonAtomic(snapshotsPath(), snapshots);
}

async function apiGet(endpoint) {
    const url = `${API_BASE}${endpoint}`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Lemon Squeezy API ${res.status}: ${body}`);
    }
    return res.json();
}

async function apiPost(endpoint, body) {
    const url = `${API_BASE}${endpoint}`;
    const res = await fetch(url, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Lemon Squeezy API ${res.status}: ${text}`);
    }
    return res.json();
}

async function getStore() {
    const data = await apiGet(`/stores/${storeId()}`);
    return data.data;
}

async function getRevenue() {
    const store = await getStore();
    const attrs = store.attributes;
    return {
        storeId: store.id,
        storeName: attrs.name,
        currency: attrs.currency,
        totalRevenue: attrs.total_revenue / 100,
        totalSales: attrs.total_sales,
        thirtyDayRevenue: attrs.thirty_day_revenue / 100,
        thirtyDaySales: attrs.thirty_day_sales,
        fetchedAt: new Date().toISOString()
    };
}

async function getOrders(params = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page[number]", String(params.page));
    if (params.perPage) qs.set("page[size]", String(params.perPage));
    qs.set("sort", "-createdAt");
    const query = qs.toString();
    const data = await apiGet(`/orders?${query}`);
    return {
        orders: (data.data || []).map(o => ({
            id: o.id,
            total: o.attributes.total / 100,
            currency: o.attributes.currency,
            status: o.attributes.status,
            customerEmail: o.attributes.user_email,
            createdAt: o.attributes.created_at,
            updatedAt: o.attributes.updated_at
        })),
        meta: data.meta
    };
}

async function getSubscriptions(params = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page[number]", String(params.page));
    if (params.status) qs.set("filter[status]", params.status);
    qs.set("sort", "-createdAt");
    const query = qs.toString();
    const data = await apiGet(`/subscriptions?${query}`);
    return {
        subscriptions: (data.data || []).map(s => ({
            id: s.id,
            status: s.attributes.status,
            productName: s.attributes.product_name,
            customerEmail: s.attributes.user_email,
            renewsAt: s.attributes.renews_at,
            endsAt: s.attributes.ends_at,
            createdAt: s.attributes.created_at
        })),
        meta: data.meta
    };
}

async function getProducts() {
    const data = await apiGet(`/stores/${storeId()}/products`);
    return (data.data || []).map(p => ({
        id: p.id,
        name: p.attributes.name,
        price: p.attributes.price / 100,
        priceFormatted: p.attributes.price_formatted,
        status: p.attributes.status,
        testMode: p.attributes.test_mode
    }));
}

async function getCustomers(params = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page[number]", String(params.page));
    qs.set("sort", "-createdAt");
    const query = qs.toString();
    const data = await apiGet(`/customers?${query}`);
    return {
        customers: (data.data || []).map(c => ({
            id: c.id,
            name: c.attributes.name,
            email: c.attributes.email,
            createdAt: c.attributes.created_at
        })),
        meta: data.meta
    };
}

async function validateLicense(licenseKey, instanceName) {
    const body = { license_key: licenseKey };
    if (instanceName) body.instance_name = instanceName;
    const res = await fetch(`${LICENSE_API_BASE}/validate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
        },
        body: new URLSearchParams(body)
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`License API ${res.status}: ${text}`);
    }
    return res.json();
}

async function activateLicense(licenseKey, instanceName) {
    const res = await fetch(`${LICENSE_API_BASE}/activate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
        },
        body: new URLSearchParams({ license_key: licenseKey, instance_name: instanceName })
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`License API ${res.status}: ${text}`);
    }
    return res.json();
}

async function deactivateLicense(licenseKey, instanceId) {
    const res = await fetch(`${LICENSE_API_BASE}/deactivate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
        },
        body: new URLSearchParams({ license_key: licenseKey, instance_id: instanceId })
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`License API ${res.status}: ${text}`);
    }
    return res.json();
}

function verifyWebhookSignature(rawBody, signature) {
    const secret = webhookSecret();
    if (!secret) return true;
    if (!signature) return false;
    try {
        const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
        return false;
    }
}

function recordEvent(event) {
    const events = readEvents();
    events.push({
        id: crypto.randomUUID(),
        type: event.type,
        data: event.data,
        receivedAt: new Date().toISOString()
    });
    if (events.length > 500) events.splice(0, events.length - 500);
    writeEvents(events);
}

function getEvents(limit = 50) {
    return readEvents().slice(-limit).reverse();
}

function cacheRevenue(data) {
    const snapshots = readSnapshots();
    snapshots.push({ ...data, cachedAt: new Date().toISOString() });
    if (snapshots.length > 1000) snapshots.splice(0, snapshots.length - 1000);
    writeSnapshots(snapshots);
}

function status() {
    return {
        configured: !!apiKey(),
        storeId: storeId(),
        webhookConfigured: !!webhookSecret(),
        apiConnected: false
    };
}

async function statusAsync() {
    const s = status();
    if (s.configured) {
        try {
            await getStore();
            s.apiConnected = true;
        } catch {
            s.apiConnected = false;
        }
    }
    return s;
}

module.exports = {
    apiKey, storeId, webhookSecret,
    getStore, getRevenue, getOrders, getSubscriptions,
    getProducts, getCustomers,
    validateLicense, activateLicense, deactivateLicense,
    verifyWebhookSignature, recordEvent, getEvents,
    cacheRevenue, readSnapshots,
    status: statusAsync
};
