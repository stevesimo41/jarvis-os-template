const fs = require("fs");
const path = require("path");
const RSSParser = require("rss-parser");
const escalations = require("./agentEscalationService");

const parser = new RSSParser({
    timeout: 10000,
    headers: {
        "User-Agent": "JARVIS-OS/1.0 Strategic Intelligence"
    }
});

const DATA_DIR = path.join(__dirname, "..", "data", "agents");
const STATE_FILE = path.join(DATA_DIR, "strategic-intelligence.json");

const INTERESTS = {
    recovery: {
        keywords: ["recovery", "sobriety", "addiction", "substance abuse", "12 step",
            "sober living", "rehab", "treatment center", "recovery community",
            "naloxone", "fentanyl", "opioid", "recovery housing", "peer support",
            "recovery capital", "recovery coach", "recovery oriented"],
        weight: 2.0,
        ventures: ["xodus"]
    },
    aiAgents: {
        keywords: ["ai agent", "ai agents", "autonomous agent", "agent framework",
            "llm agent", "multi agent", "agentic", "ai automation",
            "artificial intelligence agent", "conversational ai", "ai assistant",
            "ai development", "agent protocol", "tool use", "function calling",
            "rag", "retrieval augmented", "ai orchestration", "agent os"],
        weight: 2.5,
        ventures: ["jarvis"]
    },
    crypto: {
        keywords: ["cryptocurrency", "bitcoin", "ethereum", "blockchain", "web3",
            "defi", "decentralized finance", "token", "nft", "dao",
            "crypto regulation", "stablecoin", "digital asset", "crypto adoption",
            "layer 2", "solana", "crypto market"],
        weight: 1.5,
        ventures: ["investments"]
    },
    humanCapital: {
        keywords: ["human capital", "workforce development", "talent development",
            "employee engagement", "leadership development", "personal development",
            "coaching", "mentoring", "skill development", "career development",
            "organizational development", "culture building", "team building",
            "emotional intelligence", "eq training"],
        weight: 1.8,
        ventures: ["jarvis", "xodus"]
    },
    faith: {
        keywords: ["faith", "bible", "scripture", "devotional", "christian",
            "gospel", "prayer", "worship", "church", "ministry",
            "gnostic", "gnosticism", "nag hammadi", "apocrypha", "esoteric christian",
            "early church", "church fathers", "theology", "spiritual formation",
            "discipleship", "kingdom of god", "hebrew roots", "messianic"],
        weight: 1.5,
        ventures: ["personal"]
    },
    ohioBusiness: {
        keywords: ["ohio business", "columbus business", "central ohio",
            "ohio economy", "ohio startup", "ohio innovation",
            "columbus startup", "ohio technology", "columbus technology",
            "ohio workforce", "columbus workforce"],
        weight: 1.2,
        ventures: ["well-noticed", "jarvis"]
    },
    printing: {
        keywords: ["direct mail", "print marketing", "print advertising",
            "mail marketing", "direct mail campaign", "print media",
            "luxury mail", "premium print", "targeted mail"],
        weight: 1.0,
        ventures: ["well-noticed"]
    }
};

const RSS_FEEDS = [
    // Recovery / Addiction / Human Capital
    {
        url: "https://www.samhsa.gov/rss.xml",
        category: "recovery",
        label: "SAMHSA"
    },
    {
        url: "https://www.recoverymonth.gov/rss.xml",
        category: "recovery",
        label: "Recovery Month"
    },

    // AI / Technology
    {
        url: "https://news.mit.edu/topic/mitartificial-intelligence2-rss.xml",
        category: "aiAgents",
        label: "MIT AI"
    },
    {
        url: "https://venturebeat.com/category/ai/feed/",
        category: "aiAgents",
        label: "VentureBeat AI"
    },
    {
        url: "https://www.technologyreview.com/feed/",
        category: "aiAgents",
        label: "MIT Tech Review"
    },

    // Crypto / Web3
    {
        url: "https://cointelegraph.com/rss",
        category: "crypto",
        label: "CoinTelegraph"
    },
    {
        url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
        category: "crypto",
        label: "CoinDesk"
    },

    // Faith / Bible / Gnostic
    {
        url: "https://www.crosswalk.com/rss.xml",
        category: "faith",
        label: "Crosswalk"
    },
    {
        url: "https://www.desiringgod.org/feeds/articles",
        category: "faith",
        label: "Desiring God"
    },

    // Ohio / Columbus Business
    {
        url: "https://www.columbusnavigator.com/feed/",
        category: "ohioBusiness",
        label: "Columbus Navigator"
    },
    {
        url: "https://www.columbusmonthly.com/rss/news/",
        category: "ohioBusiness",
        label: "Columbus Monthly"
    }
];

function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
        }
    } catch (e) {
        console.error("Failed to load strategic intel state:", e.message);
    }
    return {
        insights: [],
        lastRun: null,
        seenUrls: [],
        runCount: 0
    };
}

function saveState(state) {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (e) {
        console.error("Failed to save strategic intel state:", e.message);
    }
}

