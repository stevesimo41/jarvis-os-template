const activity = require("../brain/activityService");

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const REQUEST_TIMEOUT = 15000;

async function fetchPage(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
        const response = await fetch(url, {
            headers: { "User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml" },
            signal: controller.signal,
            redirect: "follow"
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
    } finally {
        clearTimeout(timer);
    }
}

function extractText(html) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#\d+;/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function extractEmails(text) {
    const pattern = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    return [...new Set(text.match(pattern) || [])].filter(e => !e.endsWith(".png") && !e.endsWith(".jpg"));
}

function extractPhones(text) {
    const pattern = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    return [...new Set(text.match(pattern) || [])];
}

function extractUrls(html) {
    const pattern = /href="(https?:\/\/[^"]+)"/gi;
    const urls = [];
    let match;
    while ((match = pattern.exec(html))) {
        urls.push(match[1]);
    }
    return [...new Set(urls)];
}

async function searchWeb(query) {
    const searchQuery = encodeURIComponent(query);

    const startpageResults = await searchStartpage(searchQuery);
    if (startpageResults.length > 0) return startpageResults;

    const ddgResults = await searchDuckDuckGo(searchQuery);
    if (ddgResults.length > 0) return ddgResults;

    const braveResults = await searchBrave(searchQuery);
    if (braveResults.length > 0) return braveResults;

    const googleResults = await searchGoogle(searchQuery);
    if (googleResults.length > 0) return googleResults;

    const liteResults = await searchDuckDuckGoLite(searchQuery);
    return liteResults;
}

async function searchDuckDuckGo(searchQuery) {
    const url = `https://html.duckduckgo.com/html/?q=${searchQuery}`;
    try {
        const html = await fetchPage(url);
        const results = [];
        const pattern = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
        let match;
        while ((match = pattern.exec(html)) && results.length < 10) {
            const rawUrl = match[1];
            const decodedUrl = rawUrl.includes("uddg=")
                ? decodeURIComponent(rawUrl.split("uddg=")[1]?.split("&")[0] || rawUrl)
                : rawUrl;
            results.push({
                title: match[2].replace(/<[^>]+>/g, "").trim(),
                url: decodedUrl,
                snippet: match[3].replace(/<[^>]+>/g, "").trim()
            });
        }
        return results.filter(r => !r.url.includes("duckduckgo.com/y.js") && !r.url.includes("bing.com/aclick") && r.title.length > 3);
    } catch (_error) {
        return [];
    }
}

async function searchDuckDuckGoLite(searchQuery) {
    const url = `https://lite.duckduckgo.com/lite/?q=${searchQuery}`;
    try {
        const html = await fetchPage(url);
        const results = [];
        const pattern = /<a[^>]+rel="nofollow"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/g;
        let match;
        while ((match = pattern.exec(html)) && results.length < 10) {
            results.push({
                title: match[2].replace(/<[^>]+>/g, "").trim(),
                url: match[1],
                snippet: match[3].replace(/<[^>]+>/g, "").trim()
            });
        }
        return results.filter(r => r.title.length > 3 && !r.url.includes("duckduckgo.com"));
    } catch (_error) {
        return [];
    }
}

async function searchBrave(searchQuery) {
    const url = `https://search.brave.com/search?q=${searchQuery}`;
    try {
        const html = await fetchPage(url);
        const results = [];
        const pattern = /<a[^>]+class="[^"]*result-header[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?<p[^>]*class="[^"]*snippet-description[^"]*"[^>]*>([\s\S]*?)<\/p>/g;
        let match;
        while ((match = pattern.exec(html)) && results.length < 10) {
            results.push({
                title: match[2].replace(/<[^>]+>/g, "").trim(),
                url: match[1],
                snippet: match[3].replace(/<[^>]+>/g, "").trim()
            });
        }
        return results.filter(r => r.title.length > 3);
    } catch (_error) {
        return [];
    }
}

async function searchStartpage(searchQuery) {
    const url = "https://www.startpage.com/sp/search";
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
            body: `query=${searchQuery}`,
            signal: AbortSignal.timeout(REQUEST_TIMEOUT)
        });
        if (!response.ok) return [];
        const html = await response.text();
        const results = [];
        const pattern = /<a[^>]+class="[^"]*result-link[^"]*"[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
        let match;
        while ((match = pattern.exec(html)) && results.length < 10) {
            const title = match[2].replace(/<[^>]+>/g, "").trim();
            if (title.length > 3) results.push({ title, url: match[1], snippet: "" });
        }
        const snippetPattern = /<p[^>]+class="[^"]*result[^\"]*"[^>]*>([\s\S]*?)<\/p>/g;
        let sIdx = 0;
        while ((match = snippetPattern.exec(html)) && sIdx < results.length) {
            const text = match[1].replace(/<[^>]+>/g, "").trim();
            if (text.length > 20) { results[sIdx].snippet = text; sIdx++; }
        }
        return results.filter(r => r.title.length > 3);
    } catch (_error) {
        return [];
    }
}

