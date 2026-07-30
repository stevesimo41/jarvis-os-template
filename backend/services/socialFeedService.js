const crypto = require("crypto");
const path = require("path");
const { readJson, writeJsonAtomic } = require("../storage/atomicJsonStore");

const FEED_CACHE_TTL_MS = 30 * 60 * 1000;

function dataDir() {
    return path.join(__dirname, "../data/social");
}

function configPath() {
    return path.join(dataDir(), "config.json");
}

function cachePath() {
    return path.join(dataDir(), "feed-cache.json");
}

function readConfig() {
    return readJson(configPath(), { accounts: [] });
}

function writeConfig(config) {
    writeJsonAtomic(configPath(), config);
}

function readCache() {
    return readJson(cachePath(), { feeds: {}, lastUpdated: null });
}

function writeCache(cache) {
    writeJsonAtomic(cachePath(), cache);
}

function isCacheValid(cache) {
    if (!cache.lastUpdated) return false;
    const age = Date.now() - new Date(cache.lastUpdated).getTime();
    return age < FEED_CACHE_TTL_MS;
}

function parseRSS(xml) {
    const items = [];
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
    for (const item of itemMatches) {
        const title = (item.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "";
        const link = (item.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] || "";
        const pubDate = (item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [])[1] || "";
        const description = (item.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || [])[1] || "";
        const content = (item.match(/<content[^>]*>([\s\S]*?)<\/content>/i) || [])[1] || description;
        items.push({
            title: decodeEntities(title.trim()),
            link: decodeEntities(link.trim()),
            pubDate: pubDate.trim(),
            content: decodeEntities(content.replace(/<[^>]+>/g, "").trim()).slice(0, 500)
        });
    }
    return items;
}

function decodeEntities(str) {
    return str
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#\d+;/g, "");
}

async function fetchRSSFeed(url) {
    try {
        const res = await fetch(url, {
            headers: { "User-Agent": "JARVIS-OS/1.0 Social Feed Aggregator" },
            signal: AbortSignal.timeout(10000)
        });
        if (!res.ok) return [];
        const text = await res.text();
        return parseRSS(text);
    } catch {
        return [];
    }
}

async function fetchTwitterFeed(handle) {
    const feeds = [
        `https://nitter.net/${handle}/rss`,
        `https://rsshub.app/twitter/user/${handle}`
    ];
    for (const url of feeds) {
        const items = await fetchRSSFeed(url);
        if (items.length > 0) return items.map(i => ({ ...i, platform: "twitter", author: `@${handle}` }));
    }
    return [];
}

async function fetchInstagramFeed(username) {
    const feeds = [
        `https://rsshub.app/instagram/user/${username}`
    ];
    for (const url of feeds) {
        const items = await fetchRSSFeed(url);
        if (items.length > 0) return items.map(i => ({ ...i, platform: "instagram", author: username }));
    }
    return [];
}

async function fetchFacebookFeed(pageId) {
    const feeds = [
        `https://rsshub.app/facebook/page/${pageId}`
    ];
    for (const url of feeds) {
        const items = await fetchRSSFeed(url);
        if (items.length > 0) return items.map(i => ({ ...i, platform: "facebook", author: pageId }));
    }
    return [];
}

async function fetchLinkedInFeed(companySlug) {
    const feeds = [
        `https://rsshub.app/linkedin/company/${companySlug}/posts`
    ];
    for (const url of feeds) {
        const items = await fetchRSSFeed(url);
        if (items.length > 0) return items.map(i => ({ ...i, platform: "linkedin", author: companySlug }));
    }
    return [];
}

async function fetchCustomFeed(url, platform) {
    const items = await fetchRSSFeed(url);
    return items.map(i => ({ ...i, platform: platform || "custom", author: url }));
}

const FETCHERS = {
    twitter: fetchTwitterFeed,
    instagram: fetchInstagramFeed,
    facebook: fetchFacebookFeed,
    linkedin: fetchLinkedInFeed,
    custom: fetchCustomFeed,
    rss: fetchCustomFeed
};

async function fetchAllFeeds() {
    const config = readConfig();
    const accounts = config.accounts || [];
    if (accounts.length === 0) return { feeds: [], lastUpdated: new Date().toISOString() };

    const allItems = [];
    const fetchPromises = accounts.map(async (account) => {
        const fetcher = FETCHERS[account.platform] || FETCHERS.rss;
        const items = await fetcher(account.handle || account.url || account.slug);
        return items.map(item => ({
            ...item,
            accountId: account.id,
            accountName: account.name || account.handle,
            platform: account.platform,
            icon: getPlatformIcon(account.platform)
        }));
    });

    const results = await Promise.allSettled(fetchPromises);
    for (const result of results) {
        if (result.status === "fulfilled") {
            allItems.push(...result.value);
        }
    }

    allItems.sort((a, b) => {
        const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
        const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
        return dateB - dateA;
    });

    const cache = { feeds: allItems, lastUpdated: new Date().toISOString() };
    writeCache(cache);
    return cache;
}

function getPlatformIcon(platform) {
    const icons = {
        twitter: "X",
        instagram: "IG",
        facebook: "FB",
        linkedin: "IN",
        rss: "RSS",
        custom: "WEB"
    };
    return icons[platform] || "WEB";
}

function getPlatformColor(platform) {
    const colors = {
        twitter: "#000000",
        instagram: "#E4405F",
        facebook: "#1877F2",
        linkedin: "#0A66C2",
        rss: "#FFA500",
        custom: "#6B7280"
    };
    return colors[platform] || "#6B7280";
}

async function getFeed(platform, forceRefresh) {
    const cache = readCache();
    if (!forceRefresh && isCacheValid(cache)) {
        let feeds = Object.values(cache.feeds);
        if (platform) feeds = feeds.filter(f => f.platform === platform);
        return { feeds, cached: true, lastUpdated: cache.lastUpdated };
    }

    const fresh = await fetchAllFeeds();
    let feeds = fresh.feeds;
    if (platform) feeds = feeds.filter(f => f.platform === platform);
    return { feeds, cached: false, lastUpdated: fresh.lastUpdated };
}

function addAccount(account) {
    const config = readConfig();
    const id = account.id || crypto.randomUUID().slice(0, 8);
    const entry = { id, platform: account.platform, name: account.name, handle: account.handle || account.url || account.slug };
    config.accounts.push(entry);
    writeConfig(config);
    return entry;
}

function removeAccount(id) {
    const config = readConfig();
    config.accounts = config.accounts.filter(a => a.id !== id);
    writeConfig(config);
}

function listAccounts() {
    return readConfig().accounts || [];
}

function status() {
    const config = readConfig();
    const cache = readCache();
    return {
        accountsCount: config.accounts.length,
        cached: isCacheValid(cache),
        lastUpdated: cache.lastUpdated,
        feedCount: Object.keys(cache.feeds).length
    };
}

module.exports = {
    getFeed, addAccount, removeAccount, listAccounts, status,
    fetchAllFeeds, readConfig, writeConfig
};
