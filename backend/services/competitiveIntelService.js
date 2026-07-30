const fs = require("fs");
const path = require("path");
const activity = require("../brain/activityService");

const STATE_PATH = path.join(__dirname, "../data/competitive-intel.json");

function load() {
    try { return JSON.parse(fs.readFileSync(STATE_PATH, "utf8")); }
    catch { return { sightings: [], competitors: {}, categories: {}, lastScan: null }; }
}

function save(data) {
    fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
    fs.writeFileSync(STATE_PATH, JSON.stringify(data, null, 2));
}

function normalizeCompany(name) {
    return (name || "").toLowerCase().replace(/[^a-z0-9\s'-]/g, "").trim();
}

function isKnownProspect(name) {
    try {
        const data = load();
        return data._prospectNames ? data._prospectNames.has(normalizeCompany(name)) : false;
    } catch { return false; }
}

function recordSighting(companyName, category, sourceUrl, snippet) {
    const data = load();
    const normalized = normalizeCompany(companyName);
    if (!normalized || normalized.length < 3) return;
    if (isKnownProspect(companyName)) return;

    const sighting = {
        companyName: companyName.trim(),
        normalized,
        category: category || "unknown",
        sourceUrl: sourceUrl || "",
        snippet: (snippet || "").slice(0, 300),
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        sightingCount: 1
    };

    const existing = data.sightings.find(s => s.normalized === normalized && s.category === category);
    if (existing) {
        existing.lastSeen = new Date().toISOString();
        existing.sightingCount++;
        if (sourceUrl && !existing.sourceUrl.includes(sourceUrl)) {
            existing.sourceUrl = sourceUrl;
        }
        if (snippet && existing.snippet.length < 300) {
            existing.snippet = snippet.slice(0, 300);
        }
    } else {
        data.sightings.push(sighting);
        data.sightings = data.sightings.slice(-1000);

        if (!data.competitors[normalized]) {
            data.competitors[normalized] = { name: companyName.trim(), categories: {}, totalSightings: 0 };
        }
        data.competitors[normalized].totalSightings++;
        data.competitors[normalized].lastSeen = new Date().toISOString();
        if (!data.competitors[normalized].categories[category]) {
            data.competitors[normalized].categories[category] = 0;
        }
        data.competitors[normalized].categories[category]++;

        if (!data.categories[category]) {
            data.categories[category] = { competitors: {}, totalSightings: 0 };
        }
        if (!data.categories[category].competitors[normalized]) {
            data.categories[category].competitors[normalized] = 0;
        }
        data.categories[category].competitors[normalized]++;
        data.categories[category].totalSightings++;
    }

    save(data);
}

function setProspectNames(names) {
    const data = load();
    data._prospectNames = new Set(Array.from(names || []).map(n => normalizeCompany(n)));
    save(data);
}

function getLandscape() {
    const data = load();
    const competitors = Object.entries(data.competitors || {})
        .map(([norm, info]) => ({
            name: info.name,
            normalized: norm,
            categories: Object.keys(info.categories || {}),
            totalSightings: info.totalSightings || 0,
            lastSeen: info.lastSeen || null
        }))
        .sort((a, b) => b.totalSightings - a.totalSightings);

    const categories = Object.entries(data.categories || {})
        .map(([cat, info]) => ({
            category: cat,
            competitorCount: Object.keys(info.competitors || {}).length,
            totalSightings: info.totalSightings || 0,
            topCompetitors: Object.entries(info.competitors || {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([norm, count]) => {
                    const comp = data.competitors?.[norm];
                    return { name: comp?.name || norm, sightings: count };
                })
        }))
        .sort((a, b) => b.totalSightings - a.totalSightings);

    const recent = data.sightings
        .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))
        .slice(0, 20)
        .map(s => ({
            company: s.companyName,
            category: s.category,
            snippet: s.snippet.slice(0, 120),
            count: s.sightingCount
        }));

    return {
        totalCompetitors: competitors.length,
        totalSightings: data.sightings.length,
        categories: categories.length,
        topCompetitors: competitors.slice(0, 20),
        categoryBreakdown: categories,
        recentSightings: recent,
        lastScan: data.lastScan,
        generatedAt: new Date().toISOString()
    };
}

function getCategoryCompetitors(category) {
    const data = load();
    const catInfo = data.categories?.[category];
    if (!catInfo) return { category, competitors: [], totalSightings: 0 };

    const competitors = Object.entries(catInfo.competitors || {})
        .sort((a, b) => b[1] - a[1])
        .map(([norm, count]) => {
            const comp = data.competitors?.[norm];
            return { name: comp?.name || norm, sightings: count, lastSeen: comp?.lastSeen || null };
        });

    const recentInCategory = data.sightings
        .filter(s => s.category === category)
        .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))
        .slice(0, 10);

    return {
        category,
        competitorCount: competitors.length,
        totalSightings: catInfo.totalSightings || 0,
        competitors,
        recentSightings: recentInCategory
    };
}

async function extractCompetitorsFromSnippets(results, category) {
    if (!results || !Array.isArray(results)) return;
    const knownNames = new Set();
    try {
        const le = require("./learningEngine");
        const crm = le.getCrmProfile();
        if (crm) {
            const agent = require("../agents/wellNoticedCrmAgent");
            const repo = agent.getRepository();
            const all = await repo.getEntity("prospects");
            const names = all.map(p => p["Company Name"] || p["company"] || "").filter(Boolean);
            setProspectNames(names);
        }
    } catch {}

    for (const result of results) {
        const snippet = result.snippet || "";
        if (!snippet) continue;
        const nameMatch = snippet.match(/([A-Z][a-zA-Z0-9\s']{2,40}(?:Inc|LLC|Co|Corp|Ltd)?)/g);
        if (!nameMatch) continue;
        for (const candidate of nameMatch) {
            const cleaned = candidate.trim();
            if (cleaned.length < 4) continue;
            if (/^(The|A|An)\s/i.test(cleaned)) continue;
            if (isKnownProspect(cleaned)) continue;
            recordSighting(cleaned, category, result.url, snippet);
        }
    }
}

function getStats() {
    const data = load();
    return {
        totalSightings: data.sightings.length,
        uniqueCompetitors: Object.keys(data.competitors || {}).length,
        categories: Object.keys(data.categories || {}).length,
        lastScan: data.lastScan
    };
}

module.exports = { recordSighting, getLandscape, getCategoryCompetitors, extractCompetitorsFromSnippets, setProspectNames, getStats };
