const activity = require("../brain/activityService");

const PLACEHOLDER_NAMES = [
    "unknown", "n/a", "tbd", "test", "example", "sample",
    "company", "business", "organization", "placeholder",
    "lorem ipsum", "foo", "bar", "abc", "xyz"
];

const GENERIC_EMAIL_PATTERNS = [
    /^info@/, /^contact@/, /^admin@/, /^support@/,
    /^hello@/, /^office@/, /^mail@/, /^webmaster@/
];

function isPlaceholderName(name) {
    if (!name || typeof name !== "string") return true;
    const trimmed = name.trim();
    if (trimmed.length < 3) return true;
    if (PLACEHOLDER_NAMES.includes(trimmed.toLowerCase())) return true;
    if (/^\d+\s/.test(trimmed)) return true;
    if (/\b(best|top \d+|list of|directory|reviews)\b/i.test(trimmed)) return true;
    return false;
}

function isGenericEmail(email) {
    if (!email || typeof email !== "string") return false;
    return GENERIC_EMAIL_PATTERNS.test(email.toLowerCase().trim());
}

function extractDomain(email) {
    if (!email || typeof email !== "string") return "";
    const parts = email.toLowerCase().trim().split("@");
    return parts.length === 2 ? parts[1] : "";
}

function normalizeCompanyName(name) {
    if (!name) return "";
    return name
        .replace(/\s*[-–|]\s*(Columbus|Ohio|OH|Central Ohio).*$/i, "")
        .replace(/\s*(LLC|Inc|Corp|Ltd|Co|LP|LLP)\.?\s*$/i, "")
        .trim();
}

function companyMatchesEmailDomain(companyName, email) {
    const domain = extractDomain(email);
    if (!domain) return { valid: false, reason: "No email domain to compare" };

    const normalized = normalizeCompanyName(companyName).toLowerCase();
    const domainParts = domain.replace(/\.(com|org|net|io|co)$/, "").split(/[.-]/);
    const significantParts = domainParts.filter(p => p.length > 2);

    for (const part of significantParts) {
        if (normalized.includes(part)) {
            return { valid: true, matchedPart: part };
        }
    }

    const companyWords = normalized.split(/\s+/).filter(w => w.length > 3);
    for (const word of companyWords) {
        if (domain.includes(word)) {
            return { valid: true, matchedPart: word };
        }
    }

    return { valid: false, reason: `Company name "${companyName}" does not match email domain "${domain}"` };
}

async function validateProspect(prospect, options = {}) {
    const errors = [];
    const warnings = [];
    const name = prospect.name || prospect.organization || prospect.companyName || "";
    const email = prospect.executiveEmail || prospect.email || prospect.contactEmail || "";
    const website = prospect.website || prospect.sourceUrl || "";

    if (isPlaceholderName(name)) {
        errors.push(`Company name is required. Got: "${name || "(empty)"}". Must be a real business name.`);
    }

    if (!email) {
        errors.push("Email address is required for outreach.");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`Invalid email format: "${email}"`);
    }

    if (email && name && !isPlaceholderName(name)) {
        const domainMatch = companyMatchesEmailDomain(name, email);
        if (!domainMatch.valid) {
            warnings.push(domainMatch.reason);
        }
    }

    if (email && isGenericEmail(email)) {
        warnings.push(`Generic email address (${email}). Consider finding a direct contact.`);
    }

    if (website && email) {
        const emailDomain = extractDomain(email);
        const websiteHost = website.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
        if (emailDomain && websiteHost && emailDomain !== websiteHost) {
            warnings.push(`Email domain (${emailDomain}) doesn't match website (${websiteHost})`);
        }
    }

    const valid = errors.length === 0;
    const confidence = valid ? (warnings.length === 0 ? "high" : "medium") : "low";

    if (!valid) {
        activity.append("observed", `Prospect validation failed: ${name || "(no name)"} — ${errors.join("; ")}`, {
            source: "prospect-validation",
            name,
            email,
            errors
        });
    }

    return { valid, errors, warnings, confidence };
}

module.exports = { validateProspect, isPlaceholderName, isGenericEmail, extractDomain, companyMatchesEmailDomain, normalizeCompanyName, PLACEHOLDER_NAMES };
