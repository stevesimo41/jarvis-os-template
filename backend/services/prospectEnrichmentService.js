const webResearch = require("./webResearch");
const activity = require("../brain/activityService");
const learning = require("./learningService");

const LINKEDIN_TITLE_PATTERNS = [
    /(?:owner|president|ceo|founder|principal|general\s+manager|managing\s+director|chief\s+\w+\s+officer|vp|vice\s+president|director)/i
];

const LINKEDIN_NAME_PATTERNS = [
    /^([A-Z][a-z]+\s+[A-Z][a-z]+)/,
    /^([A-Z][a-z]+\s+[A-Z]\.?\s+[A-Z][a-z]+)/,
    /^([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+)/
];

async function searchLinkedIn(name, city) {
    const query = `${name} ${city || "Columbus"} Ohio linkedin.com/in`;
    const results = await webResearch.searchWeb(query).catch(() => []);

    for (const result of results.slice(0, 8)) {
        const url = result.url || "";
        if (!url.includes("linkedin.com/in")) continue;

        const title = result.title || "";
        const snippet = result.snippet || result.description || "";
        const combined = `${title} ${snippet}`;

        let execName = null;
        let execTitle = null;

        for (const pattern of LINKEDIN_TITLE_PATTERNS) {
            const titleMatch = combined.match(pattern);
            if (titleMatch) {
                execTitle = titleMatch[0].trim();
                break;
            }
        }

        const nameMatch = title.match(/^([A-Z][a-z]+\s+[A-Z][a-z]+)/);
        if (nameMatch) {
            execName = nameMatch[1].trim();
        }

        if (!execName) {
            for (const pattern of LINKEDIN_NAME_PATTERNS) {
                const m = title.match(pattern);
                if (m) {
                    execName = m[1].trim();
                    break;
                }
            }
        }

        if (execName && execTitle) {
            return { name: execName, title: execTitle, source: url };
        }

        if (execName) {
            return { name: execName, title: execTitle || null, source: url };
        }
    }

    return null;
}

async function enrichProspect(prospect) {
    const name = prospect.name || prospect["Company Name"] || "";
    const website = prospect.website || prospect.Website || prospect.URL || "";

    if (!name) {
        return { enriched: false, reason: "No company name provided" };
    }

    const result = {
        name,
        website: website || null,
        email: prospect.email || prospect.EMAIL || null,
        phone: prospect.phone || prospect.Phone || prospect.PHONE || null,
        executiveName: prospect.executiveName || prospect.contact || prospect["Main Contact"] || null,
        executiveTitle: prospect.executiveTitle || null,
        googleReviewCount: prospect.googleReviewCount || null,
        city: prospect.city || prospect.City || null,
        sources: [],
        allEmails: []
    };

    try {
        const targetUrl = website || null;

        if (targetUrl) {
            const html = await webResearch.fetchPage(targetUrl).catch(() => null);
            if (html) {
                const titleRaw = html.match(/<title>([^<]*)<\/title>/i);
                if (titleRaw) {
                    const cleaned = titleRaw[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
                    const parts = cleaned.split(/\s*[|–—-]\s*/).filter(Boolean);
                    const nameCandidates = parts.filter(p => {
                        const l = p.toLowerCase();
                        return p.length > 4 && !["home", "about", "contact", "services", "welcome"].includes(l);
                    });
                    if (nameCandidates.length > 0) {
                        result.correctedName = nameCandidates[0].trim();
                        result.sources.push({ type: "website-title", url: targetUrl });
                    }
                }
                const text = webResearch.extractText(html);

                const emails = webResearch.extractEmails(text);
                if (emails.length > 0 && !result.email) {
                    result.email = emails[0];
                    result.sources.push({ type: "website-email", url: targetUrl });
                }
                result.allEmails = emails.slice(0, 3);

                const phones = webResearch.extractPhones(text);
                if (phones.length > 0 && !result.phone) {
                    result.phone = phones[0];
                    result.sources.push({ type: "website-phone", url: targetUrl });
                }

                const execPatterns = [
                    /(?:owner|president|ceo|founder|principal|managing\s+director)[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
                    /(?:owner|president|ceo|founder|principal)[:\s]+([A-Z][a-z]+\s+[A-Z]\.?\s+[A-Z][a-z]+)/i,
                    /(?:owner|president|ceo|founder|principal)[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+)/i
                ];
                for (const pattern of execPatterns) {
                    const match = text.match(pattern);
                    if (match && !result.executiveName) {
                        result.executiveName = match[1].trim();
                        result.sources.push({ type: "website-executive", url: targetUrl });
                        break;
                    }
                }

                const titlePatterns = [
                    /(?:owner|president|ceo|founder|principal|general\s+manager|managing\s+director)/i
                ];
                for (const pattern of titlePatterns) {
                    const match = text.match(pattern);
                    if (match && !result.executiveTitle) {
                        result.executiveTitle = match[0].trim();
                        break;
                    }
                }

                const cityMatch = text.match(/(?:Columbus|Dublin|Westerville|Grove City|Pickerington|Reynoldsburg|Gahanna|Upper Arlington|Bexley|German Village)[,\s]*Ohio/i);
                if (cityMatch && !result.city) {
                    result.city = cityMatch[0].replace(/,\s*Ohio/i, "").trim();
                }

                const reviewMatch = text.match(/(\d{1,4})\s*(?:reviews?|google\s*reviews?)/i);
                if (reviewMatch && !result.googleReviewCount) {
                    result.googleReviewCount = reviewMatch[1];
                    result.sources.push({ type: "website-reviews", url: targetUrl });
                }
            }
        }

        if (!result.email || !result.executiveName) {
            const searchQuery = `"${name}" Columbus Ohio owner email contact`;
            const searchResults = await webResearch.searchWeb(searchQuery);

            for (const sr of searchResults.slice(0, 3)) {
                if (sr.url && sr.url !== targetUrl) {
                    const html = await webResearch.fetchPage(sr.url).catch(() => null);
                    if (!html) continue;

                    const text = webResearch.extractText(html);

                    if (!result.email || result.allEmails.length < 3) {
                        const searchEmails = webResearch.extractEmails(text);
                        const newEmails = searchEmails.filter(e => !result.allEmails.includes(e));
                        result.allEmails = [...result.allEmails, ...newEmails].slice(0, 3);
                        if (!result.email && searchEmails.length > 0) {
                            result.email = searchEmails[0];
                            result.sources.push({ type: "web-search-email", url: sr.url });
                        }
                    }

                    if (!result.executiveName) {
                        const namePattern = new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^.]{0,100}(?:owner|president|ceo|founder)[^.]{0,100}([A-Z][a-z]+\\s+[A-Z][a-z]+)`, "i");
                        const match = text.match(namePattern);
                        if (match) {
                            result.executiveName = match[1].trim();
                            result.sources.push({ type: "web-search-executive", url: sr.url });
                        }
                    }

                    if (!result.executiveName) {
                        const altPatterns = [
                            /(?:founded by|started by|owned by|led by|president|owner|ceo)[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
                            /([A-Z][a-z]+\s+[A-Z][a-z]+)\s*,?\s*(?:owner|president|ceo|founder)/i
                        ];
                        for (const pattern of altPatterns) {
                            const match = text.match(pattern);
                            if (match) {
                                result.executiveName = match[1].trim();
                                result.sources.push({ type: "web-search-executive", url: sr.url });
                                break;
                            }
                        }
                    }

                    if (result.email && result.executiveName) break;
                }
            }
        }

        if (!result.executiveName) {
            const linkedinResult = await searchLinkedIn(name, result.city);
            if (linkedinResult) {
                result.executiveName = linkedinResult.name;
                if (linkedinResult.title && !result.executiveTitle) {
                    result.executiveTitle = linkedinResult.title;
                }
                result.sources.push({ type: "linkedin", url: linkedinResult.source });
            }
        }

        activity.append("observed", `Prospect enriched: ${name}`, {
            source: "prospect-enrichment",
            fieldsFound: Object.keys(result).filter(k => result[k] && k !== "sources" && k !== "name"),
            sourcesCount: result.sources.length
        });

        const learned = learning.applyPatterns(result, { name });
        for (const k of ["_learnedTitle", "_learnedName", "_learnedCompanyName"]) {
            if (learned[k]) {
                activity.append("observed", `Learning applied: ${k.replace("_learned","")} corrected for ${name}`, {
                    source: "learning-service",
                    field: k, company: name
                });
            }
        }

        return { enriched: true, data: learned };
    } catch (error) {
        activity.append("observed", `Prospect enrichment failed: ${name}`, {
            source: "prospect-enrichment",
            error: error.message
        });
        return { enriched: false, reason: error.message, data: result };
    }
}

module.exports = { enrichProspect, searchLinkedIn };