async function searchGoogle(searchQuery) {
    const url = `https://www.google.com/search?q=${searchQuery}&num=10`;
    try {
        const html = await fetchPage(url);
        const results = [];
        const pattern = /<div[^>]*class="[^"]*"[^>]*><a[^>]*href="\/url\?q=([^&"]+)/g;
        let match;
        while ((match = pattern.exec(html)) && results.length < 10) {
            const decoded = decodeURIComponent(match[1]);
            if (decoded.includes("google.com") || decoded.includes("youtube.com")) continue;
            results.push({ title: "", url: decoded, snippet: "" });
        }
        const titlePattern = /<h3[^>]*>([\s\S]*?)<\/h3>/g;
        let tIdx = 0;
        while ((match = titlePattern.exec(html)) && tIdx < results.length) {
            results[tIdx].title = match[1].replace(/<[^>]+>/g, "").trim();
            tIdx++;
        }
        const snippetPattern = /<span[^>]*class="[^"]*"[^>]*>((?:(?!<\/span>).){20,200})<\/span>/g;
        let sIdx = 0;
        while ((match = snippetPattern.exec(html)) && sIdx < results.length) {
            const text = match[1].replace(/<[^>]+>/g, "").trim();
            if (text.length > 20 && !text.includes("Sign in") && !text.includes("Settings")) {
                results[sIdx].snippet = text;
                sIdx++;
            }
        }
        return results.filter(r => r.title.length > 3 && r.url.startsWith("http"));
    } catch (_error) {
        return [];
    }
}

async function searchSearx(searchQuery) {
    const instances = [
        "https://search.inetol.net/search",
        "https://searx.be/search",
        "https://search.ononoki.org/search"
    ];
    for (const base of instances) {
        try {
            const url = `${base}?q=${searchQuery}&format=json&categories=general&language=en`;
            const response = await fetch(url, {
                headers: { "User-Agent": USER_AGENT, "Accept": "application/json" },
                signal: AbortSignal.timeout(REQUEST_TIMEOUT)
            });
            if (!response.ok) continue;
            const data = await response.json();
            const results = (data.results || []).slice(0, 10).map(r => ({
                title: r.title || "",
                url: r.url || "",
                snippet: r.content || ""
            }));
            if (results.length > 0) return results;
        } catch (_error) {
            continue;
        }
    }
    return [];
}

async function researchOrganization(name, website) {
    const findings = { name, website: website || null, emails: [], phones: [], urls: [], summary: "" };

    if (website) {
        try {
            const html = await fetchPage(website);
            const text = extractText(html);
            findings.emails = extractEmails(text).slice(0, 5);
            findings.phones = extractPhones(text).slice(0, 3);
            findings.urls = extractUrls(html).slice(0, 10);
            findings.summary = text.slice(0, 1000);
            activity.append("observed", `Web research completed for ${name}`, { source: "web-research", organization: name });
        } catch (error) {
            findings.summary = `Website unreachable: ${error.message}`;
        }
    } else {
        const searchResults = await searchWeb(name);
        if (searchResults.length) {
            const bestMatch = searchResults.find(r => r.url && !r.url.includes("yelp.com") && !r.url.includes("facebook.com")) || searchResults[0];
            if (bestMatch?.url) {
                findings.website = bestMatch.url;
                try {
                    const html = await fetchPage(bestMatch.url);
                    const text = extractText(html);
                    findings.emails = extractEmails(text).slice(0, 5);
                    findings.phones = extractPhones(text).slice(0, 3);
                    findings.urls = extractUrls(html).slice(0, 10);
                    findings.summary = text.slice(0, 1000);
                } catch (_e) { /* continue */ }
            }
            findings.summary = findings.summary || searchResults[0]?.snippet || "";
            activity.append("observed", `Web research completed for ${name}`, { source: "web-research", organization: name });
        }
    }

    return findings;
}

async function discoverProspects(query, location, limit) {
    const max = Math.min(Math.max(Number(limit) || 10, 1), 25);
    const fullQuery = location ? `${query} ${location}` : query;
    const searchResults = await searchWeb(fullQuery);
    const prospects = [];

    for (const result of searchResults.slice(0, max)) {
        const prospect = {
            name: result.title.split(" - ")[0].split(" | ")[0].trim(),
            source: "web-discovery",
            sourceUrl: result.url,
            snippet: result.snippet,
            discoveredAt: new Date().toISOString(),
            status: "discovered",
            emails: [],
            phones: [],
            website: result.url
        };
        prospects.push(prospect);
    }

    activity.append("observed", `Discovered ${prospects.length} prospects for "${fullQuery}"`, { source: "web-research" });
    return { query: fullQuery, prospects, totalResults: searchResults.length, searchedAt: new Date().toISOString() };
}

module.exports = { fetchPage, extractText, extractEmails, extractPhones, extractUrls, searchWeb, researchOrganization, discoverProspects };