function scoreArticle(title, content, sourceCategory) {
    const text = `${title} ${content}`.toLowerCase();
    let score = 0;
    let matchedInterests = [];

    for (const [interestId, interest] of Object.entries(INTERESTS)) {
        let matches = 0;
        for (const keyword of interest.keywords) {
            if (text.includes(keyword.toLowerCase())) {
                matches++;
            }
        }
        if (matches > 0) {
            const interestScore = matches * interest.weight;
            score += interestScore;
            matchedInterests.push({
                id: interestId,
                ventures: interest.ventures,
                matches
            });
        }
    }

    if (sourceCategory) {
        const sourceInterest = INTERESTS[sourceCategory];
        if (sourceInterest) {
            score += sourceInterest.weight * 0.5;
            const alreadyMatched = matchedInterests.some(m => m.id === sourceCategory);
            if (!alreadyMatched) {
                matchedInterests.push({
                    id: sourceCategory,
                    ventures: sourceInterest.ventures,
                    matches: 1
                });
            }
        }
    }

    return { score, matchedInterests };
}

function classifyInsight(matchedInterests) {
    if (matchedInterests.length === 0) return "general";

    const topMatch = matchedInterests.reduce((best, current) =>
        current.matches > best.matches ? current : best
    );

    const ventureMap = {
        recovery: "xodus",
        aiAgents: "jarvis",
        crypto: "investments",
        humanCapital: "jarvis",
        faith: "personal",
        ohioBusiness: "well-noticed",
        printing: "well-noticed"
    };

    return ventureMap[topMatch.id] || "general";
}

function summarizeArticle(title, content) {
    if (!content) return title;

    const cleaned = content
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    if (cleaned.length <= 200) return cleaned;

    const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
    let summary = "";
    for (const sentence of sentences) {
        if (summary.length + sentence.length > 200) break;
        summary += sentence.trim() + " ";
    }
    return summary.trim() || cleaned.substring(0, 200) + "...";
}

async function fetchFeed(feed) {
    try {
        const rss = await parser.parseURL(feed.url);
        return (rss.items || []).map(item => ({
            title: item.title || "Untitled",
            url: item.link || "",
            summary: summarizeArticle(item.title || "", item.contentSnippet || item.content || ""),
            published: item.pubDate || item.isoDate || new Date().toISOString(),
            source: feed.label,
            category: feed.category,
            fetchedAt: new Date().toISOString()
        }));
    } catch (e) {
        console.warn(`Failed to fetch ${feed.label}: ${e.message}`);
        return [];
    }
}

async function fetchWebSearch(query) {
    try {
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
            },
            signal: AbortSignal.timeout(10000)
        });
        const html = await response.text();

        const results = [];
        const resultRegex = /class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
        let match;
        while ((match = resultRegex.exec(html)) !== null && results.length < 5) {
            const href = match[1];
            const title = match[2].replace(/<[^>]*>/g, "").trim();
            const decodedUrl = href.includes("uddg=")
                ? decodeURIComponent(href.split("uddg=")[1]?.split("&")[0] || href)
                : href;
            results.push({
                title,
                url: decodedUrl,
                summary: title,
                published: new Date().toISOString(),
                source: "DuckDuckGo",
                category: "webSearch",
                fetchedAt: new Date().toISOString()
            });
        }
        return results;
    } catch (e) {
        console.warn(`Web search failed for "${query}": ${e.message}`);
        return [];
    }
}

const SEARCH_QUERIES = [
    "ai agent development news 2026",
    "recovery community innovation technology",
    "cryptocurrency adoption small business",
    "human capital development workforce",
    "gnostic teachings discoveries archaeology",
    "central ohio business innovation"
];

async function runIntelligenceScan() {
    console.log("[Strategic Intel] Starting intelligence scan...");
    const state = loadState();

    let articles = [];

    const feedResults = await Promise.allSettled(
        RSS_FEEDS.map(feed => fetchFeed(feed))
    );
    for (const result of feedResults) {
        if (result.status === "fulfilled") {
            articles.push(...result.value);
        }
    }

    for (const query of SEARCH_QUERIES) {
        const results = await fetchWebSearch(query);
        articles.push(...results);
        await new Promise(r => setTimeout(r, 1500));
    }

    const seenUrls = new Set(state.seenUrls || []);
    const newArticles = articles.filter(a => a.url && !seenUrls.has(a.url));

    const scored = newArticles.map(article => {
        const { score, matchedInterests } = scoreArticle(
            article.title,
            article.summary,
            article.category
        );
        return {
            ...article,
            score,
            matchedInterests,
            venture: classifyInsight(matchedInterests)
        };
    });

    scored.sort((a, b) => b.score - a.score);

    const topInsights = scored
        .filter(a => a.score > 0)
        .slice(0, 10);

    const newUrls = newArticles.map(a => a.url);
    state.seenUrls = [...(state.seenUrls || []), ...newUrls].slice(-500);

    state.insights = topInsights;
    state.lastRun = new Date().toISOString();
    state.runCount = (state.runCount || 0) + 1;

    if (newArticles.length === 0) {
        escalations.raise("strategic-intelligence", "blocker",
            "Intelligence scan returned 0 articles — all RSS feeds and web searches may be rate-limited or failing",
            { runCount: state.runCount },
            "warning"
        );
    }

    saveState(state);

    console.log(`[Strategic Intel] Scan complete: ${newArticles.length} new articles, ${topInsights.length} insights surfaced.`);
    return state;
}

function getLatestInsights() {
    const state = loadState();
    if (!state.insights || state.insights.length === 0) {
        return {
            status: "awaiting_scan",
            message: "No insights yet. Run a scan or wait for the next scheduled scan.",
            insights: [],
            lastRun: state.lastRun,
            runCount: state.runCount
        };
    }
    return {
        status: "ready",
        insights: state.insights,
        lastRun: state.lastRun,
        runCount: state.runCount,
        total: state.insights.length
    };
}

module.exports = {
    runIntelligenceScan,
    getLatestInsights,
    INTERESTS,
    RSS_FEEDS
};
