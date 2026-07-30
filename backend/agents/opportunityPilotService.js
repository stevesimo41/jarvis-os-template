const crypto = require("crypto");
const path = require("path");
const liveCrmService = require("../services/liveCrmService");
const autonomy = require("../autonomy/autonomyService");
const control = require("../services/systemControlService");
const activity = require("../brain/activityService");
const { readJson, writeJsonAtomic } = require("../storage/atomicJsonStore");

const agent = { id: "opportunity-discovery-agent", version: "1.1", mode: "supervised", approvedSources: ["google-sheet-crm", "canonical-brain"], prohibitedActions: ["external_research_without_approval", "outreach", "publish", "spend", "transact"] };

const PROSPECTABLE_STATUSES = ["Not Touched", "Reached Out"];
const HIGH_FIT_THRESHOLD = 60;
const MEDIUM_FIT_THRESHOLD = 40;
function ledgerPath() { return process.env.JARVIS_OPPORTUNITY_AGENT_RUNS_PATH || path.join(__dirname, "../data/agents/opportunity-runs.json"); }
function runs() { return readJson(ledgerPath(), []).slice().reverse(); }

async function discover() {
    if (!process.env.GOOGLE_SHEETS_SPREADSHEET_ID) return [];
    const response = await liveCrmService.getEntity("prospects");
    const prospects = response.data || [];
    return prospects
        .filter(p => PROSPECTABLE_STATUSES.includes(p.status))
        .map(p => ({
            id: `sheet-${p.id}`,
            organizationId: p.id,
            ventureId: "well-noticed",
            name: p.name,
            title: `Evaluate partnership fit: ${p.name}`,
            status: p.status,
            category: p.category || "",
            fitScore: p.fitScore || 0,
            confidence: p.website && p.category ? 80 : 70,
            evidence: [
                { source: "google-sheet-crm", sourceRecord: p.id, observedAt: p.updatedAt || p.createdAt || null, fact: `${p.name} — status: ${p.status}, category: ${p.category || "unknown"}` }
            ],
            nextAction: p.fitScore >= HIGH_FIT_THRESHOLD
                ? "Auto-qualify: submit to Agent Hub for approval."
                : p.fitScore >= MEDIUM_FIT_THRESHOLD
                    ? "Needs qualification before outreach."
                    : "Below threshold — log only, no action.",
            externalActions: false,
            spend: 0
        }));
}

async function discoverAndSubmit(options) {
    const approvals = require("../governance/approvalService");
    const candidates = await discover();
    const requests = [];
    let autoSubmitted = 0;
    let qualified = 0;
    let belowThreshold = 0;

    for (const candidate of candidates) {
        if (candidate.fitScore >= HIGH_FIT_THRESHOLD) {
            try {
                const approvalRequest = approvals.requestApproval({
                    action: "add_prospects_to_crm",
                    ventureId: "well-noticed",
                    organizationId: null,
                    requestedBy: options?.actor || "opportunity-pilot",
                    context: {
                        type: "opportunity-pilot-prospect",
                        prospect: {
                            id: candidate.id,
                            name: candidate.name,
                            status: candidate.status,
                            category: candidate.category,
                            fitScore: candidate.fitScore,
                            source: "google-sheet-crm"
                        },
                        note: `Opportunity Pilot auto-qualified ${candidate.name} (fit score: ${candidate.fitScore}). Ready for outreach.`
                    }
                });
                requests.push(approvalRequest);
                autoSubmitted++;
            } catch (error) {
                activity.append("observed", `Failed to submit opportunity for approval: ${candidate.name}`, { source: "opportunity-pilot", error: error.message });
            }
        } else if (candidate.fitScore >= MEDIUM_FIT_THRESHOLD) {
            qualified++;
        } else {
            belowThreshold++;
        }
    }

    activity.append("prepared", `Opportunity Pilot: ${autoSubmitted} auto-submitted, ${qualified} qualified (needs review), ${belowThreshold} below threshold`, {
        source: "opportunity-pilot",
        totalScanned: candidates.length,
        autoSubmitted,
        qualified,
        belowThreshold
    });

    return { candidates, submittedForApproval: requests.length, approvalRequests: requests, autoSubmitted, qualified, belowThreshold };
}
async function status() { const history = runs(); const preview = await discover(); return { agent, preview, recentRuns: history.slice(0, 20), metrics: { runs: history.length, candidatesPrepared: history.reduce((sum, run) => sum + run.preparedCount, 0), externalActions: 0, spend: 0, realizedRevenue: 0 }, boundaries: { requiresOperator: true, backgroundExecution: false, crmMutations: false } }; }
async function run(actor) {
    if (control.status().stopped) throw new Error("Global emergency stop is active");
    const evaluation = autonomy.evaluate({ action: "research_organization", source: "google-sheet-crm", confidence: 80, budget: 0, externalAction: false });
    if (!evaluation.allowed) throw new Error(evaluation.reasons.join("; "));
    const result = await discoverAndSubmit({ actor }); const record = { id: crypto.randomUUID(), traceId: crypto.randomUUID(), agentId: agent.id, agentVersion: agent.version, actor, mode: "supervised", runAt: new Date().toISOString(), sourceIds: ["google-sheet-crm", "canonical-brain"], outcome: result.candidates.length ? "candidates-prepared" : "data-blocked", candidateCount: result.candidates.length, preparedCount: result.candidates.length, submittedForApproval: result.submittedForApproval, autoSubmitted: result.autoSubmitted, qualified: result.qualified, belowThreshold: result.belowThreshold, candidates: result.candidates.slice(0, 20), executedCount: 0, crmMutations: 0, externalActions: 0, spend: 0, realizedRevenue: 0 };
    writeJsonAtomic(ledgerPath(), [...readJson(ledgerPath(), []), record].slice(-250));
    activity.append("prepared", "Opportunity Pilot scanned Google Sheet CRM and submitted findings for review", { source: "opportunity-pilot", traceId: record.traceId, outcome: record.outcome });
    return record;
}
module.exports = { status, run, discover, discoverAndSubmit, runs };
