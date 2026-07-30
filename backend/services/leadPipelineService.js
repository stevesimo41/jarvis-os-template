const fs = require("fs");
const path = require("path");
const { createGoogleSheetsClient } = require("../providers/createGoogleSheetsClient");
const { getGoogleSheetsConfig } = require("../config/googleSheets");
const jarvisCadence = require("./jarvisCadenceService");
const wellNoticedCampaign = require("./wellNoticedCampaignService");
const activity = require("../brain/activityService");
const cleansing = require("./dataCleansingService");

const STATE_PATH = path.join(__dirname, "../data/agents/lead-pipeline-state.json");

function readJson(filePath, fallback) {
    try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch (_e) { return fallback; }
}

function writeJson(filePath, data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadState() {
    return readJson(STATE_PATH, {
        lastRun: null,
        totalProcessed: 0,
        qualified: 0,
        cadencesCreated: 0,
        skipped: 0,
        errors: [],
        runs: []
    });
}

function saveState(state) {
    writeJson(STATE_PATH, state);
}

async function readProspectsFromSheet() {
    const config = getGoogleSheetsConfig();
    const sheets = createGoogleSheetsClient();

    const result = await sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: "Prospects!A:R"
    });

    const rows = result.data.values || [];
    if (rows.length < 2) return [];

    const header = rows[0];
    const prospects = [];

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every(c => !c || c.trim() === "")) continue;

        const prospect = {
            rowIndex: i + 1,
            masterCategory: (row[header.indexOf("Master-Category")] || "").trim(),
            subCategory: (row[header.indexOf("Sub-Category Name")] || "").trim(),
            companyName: (row[header.indexOf("Company Name")] || "").trim(),
            mainContact: (row[header.indexOf("Main Contact")] || "").trim(),
            streetAddress: (row[header.indexOf("Street Address")] || "").trim(),
            city: (row[header.indexOf("City")] || "").trim(),
            state: (row[header.indexOf("ST")] || "").trim(),
            zip: (row[header.indexOf("Zip")] || "").trim(),
            phone: (row[header.indexOf("Phone")] || "").trim(),
            email: (row[header.indexOf("EMAIL")] || "").trim(),
            website: (row[header.indexOf("Website")] || "").trim(),
            owner: (row[header.indexOf("WN / Owner (S / P)")] || "").trim(),
            lastContact: (row[header.indexOf("**DATE ONLY** Last Date of Contact")] || "").trim(),
            notes: (row[header.indexOf("Call info - Rolling / Details / Put Date at Top (NOTES)")] || "").trim(),
            followUpDate: (row[header.indexOf("**DATE ONLY** Follow up date")] || "").trim(),
            prospectStatus: (row[header.indexOf("Prospect, Customer, Term")] || "").trim(),
            touchStatus: (row[header.indexOf("Not Touched, Reached Out, In Communication, DNC")] || "").trim()
        };

        prospects.push(prospect);
    }

    return prospects;
}

function scoreProspect(prospect) {
    let score = 0;
    const signals = [];

    // Has email (critical for cadence)
    const validEmail = cleansing.validateEmail(prospect.email);
    if (validEmail) {
        score += 30;
        signals.push("has-email");
    } else {
        return { score: 0, signals: ["no-email"], recommendation: "skip" };
    }

    // Has website
    if (prospect.website && prospect.website.includes(".")) {
        score += 10;
        signals.push("has-website");
    }

    // Has phone
    if (prospect.phone && prospect.phone.length >= 10) {
        score += 5;
        signals.push("has-phone");
    }

    // Location bonus (Columbus/Ohio)
    if (prospect.city && prospect.city.toLowerCase().includes("columbus")) {
        score += 15;
        signals.push("columbus");
    }
    if (prospect.state && prospect.state.toUpperCase() === "OH") {
        score += 5;
        signals.push("ohio");
    }

    // Category fit using cleansing service
    const normalizedCategory = cleansing.normalizeCategory(prospect.masterCategory, prospect.subCategory);
    const highValueCategories = [
        "Home Improvement", "Home Services", "Real Estate", 
        "Healthcare", "Pet Services", "Health & Fitness"
    ];
    if (highValueCategories.includes(normalizedCategory)) {
        score += 20;
        signals.push("high-value-category");
    }

    // Has main contact name (good for personalization)
    if (prospect.mainContact && prospect.mainContact.length > 2) {
        score += 10;
        signals.push("has-contact-name");
    }

    // Determine recommendation
    let recommendation;
    if (score >= 60) {
        recommendation = "high-priority";
    } else if (score >= 40) {
        recommendation = "medium-priority";
    } else if (score >= 20) {
        recommendation = "low-priority";
    } else {
        recommendation = "skip";
    }

    return { score, signals, recommendation, normalizedCategory };
}

function determineCadenceType(prospect, score) {
    // Use cleansing service for normalized category
    const normalizedCategory = cleansing.normalizeCategory(prospect.masterCategory, prospect.subCategory);
    
    // Well Noticed targets: home, lifestyle, wellness, service categories
    const wellNoticedCategories = [
        "Home Improvement", "Home Services", "Real Estate",
        "Pet Services", "Health & Fitness", "Healthcare"
    ];

    if (wellNoticedCategories.includes(normalizedCategory) && score >= 40) {
        return "well-noticed";
    }

    // JARVIS cadence for everything else with email
    return "jarvis";
}

