const activity = require("../brain/activityService");

const PLACEHOLDER_NAMES = [
    "unknown", "n/a", "tbd", "test", "example", "sample",
    "company", "business", "organization", "placeholder",
    "lorem ipsum", "foo", "bar", "abc", "xyz"
];

const CATEGORY_PREFIXES = [
    "home ", "kitchen ", "bath ", "basement ", "roofing ", "remodel",
    "landscape ", "lawn ", "deck ", "fence ", "painting ", "floor",
    "window ", "door ", "garage ", "carpet ", "concrete ", "masonry",
    "plumbing ", "electric ", "hvac ", "heating ", "cooling ", "ac ",
    "cleaning ", "junk ", "moving ", "storage ",
    "best ", "top ", "affordable ", "cheap ", "premium ", "luxury ",
    "professional ", "expert ", "quality ", "reliable ",
    "full[- ]service ", "custom ",
];

const GENERIC_EMAIL_PATTERNS = [
    /^info@/, /^contact@/, /^admin@/, /^support@/,
    /^hello@/, /^office@/, /^mail@/, /^webmaster@/
];

const PLACEHOLDER_EMAIL_DOMAINS = [
    "domain.com", "domainname.com", "yourdomain.com",
    "example.com", "test.com", "sample.com"
];

const PLACEHOLDER_EMAIL_PATTERNS = [
    /^user@/, /^email@/, /^name@/, /^your@/, /^you@/
];

const ANALYTICS_EMAIL_PATTERNS = [
    /@sentry-next\./, /@analytics\./, /@tracking\./,
    /@notification\./, /@noreply\./, /@no-reply\./
];

function isCityOnlyName(name) {
    const match = name.match(/^(the\s+)?([a-zA-Z.\s'-]+?)(,\s*)?\s*(OH|Ohio)\s*$/i);
    if (!match) return false;
    const cityPart = match[2].trim();
    const cityWords = cityPart.split(/\s+/).filter(w => w.length > 0);
    return cityWords.length <= 2 && !/[A-Z]{3,}/.test(cityPart);
}

function isGenericCategoryName(name) {
    const categoryWords = ["home", "kitchen", "bath", "basement", "roofing", "landscape", "lawn", "deck", "fence", "painting", "flooring", "window", "door", "garage", "carpet", "concrete", "masonry", "plumbing", "electrical", "hvac", "heating", "cooling", "cleaning", "junk", "moving", "storage", "remodel", "renovation", "remodeling", "renovations", "construction", "contractor", "contractors", "services", "service", "company", "companies", "solution", "solutions", "pro", "pros", "specialist", "specialists", "experts", "professionals", "design", "build", "custom", "remodelers", "renovator", "renovators", "restoration", "replacement", "improvement", "improvements", "additions", "repair", "repairs", "cabinetry", "cabinets", "countertops", "countertop", "systems", "acrylic", "floor", "glass", "tile", "gutters", "siding", "insulation", "waterproofing", "paving", "driveway", "lighting", "closet", "cabinet", "stone", "marble", "granite", "trim", "molding", "blinds", "shutters", "awnings"];
    const locationWords = ["columbus", "dublin", "worthington", "gahanna", "westerville", "hilliard", "delaware", "newark", "pataskala", "pickerington", "reynoldsburg", "grovecity", "cincinnati", "dayton", "toledo", "cleveland", "akron", "central", "ohio", "oh"];
    const stopWords = ["the", "and", "for", "with", "your", "our", "its", "all", "inc", "llc", "ltd", "in", "of", "to", "a", "an"];
    const lower = name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    const words = lower.split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w));
    const significant = words.filter(w => !locationWords.includes(w));
    if (significant.length === 0) return true;
    const nonGeneric = significant.filter(w => !categoryWords.includes(w));
    return nonGeneric.length === 0;
}

function isPlaceholderName(name) {
    if (!name || typeof name !== "string") return true;
    const trimmed = name.trim();
    if (trimmed.length < 3) return true;
    if (PLACEHOLDER_NAMES.includes(trimmed.toLowerCase())) return true;
    if (/^\d+\s+(best|top|list of|directory|reviews|companies|contractors|agencies)\b/i.test(trimmed)) return true;
    if (/\b(best|top \d+|list of|directory|reviews)\b/i.test(trimmed)) return true;
    if (isCityOnlyName(trimmed)) return true;
    if (isGenericCategoryName(trimmed)) return true;
    return false;
}

function isGenericEmail(email) {
    if (!email || typeof email !== "string") return false;
    return GENERIC_EMAIL_PATTERNS.test(email.toLowerCase().trim());
}

function isPlaceholderEmail(email) {
    if (!email || typeof email !== "string") return true;
    const lower = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower)) return true;
    const domain = lower.split("@")[1];
    if (PLACEHOLDER_EMAIL_DOMAINS.includes(domain)) return true;
    if (PLACEHOLDER_EMAIL_PATTERNS.some(p => p.test(lower))) return true;
    if (ANALYTICS_EMAIL_PATTERNS.some(p => p.test(lower))) return true;
    return false;
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
    } else if (isPlaceholderEmail(email)) {
        errors.push(`Placeholder/invalid email: "${email}" — cannot be used for outreach`);
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

module.exports = { validateProspect, isPlaceholderName, isGenericEmail, isPlaceholderEmail, extractDomain, companyMatchesEmailDomain, normalizeCompanyName, isCityOnlyName, isGenericCategoryName, PLACEHOLDER_NAMES };
