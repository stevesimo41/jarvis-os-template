(function () {
    "use strict";

    const ENDPOINTS = {
        status: "/api/crm/workspace/status",
        prospects: "/api/crm/workspace/prospects",
        portfolio: "/api/crm/portfolio"
    };

    async function requestJson(url) {
        const headers = { Accept: "application/json" };
        const token = sessionStorage.getItem("jarvis.authToken");
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const response = await fetch(
            url,
            { credentials: "include", headers }
        );

        let payload;

        try {
            payload = await response.json();
        } catch {
            payload = {};
        }

        if (!response.ok) {
            throw new Error(
                payload?.error ||
                payload?.message ||
                `Request failed with status ${response.status}`
            );
        }

        return payload;
    }

    function normalizePayload(payload) {
        const records =
            payload?.data ||
            payload?.records ||
            payload?.items ||
            [];

        const total =
            Number(
                payload?.total ??
                payload?.count ??
                records.length
            ) || 0;

        return {
            records: Array.isArray(records)
                ? records
                : [],
            total
        };
    }

    async function loadStatus(venture) {
        const url = venture
            ? `${ENDPOINTS.status}?venture=${encodeURIComponent(venture)}`
            : ENDPOINTS.status;
        return requestJson(url);
    }

    async function loadProspects(limit, offset, venture = "well-noticed", search = "") {
        const params = new URLSearchParams({
            limit: String(limit),
            offset: String(offset),
            venture
        });
        if (search) params.set("search", search);
        const payload = await requestJson(
            `${ENDPOINTS.prospects}?${params.toString()}`
        );

        return normalizePayload(payload);
    }

    window.JarvisCrmApi = {
        loadStatus,
        loadProspects,
        loadPortfolio: () => requestJson(ENDPOINTS.portfolio)
    };
})();