async function runPipeline(options = {}) {
    const { dryRun = false, maxCadences = 50, minScore = 20 } = options;
    const state = loadState();
    const runId = `run-${Date.now()}`;
    const runLog = { runId, startedAt: new Date().toISOString(), dryRun, options };

    try {
        // 1. Read all prospects from Google Sheet
        const allProspects = await readProspectsFromSheet();
        runLog.totalRead = allProspects.length;

        // 2. Filter: Not Touched + has email
        const candidates = allProspects.filter(p =>
            p.touchStatus.includes("Not Touched") &&
            p.email &&
            p.email.includes("@") &&
            p.companyName &&
            p.companyName !== "N/A" &&
            p.companyName !== "Unknown"
        );
        runLog.candidatesFound = candidates.length;

        // 3. Score each candidate
        const scored = candidates.map(p => ({
            ...p,
            scoring: scoreProspect(p)
        }));

        // 4. Filter by min score
        const qualified = scored.filter(p => p.scoring.score >= minScore);
        qualified.sort((a, b) => b.scoring.score - a.scoring.score);
        runLog.qualified = qualified.length;

        // 5. Create cadences (up to maxCadences)
        const results = [];
        let created = 0;
        let skipped = 0;
        let errors = [];

        for (const prospect of qualified) {
            if (created >= maxCadences) break;

            const cadenceType = determineCadenceType(prospect, prospect.scoring.score);

            if (dryRun) {
                results.push({
                    companyName: prospect.companyName,
                    email: prospect.email,
                    score: prospect.scoring.score,
                    cadenceType,
                    recommendation: prospect.scoring.recommendation,
                    signals: prospect.scoring.signals,
                    normalizedCategory: prospect.scoring.normalizedCategory
                });
                created++;
                continue;
            }

            try {
                let cadence;
                if (cadenceType === "well-noticed") {
                    cadence = wellNoticedCampaign.createCampaign({
                        name: prospect.companyName,
                        category: prospect.masterCategory || prospect.subCategory || "local business",
                        executiveName: prospect.mainContact || null,
                        executiveEmail: prospect.email,
                        website: prospect.website || null,
                        city: prospect.city || "Columbus",
                        fitScore: prospect.scoring.score,
                        specificStrength: prospect.subCategory || "strong reputation"
                    });
                } else {
                    cadence = jarvisCadence.createCadence({
                        companyName: prospect.companyName,
                        executiveName: prospect.mainContact || null,
                        email: prospect.email,
                        category: prospect.masterCategory || prospect.subCategory || "",
                        city: prospect.city || "Columbus",
                        fitScore: prospect.scoring.score,
                        capability: "AI and automation",
                        service: "digital transformation"
                    });
                }

                results.push({
                    companyName: prospect.companyName,
                    email: prospect.email,
                    score: prospect.scoring.score,
                    cadenceType,
                    cadenceId: cadence.id,
                    status: "created"
                });
                created++;
            } catch (err) {
                errors.push({
                    companyName: prospect.companyName,
                    email: prospect.email,
                    error: err.message
                });
                skipped++;
            }
        }

        runLog.completedAt = new Date().toISOString();
        runLog.cadencesCreated = created;
        runLog.skipped = skipped;
        runLog.errors = errors;
        runLog.results = results;

        // Update state
        state.lastRun = runLog.completedAt;
        state.totalProcessed += candidates.length;
        state.qualified += qualified.length;
        state.cadencesCreated += created;
        state.skipped += skipped;
        state.runs.push({
            runId,
            timestamp: runLog.completedAt,
            totalRead: runLog.totalRead,
            candidates: runLog.candidatesFound,
            qualified: runLog.qualified,
            created,
            skipped,
            dryRun
        });

        // Keep only last 20 runs
        if (state.runs.length > 20) {
            state.runs = state.runs.slice(-20);
        }

        saveState(state);

        activity.append("executed", `Lead pipeline run ${dryRun ? "(DRY RUN) " : ""}completed: ${created} cadences created from ${qualified.length} qualified leads`, {
            source: "lead-pipeline",
            runId,
            dryRun,
            totalRead: runLog.totalRead,
            candidates: runLog.candidatesFound,
            qualified: runLog.qualified,
            created,
            skipped
        });

        return runLog;
    } catch (err) {
        runLog.error = err.message;
        runLog.completedAt = new Date().toISOString();
        state.runs.push({ runId, timestamp: runLog.completedAt, error: err.message });
        saveState(state);
        throw err;
    }
}

function getPipelineStatus() {
    const state = loadState();
    return {
        lastRun: state.lastRun,
        totalProcessed: state.totalProcessed,
        qualified: state.qualified,
        cadencesCreated: state.cadencesCreated,
        skipped: state.skipped,
        recentRuns: state.runs.slice(-5)
    };
}

module.exports = {
    readProspectsFromSheet,
    scoreProspect,
    runPipeline,
    getPipelineStatus
};
