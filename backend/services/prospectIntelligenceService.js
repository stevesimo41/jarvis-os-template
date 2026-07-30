const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CACHE_DIR = path.join(
    __dirname,
    "..",
    "data",
    "crm",
    "intelligence"
);

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_VERSION = "crm-012-local-fields";

function normalize(value) {
    return String(value ?? "").trim();
}

function firstValue(record, keys) {
    for (const key of keys) {
        const value = normalize(record?.[key]);

        if (value) {
            return value;
        }
    }

    return "";
}

function prospectKey(record) {
    const company = firstValue(record, [
        "Company Name",
        "Company",
        "Organization",
        "Business Name",
        "Name",
        "name"
    ]);

    const website = firstValue(record, [
        "Website",
        "URL",
        "website"
    ]);

    const raw = `${company}|${website}`.toLowerCase();

    return crypto
        .createHash("sha256")
        .update(raw)
        .digest("hex")
        .slice(0, 24);
}

function cachePath(key) {
    return path.join(CACHE_DIR, `${key}.json`);
}

function readCache(key) {
    try {
        const file = cachePath(key);

        if (!fs.existsSync(file)) {
            return null;
        }

        const parsed = JSON.parse(
            fs.readFileSync(file, "utf8")
        );

        const createdAt = Date.parse(parsed.createdAt);

        if (
            Number.isFinite(createdAt) &&
            Date.now() - createdAt <= CACHE_TTL_MS &&
            parsed.version === CACHE_VERSION
        ) {
            return parsed;
        }

        return null;
    } catch {
        return null;
    }
}

function writeCache(key, profile) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });

    fs.writeFileSync(
        cachePath(key),
        JSON.stringify(profile, null, 2)
    );
}

function scoreProspect(record) {
    let score = 35;
    const reasons = [];

    const website = firstValue(record, [
        "Website",
        "URL",
        "website"
    ]);

    const contact = firstValue(record, [
        "Main Contact",
        "Contact",
        "Contact Name",
        "fullName"
    ]);

    const email = firstValue(record, [
        "EMAIL",
        "Email",
        "email"
    ]);

    const phone = firstValue(record, [
        "Phone",
        "PHONE",
        "phone"
    ]);

    const category = firstValue(record, [
        "Master-Category",
        "Master Category",
        "Category",
        "industry"
    ]);

    const followUp = firstValue(record, [
        "**DATE ONLY** Follow up date",
        "Follow up date",
        "Follow Up",
        "Follow Up Date",
        "nextActionDue"
    ]);

    const lastContact = firstValue(record, [
        "**DATE ONLY** Last Date of Contact",
        "Last Date of Contact",
        "Last Contact",
        "lastOutreachAt"
    ]);

    if (website) {
        score += 15;
        reasons.push("Website available for campaign research.");
    }

    if (contact) {
        score += 12;
        reasons.push("Named contact is available.");
    }

    if (email) {
        score += 10;
        reasons.push("Direct email channel is available.");
    }

    if (phone) {
        score += 8;
        reasons.push("Direct phone channel is available.");
    }

    if (category) {
        score += 8;
        reasons.push("Prospect is categorized for campaign fit.");
    }

    if (followUp) {
        score += 7;
        reasons.push("A follow up date is already assigned.");
    }

    if (lastContact) {
        score += 5;
        reasons.push("Prior relationship activity is recorded.");
    }

    score = Math.min(100, score);

    return {
        score,
        reasons
    };
}

function buildSummary(record) {
    const company = firstValue(record, [
        "Company Name",
        "Company",
        "Organization",
        "Business Name",
        "Name",
        "name"
    ]) || "This prospect";

    const category = firstValue(record, [
        "Master-Category",
        "Master Category",
        "Category",
        "industry"
    ]);

    const city = firstValue(record, ["City", "city"]);
    const state = firstValue(record, ["ST", "State", "state"]);
    const location = [city, state]
        .filter(Boolean)
        .join(", ");

    const parts = [
        `${company} is a Well Noticed prospect`
    ];

    if (category) {
        parts.push(`in the ${category} category`);
    }

    if (location) {
        parts.push(`serving ${location}`);
    }

    return `${parts.join(" ")}.`;
}

function recommendNextAction(record, score) {
    const followUp = firstValue(record, [
        "**DATE ONLY** Follow up date",
        "Follow up date",
        "Follow Up",
        "Follow Up Date",
        "nextActionDue"
    ]);

    const contact = firstValue(record, [
        "Main Contact",
        "Contact",
        "Contact Name",
        "fullName"
    ]);

    const website = firstValue(record, [
        "Website",
        "URL",
        "website"
    ]);

    if (followUp) {
        return `Complete the scheduled follow up for ${followUp}.`;
    }

    if (score >= 75 && contact) {
        return "Prepare a personalized outreach message and call the named contact.";
    }

    if (website) {
        return "Review the company website and identify one specific campaign opportunity.";
    }

    return "Research the company and identify the best decision maker.";
}

function buildProfile(record) {
    const key = prospectKey(record);
    const cached = readCache(key);

    if (cached) {
        return {
            ...cached,
            cached: true
        };
    }

    const scored = scoreProspect(record);
    const company = firstValue(record, [
        "Company Name",
        "Company",
        "Organization",
        "Business Name",
        "Name",
        "name"
    ]) || "Unnamed prospect";

    const profile = {
        key,
        company,
        summary: buildSummary(record),
        opportunityScore: scored.score,
        scoreReasons: scored.reasons,
        nextBestAction: recommendNextAction(
            record,
            scored.score
        ),
        signals: {
            hasWebsite: Boolean(
                firstValue(record, ["Website", "URL", "website"])
            ),
            hasNamedContact: Boolean(
                firstValue(record, [
                    "Main Contact",
                    "Contact",
                    "Contact Name",
                    "fullName"
                ])
            ),
            hasEmail: Boolean(
                firstValue(record, ["EMAIL", "Email", "email"])
            ),
            hasPhone: Boolean(
                firstValue(record, ["Phone", "PHONE", "phone"])
            ),
            hasFollowUp: Boolean(
                firstValue(record, [
                    "**DATE ONLY** Follow up date",
                    "Follow up date",
                    "Follow Up",
                    "Follow Up Date",
                    "nextActionDue"
                ])
            )
        },
        createdAt: new Date().toISOString(),
        cached: false,
        version: CACHE_VERSION
    };

    writeCache(key, profile);

    return profile;
}

function invalidate(record) {
    const key = prospectKey(record);
    const file = cachePath(key);

    if (fs.existsSync(file)) {
        fs.unlinkSync(file);
    }

    return {
        key,
        invalidated: true
    };
}

module.exports = {
    buildProfile,
    invalidate
};
