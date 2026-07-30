const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { once } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");

const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), "jarvis-010-"));
const testCrmData = path.join(testRoot, "crm");
fs.cpSync(path.resolve(__dirname, "../data/crm"), testCrmData, {
    recursive: true
});
process.env.JARVIS_CRM_DATA_DIR = testCrmData;
process.env.JARVIS_APPROVALS_PATH = path.join(testRoot, "approvals.json");
process.env.JARVIS_AUDIT_LOG_PATH = path.join(testRoot, "audit.jsonl");
process.env.JARVIS_ACTIVITY_LOG_PATH = path.join(testRoot, "activity.jsonl");
process.env.JARVIS_SYSTEM_CONTROL_PATH = path.join(testRoot, "system-control.json");
process.env.JARVIS_AUTONOMY_STATE_PATH = path.join(testRoot, "autonomy-state.json");
process.env.JARVIS_RENEWAL_PILOT_LEDGER_PATH = path.join(testRoot, "renewal-runs.json");
process.env.JARVIS_AGENT_SCHEDULES_PATH = path.join(testRoot, "agent-schedules.json");
process.env.JARVIS_AGENT_RUNS_PATH = path.join(testRoot, "agent-runs.json");
process.env.JARVIS_OPPORTUNITY_AGENT_RUNS_PATH = path.join(testRoot, "opportunity-agent-runs.json");
process.env.JARVIS_XODUS_AGENT_RUNS_PATH = path.join(testRoot, "xodus-agent-runs.json");
process.env.JARVIS_VENTURE_AGENT_STATE_PATH = path.join(testRoot, "venture-agent-state.json");
process.env.JARVIS_CHIEF_OF_STAFF_RUNS_PATH = path.join(testRoot, "chief-of-staff-runs.json");
process.env.JARVIS_SECRETS_PATH = path.join(testRoot, "operational-secrets.enc.json");
process.env.JARVIS_SESSIONS_PATH = path.join(testRoot, "sessions.json");
process.env.JARVIS_OWNER_NAME = "test-owner";
process.env.JARVIS_OWNER_TOKEN = "owner-token-jarvis-011-very-long-and-safe";
process.env.JARVIS_OPERATOR_NAME = "test-operator";
process.env.JARVIS_OPERATOR_TOKEN = "operator-token-jarvis-011-long-and-safe";
process.env.JARVIS_VIEWER_NAME = "test-viewer";
process.env.JARVIS_VIEWER_TOKEN = "viewer-token-jarvis-011-very-long-and-safe";

const fixtureOrganizationId = "jarvis-011-governed-test";
const organizationsPath = path.join(testCrmData, "organizations.json");
const fixtureOrganizations = JSON.parse(
    fs.readFileSync(organizationsPath, "utf8")
);
fixtureOrganizations.push({
    id: fixtureOrganizationId,
    ventureId: "well-noticed",
    name: "JARVIS 011 Governed Test",
    website: "https://governed-test.example",
    status: "prospect"
});
fs.writeFileSync(
    organizationsPath,
    `${JSON.stringify(fixtureOrganizations, null, 2)}\n`
);

const app = require("../server");
const { buildProfile, invalidate } = require("../services/prospectIntelligenceService");
const { createCommandEnvelope } = require("../core/commandEnvelope");
const encryptedBackup = require("../services/encryptedBackupService");
const secretVault = require("../services/secretVaultService");

let server;
let baseUrl;

before(async () => {
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
    });
    fs.rmSync(testRoot, { recursive: true, force: true });
});

function authorization(role) {
    const tokens = {
        owner: process.env.JARVIS_OWNER_TOKEN,
        operator: process.env.JARVIS_OPERATOR_TOKEN,
        viewer: process.env.JARVIS_VIEWER_TOKEN
    };
    return { Authorization: `Bearer ${tokens[role]}` };
}

async function getJson(path, headers = {}) {
    const response = await fetch(`${baseUrl}${path}`, { headers });
    return { response, payload: await response.json() };
}

async function sendJson(path, method, body, headers = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body)
    });
    return { response, payload: await response.json() };
}

test("health endpoint starts through the exported app", async () => {
    const decisionsPath = path.resolve(
        __dirname,
        "../memory/history/decisions.json"
    );
    const decisionsBefore = fs.readFileSync(decisionsPath, "utf8");
    const { response, payload } = await getJson("/health");
    assert.equal(response.status, 200);
    assert.ok(payload);
    assert.equal(
        fs.readFileSync(decisionsPath, "utf8"),
        decisionsBefore,
        "Health checks must not mutate decision memory"
    );
});

test("backend serves the CRM demo interface", async () => {
    const response = await fetch(baseUrl);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.match(html, /JARVIS OS/);
    assert.match(html, /crm\/crmGovernance\.js/);
    assert.match(html, /Ask JARVIS/);
    assert.match(html, /Agent Hub/);
    assert.doesNotMatch(html, /onclick="loadModule\('agents'\)"/);
    assert.doesNotMatch(html, /onclick="loadModule\('production-agents'\)"/);
    assert.doesNotMatch(html, /onclick="loadModule\('activity'\)"/);
    assert.match(html, /onclick="loadModule\('settings'\)"/);
    for (const moduleName of ["memory", "releases", "mobile", "voice", "operations", "readiness", "activity"]) {
        assert.doesNotMatch(html, new RegExp(`onclick="loadModule\\('${moduleName}'\\)"`));
    }
    assert.match(html, /manifest\.webmanifest/);
    assert.match(html, /releases\/releases\.js/);
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.match(response.headers.get("content-security-policy"), /default-src 'self'/);

    const sameOriginAssets = await Promise.all([
        "/dashboard/dashboard.js",
        "/ui/layout.js",
        "/chat/chat.js",
        "/releases/releases.js"
    ].map(async asset => (await fetch(`${baseUrl}${asset}`)).text()));
    assert.doesNotMatch(
        sameOriginAssets.join("\n"),
        /http:\/\/localhost:3000\/api\//,
        "Frontend API requests must use the active JARVIS origin"
    );
    assert.match(sameOriginAssets.join("\n"), /REGISTERED/);
});

test("mobile shell is installable and emergency stop is owner controlled", async () => {
    const manifest = await fetch(`${baseUrl}/manifest.webmanifest`);
    const manifestData = await manifest.json();
    assert.equal(manifest.status, 200);
    assert.equal(manifestData.display, "standalone");
    const worker = await fetch(`${baseUrl}/service-worker.js`);
    assert.equal(worker.status, 200);
    assert.doesNotMatch(await worker.text(), /\/api\/.*cache/i);

    const denied = await sendJson("/api/system-control/stop", "POST", { confirmation: "STOP" }, authorization("operator"));
    assert.equal(denied.response.status, 403);
    const stopped = await sendJson("/api/system-control/stop", "POST", { confirmation: "STOP" }, authorization("owner"));
    assert.equal(stopped.response.status, 200);
    assert.equal(stopped.payload.data.stopped, true);
    const resumed = await sendJson("/api/system-control/resume", "POST", { confirmation: "RESUME" }, authorization("owner"));
    assert.equal(resumed.payload.data.stopped, false);
});

test("phone access remains blocked until every private deployment gate is real", async () => {
    const { response, payload } = await getJson("/api/mobile-access/readiness");
    assert.equal(response.status, 200);
    assert.equal(payload.data.status, "not-ready");
    assert.equal(payload.data.publicUrl, null);
    assert.equal(payload.data.developmentServerExposureAllowed, false);
    assert.ok(payload.data.gates.some(gate => !gate.ready));
    assert.doesNotMatch(JSON.stringify(payload), /owner-token-jarvis/);
});

test("Apple and voice contracts preserve authentication and approval boundaries", async () => {
    const capabilities = await getJson("/api/apple/capabilities");
    assert.equal(capabilities.response.status, 200);
    assert.equal(capabilities.payload.data.authenticationBypass, false);
    assert.equal(capabilities.payload.data.approvalBypass, false);
    const denied = await getJson("/api/apple/widget");
    assert.equal(denied.response.status, 401);
    const widget = await getJson("/api/apple/widget", authorization("viewer"));
    assert.equal(widget.response.status, 200);
    const idea = await sendJson("/api/apple/shortcuts/capture-idea", "POST", { idea: "A voice-captured test idea" }, authorization("viewer"));
    assert.equal(idea.response.status, 200);
    assert.equal(idea.payload.data.persisted, false);
    assert.equal(idea.payload.data.approvalRequiredToPersist, true);
    const stopDenied = await sendJson("/api/apple/shortcuts/stop-automation", "POST", { confirmation: "STOP" }, authorization("operator"));
    assert.equal(stopDenied.response.status, 403);
});

test("operational readiness reports real gates without exposing secrets", async () => {
    const { response, payload } = await getJson("/api/readiness/status");
    assert.equal(response.status, 200);
    assert.equal(payload.data.status, "not-production-ready");
    assert.ok(payload.data.criticalBlockers.includes("encrypted-vault"));
    assert.ok(payload.data.criticalBlockers.includes("private-https"));
    assert.equal(payload.data.boundaries.publicExposureAllowed, false);
    assert.equal(JSON.stringify(payload).includes(process.env.JARVIS_OWNER_TOKEN), false);
});

test("system inventory distinguishes live records, snapshots, and placeholders", async () => {
    const { response, payload } = await getJson("/api/system-inventory");
    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    assert.ok(["local", "openai"].includes(payload.data.conversationProvider));
    assert.equal(typeof payload.data.googleSheetsConfigured, "boolean");
    const classifications = new Set(payload.data.modules.map(item => item.classification));
    assert.ok(classifications.has("live-local"));
    assert.ok(classifications.has("snapshot-local"));
    assert.ok(classifications.has("capability-status"));
    assert.equal(payload.data.modules.find(item => item.name === "Agents & Approvals").classification, "mixed");
    assert.equal(payload.data.modules.find(item => item.name === "CRM").classification, "snapshot-local");
});

test("executive state uses canonical records and labels registry-only agents", async () => {
    const executive = await getJson("/api/executive-state");
    assert.equal(executive.response.status, 200);
    assert.equal(executive.payload.data.source, "canonical-context-v1");
    assert.equal(executive.payload.data.externalSynchronization, false);
    assert.ok(executive.payload.data.goals.length > 0);
    const agents = await getJson("/api/agents");
    assert.equal(agents.response.status, 200);
    assert.ok(agents.payload.filter(agent => !["chief-of-staff", "xodus-mission-partnership-agent", "venture-studio"].includes(agent.id)).every(agent => agent.status === "registry-only" && agent.operational === false));
    assert.equal(agents.payload.find(agent => agent.id === "xodus-mission-partnership-agent").operational, true);
    const brief = await getJson("/api/jarvis/brief");
    assert.equal(brief.payload.brief.provenance.source, "canonical-context-v1");
});

test("Well Noticed renewal pilot records a zero-action shadow run", async () => {
    const before = await getJson("/api/readiness/revenue-pilot");
    assert.equal(before.response.status, 200);
    assert.equal(before.payload.data.plan.mode, "shadow");
    assert.equal(before.payload.data.plan.candidateCount, 0);
    assert.ok(before.payload.data.plan.blockers.length > 0);
    const denied = await sendJson("/api/readiness/revenue-pilot/run", "POST", { confirmation: "RUN SHADOW" });
    assert.equal(denied.response.status, 401);
    const run = await sendJson("/api/readiness/revenue-pilot/run", "POST", { confirmation: "RUN SHADOW" }, authorization("operator"));
    assert.equal(run.response.status, 200);
    assert.equal(run.payload.data.outcome, "data-blocked");
    assert.equal(run.payload.data.executedCount, 0);
    assert.equal(run.payload.data.externalActions, 0);
    assert.equal(run.payload.data.spend, 0);
    const after = await getJson("/api/readiness/revenue-pilot");
    assert.equal(after.payload.data.metrics.runs, 1);
    assert.equal(after.payload.data.metrics.realizedRevenue, 0);
});

test("production agent schedules and supervised runs preserve owner control", async () => {
    const initial = await getJson("/api/production-agents/status");
    assert.equal(initial.response.status, 200);
    assert.equal(initial.payload.data.agents[0].version, "1.0");
    assert.equal(initial.payload.data.schedules[0].enabled, false);
    assert.equal(initial.payload.data.boundaries.backgroundExecution, false);
    assert.equal(initial.payload.data.connectors.find(item => item.id === "approved-research-source").approved, false);
    const runBlocked = await sendJson("/api/production-agents/runs", "POST", { scheduleId: initial.payload.data.schedules[0].id, confirmation: "RUN SUPERVISED" }, authorization("operator"));
    assert.equal(runBlocked.response.status, 409);
    const operatorDenied = await sendJson(`/api/production-agents/schedules/${initial.payload.data.schedules[0].id}`, "POST", { enabled: true, confirmation: "ENABLE SCHEDULE" }, authorization("operator"));
    assert.equal(operatorDenied.response.status, 403);
    const enabled = await sendJson(`/api/production-agents/schedules/${initial.payload.data.schedules[0].id}`, "POST", { enabled: true, confirmation: "ENABLE SCHEDULE" }, authorization("owner"));
    assert.equal(enabled.response.status, 200);
    const run = await sendJson("/api/production-agents/runs", "POST", { scheduleId: initial.payload.data.schedules[0].id, confirmation: "RUN SUPERVISED" }, authorization("operator"));
    assert.equal(run.response.status, 200);
    assert.equal(run.payload.data.mode, "supervised");
    assert.equal(run.payload.data.outcome, "data-blocked");
    assert.equal(run.payload.data.executedCount, 0);
    assert.equal(run.payload.data.crmMutations, 0);
    assert.equal(run.payload.data.externalActions, 0);
    assert.equal(run.payload.data.spend, 0);
    const after = await getJson("/api/production-agents/status");
    assert.equal(after.payload.data.metrics.runs, 1);
    assert.equal(after.payload.data.recentRuns[0].traceId, run.payload.data.traceId);
});

test("agent hub unifies registry, operations, review items, and owner approvals", async () => {
    const requested = await sendJson("/api/crm/workflow/approval/request", "POST", { ventureId: "well-noticed", organizationId: fixtureOrganizationId }, authorization("operator"));
    assert.equal(requested.response.status, 201);
    const approvalId = requested.payload.data.approval.id;
    const hub = await getJson("/api/agent-hub");
    assert.equal(hub.response.status, 200);
    assert.ok(hub.payload.data.registry.filter(agent => !["chief-of-staff", "xodus-mission-partnership-agent", "venture-studio"].includes(agent.id)).every(agent => agent.operational === false));
    assert.equal(hub.payload.data.registry.find(agent => agent.id === "xodus-mission-partnership-agent").operational, true);
    assert.ok(hub.payload.data.production.agents.length >= 1);
    assert.ok(hub.payload.data.items.some(item => item.approvalId === approvalId));
    assert.ok(hub.payload.data.summary.opportunityCandidates >= 0);
    const denied = await sendJson(`/api/agent-hub/approvals/${approvalId}/approve`, "POST", { confirmation: "APPROVE" }, authorization("operator"));
    assert.equal(denied.response.status, 403);
    const approved = await sendJson(`/api/agent-hub/approvals/${approvalId}/approve`, "POST", { confirmation: "APPROVE" }, authorization("owner"));
    assert.equal(approved.response.status, 200);
    assert.equal(approved.payload.data.status, "approved");
});

test("opportunity agent prepares approved-source CRM evidence without execution", async () => {
    const status = await getJson("/api/opportunity-agent/status");
    assert.equal(status.response.status, 200);
    assert.deepEqual(status.payload.data.agent.approvedSources, ["google-sheet-crm", "canonical-brain"]);
    const denied = await sendJson("/api/opportunity-agent/runs", "POST", { confirmation: "RUN OPPORTUNITY REVIEW" });
    assert.equal(denied.response.status, 401);
    const run = await sendJson("/api/opportunity-agent/runs", "POST", { confirmation: "RUN OPPORTUNITY REVIEW" }, authorization("operator"));
    assert.equal(run.response.status, 200);
    assert.ok(run.payload.data.preparedCount >= 0);
    assert.equal(run.payload.data.crmMutations, 0);
    assert.equal(run.payload.data.externalActions, 0);
    assert.equal(run.payload.data.spend, 0);
    assert.equal(run.payload.data.realizedRevenue, 0);
});

test("Xodus mission agent uses reviewed sources and preserves inception-stage boundaries", async () => {
    const status = await getJson("/api/xodus-agent/status");
    assert.equal(status.response.status, 200);
    assert.equal(status.payload.data.agent.stage, "inception");
    assert.equal(status.payload.data.agent.mode, "supervised");
    assert.equal(status.payload.data.knowledge.sourceCount, 2);
    assert.deepEqual(status.payload.data.knowledge.focusLanes.map(lane => lane.id), [
        "partners", "investors", "land", "recovery-housing", "treatment-centers"
    ]);
    assert.equal(status.payload.data.preview.programConcept.status, "concept-not-committed");
    assert.equal(status.payload.data.boundaries.externalOutreach, false);
    assert.equal(status.payload.data.boundaries.investmentOffering, false);
    assert.equal(status.payload.data.boundaries.crmMutations, false);
    assert.equal(status.payload.data.boundaries.spend, 0);

    const invalid = await getJson("/api/xodus-agent/brief?focus=not-a-lane");
    assert.equal(invalid.response.status, 400);
    const denied = await sendJson("/api/xodus-agent/runs", "POST", { confirmation: "RUN XODUS REVIEW", focus: "partners" });
    assert.equal(denied.response.status, 401);
    const run = await sendJson("/api/xodus-agent/runs", "POST", { confirmation: "RUN XODUS REVIEW", focus: "partners" }, authorization("operator"));
    assert.equal(run.response.status, 200);
    assert.equal(run.payload.data.outcome, "research-conducted");
    assert.equal(run.payload.data.preparedCount, 1);
    assert.equal(run.payload.data.verifiedCandidateCount, 0);
    assert.equal(run.payload.data.externalActions, 0);
    assert.equal(run.payload.data.crmMutations, 0);
    assert.equal(run.payload.data.commitments, 0);
    assert.equal(run.payload.data.fundraisingSolicitations, 0);
    assert.equal(run.payload.data.spend, 0);

    const hub = await getJson("/api/agent-hub");
    assert.equal(hub.payload.data.xodusAgent.agent.id, "xodus-mission-partnership-agent");
    assert.equal(hub.payload.data.xodusAgent.metrics.verifiedCandidates, 0);
    assert.doesNotMatch(JSON.stringify(hub.payload), /owner-token-jarvis/);
});

test("Venture Revenue Agent ranks evidence-backed low-capital candidates without financial access", async () => {
    const status = await getJson("/api/venture-agent/status");
    assert.equal(status.response.status, 200);
    assert.equal(status.payload.data.agent.version, "2.0");
    assert.equal(status.payload.data.agent.mode, "supervised");
    assert.equal(status.payload.data.candidates.length, 3);
    assert.ok(status.payload.data.candidates.every(item => item.evidence.length >= 2));
    assert.ok(status.payload.data.candidates.every(item => item.score >= 0 && item.score <= 100));
    assert.equal(status.payload.data.boundaries.bankAccess, false);
    assert.equal(status.payload.data.boundaries.walletAccess, false);
    assert.equal(status.payload.data.boundaries.financialAccountAccess, false);
    assert.equal(status.payload.data.boundaries.maximumBudget, 0);
    const denied = await sendJson("/api/venture-agent/runs", "POST", { confirmation: "RUN VENTURE DISCOVERY" });
    assert.equal(denied.response.status, 401);
    const run = await sendJson("/api/venture-agent/runs", "POST", { confirmation: "RUN VENTURE DISCOVERY" }, authorization("operator"));
    assert.equal(run.response.status, 200);
    assert.equal(run.payload.data.preparedCount, 3);
    assert.equal(run.payload.data.externalActions, 0);
    assert.equal(run.payload.data.spend, 0);
});

test("Chief of Staff coordinates live agent status without overriding specialists or owner", async () => {
    const { response, payload } = await getJson("/api/chief-of-staff/operations");
    assert.equal(response.status, 200);
    assert.equal(payload.data.agent.version, "3.0");
    assert.equal(payload.data.agent.mode, "operational-oversight");
    assert.equal(payload.data.metrics.agentsOverseen, 7);
    assert.equal(payload.data.roster.find(item => item.id === "venture-revenue-agent").status, "operational-supervised");
    assert.equal(payload.data.roster.find(item => item.id === "xodus-mission-partnership-agent").status, "research-phase");
    assert.equal(payload.data.boundaries.specialistExecutionOwnedBySpecialists, true);
    assert.equal(payload.data.boundaries.ownerAuthority, "absolute");
    assert.equal(payload.data.boundaries.externalActions, false);
    assert.equal(payload.data.boundaries.financialAccountAccess, false);
    assert.equal(payload.data.boundaries.maximumBudget, 0);
    const denied = await sendJson("/api/chief-of-staff/operations/runs", "POST", { confirmation: "RUN STAFF REVIEW" });
    assert.equal(denied.response.status, 401);
    const run = await sendJson("/api/chief-of-staff/operations/runs", "POST", { confirmation: "RUN STAFF REVIEW" }, authorization("operator"));
    assert.equal(run.response.status, 200);
    assert.equal(run.payload.data.agentsReviewed, 7);
    assert.equal(run.payload.data.executedCount, 0);
    assert.equal(run.payload.data.externalActions, 0);
    assert.equal(run.payload.data.spend, 0);
});

test("venture owner decisions create no-spend validation experiments", async () => {
    const denied = await sendJson("/api/venture-agent/candidates/venture-crm-intelligence-sprint/decision", "POST", { decision: "accepted", confirmation: "ACCEPT OPPORTUNITY" }, authorization("operator"));
    assert.equal(denied.response.status, 403);
    const accepted = await sendJson("/api/venture-agent/candidates/venture-crm-intelligence-sprint/decision", "POST", { decision: "accepted", reason: "Strongest fit and fastest path to validation", confirmation: "ACCEPT OPPORTUNITY" }, authorization("owner"));
    assert.equal(accepted.response.status, 200);
    assert.equal(accepted.payload.data.decision.decision, "accepted");
    assert.equal(accepted.payload.data.experiment.budget, 0);
    assert.equal(accepted.payload.data.experiment.externalActions, 0);
    const deferred = await sendJson("/api/venture-agent/candidates/venture-ai-readiness-sprint/decision", "POST", { decision: "deferred", confirmation: "DEFER OPPORTUNITY" }, authorization("owner"));
    assert.equal(deferred.response.status, 200);
    assert.equal(deferred.payload.data.experiment, null);
});

test("Venture Offer Studio prepares bounded sales assets only for accepted candidates", async () => {
    const blocked = await sendJson("/api/venture-agent/candidates/venture-ai-readiness-sprint/assets", "POST", { confirmation: "PREPARE SALES ASSETS" }, authorization("operator"));
    assert.equal(blocked.response.status, 409);
    const prepared = await sendJson("/api/venture-agent/candidates/venture-crm-intelligence-sprint/assets", "POST", { confirmation: "PREPARE SALES ASSETS" }, authorization("operator"));
    assert.equal(prepared.response.status, 200);
    assert.equal(prepared.payload.data.status, "draft-owner-review");
    assert.equal(prepared.payload.data.landingPage.publishStatus, "not-published");
    assert.equal(prepared.payload.data.published, false);
    assert.equal(prepared.payload.data.externalActions, 0);
    assert.equal(prepared.payload.data.spend, 0);
});

test("supervised outreach requires per-message owner approval and never sends", async () => {
    const prepared = await sendJson("/api/venture-agent/candidates/venture-crm-intelligence-sprint/messages", "POST", { organizationName: "Example Local Business", contactName: "Alex", confirmation: "PREPARE OUTREACH DRAFT" }, authorization("operator"));
    assert.equal(prepared.response.status, 200);
    assert.equal(prepared.payload.data.status, "draft-owner-review");
    assert.equal(prepared.payload.data.sent, false);
    assert.equal(prepared.payload.data.externalActions, 0);
    const denied = await sendJson(`/api/venture-agent/messages/${prepared.payload.data.id}/approve`, "POST", { confirmation: "APPROVE MESSAGE" }, authorization("operator"));
    assert.equal(denied.response.status, 403);
    const approved = await sendJson(`/api/venture-agent/messages/${prepared.payload.data.id}/approve`, "POST", { confirmation: "APPROVE MESSAGE" }, authorization("owner"));
    assert.equal(approved.response.status, 200);
    assert.equal(approved.payload.data.status, "approved-not-sent");
    assert.equal(approved.payload.data.sent, false);
    assert.equal(approved.payload.data.externalActions, 0);
});

test("revenue attribution uses owner evidence and never reads financial accounts", async () => {
    const invalid = await sendJson("/api/venture-agent/candidates/venture-crm-intelligence-sprint/outcomes", "POST", { revenue: 1200, cost: 100, timeHours: 4, confirmation: "RECORD VENTURE OUTCOME" }, authorization("owner"));
    assert.equal(invalid.response.status, 400);
    const recorded = await sendJson("/api/venture-agent/candidates/venture-crm-intelligence-sprint/outcomes", "POST", { revenue: 1200, cost: 100, timeHours: 4, evidence: "Owner-entered test invoice reference", lesson: "The fixed scope was understood", confirmation: "RECORD VENTURE OUTCOME" }, authorization("owner"));
    assert.equal(recorded.response.status, 201);
    assert.equal(recorded.payload.data.net, 1100);
    assert.equal(recorded.payload.data.source, "owner-manual-entry");
    assert.equal(recorded.payload.data.externallyVerified, false);
    assert.equal(recorded.payload.data.bankImport, false);
    const status = await getJson("/api/venture-agent/status");
    assert.equal(status.payload.data.metrics.revenue, 1200);
    assert.equal(status.payload.data.metrics.cost, 100);
    assert.equal(status.payload.data.metrics.net, 1100);
    assert.equal(status.payload.data.metrics.timeHours, 4);
    assert.equal(status.payload.data.boundaries.financialAccountAccess, false);
});

test("renewal briefs require reviewed customer evidence and protect APCO", async () => {
    const empty = await getJson("/api/renewals/briefs");
    assert.equal(empty.response.status, 200);
    assert.equal(empty.payload.data.eligibleCustomers, 0);
    const apco = await sendJson("/api/renewals/customers/import", "POST", { confirmation: "IMPORT REVIEWED CUSTOMER", customer: { id: "well-noticed-apco-001", name: "APCO Windows", status: "customer" } }, authorization("owner"));
    assert.equal(apco.response.status, 409);
    const imported = await sendJson("/api/renewals/customers/import", "POST", { confirmation: "IMPORT REVIEWED CUSTOMER", customer: { name: "Reviewed Customer Fixture", status: "customer", relationshipStatus: "active", notes: "Owner-reviewed test fixture" } }, authorization("owner"));
    assert.equal(imported.response.status, 201);
    assert.equal(imported.payload.data.brief.externalActions, false);
    assert.equal(imported.payload.data.brief.realizedRevenue, 0);
    assert.ok(imported.payload.data.brief.risks.includes("No renewal date is recorded."));
});

test("governed autonomy defaults to shadow and suspends repeated violations", async () => {
    const status = await getJson("/api/autonomy/status");
    assert.equal(status.response.status, 200);
    assert.equal(status.payload.data.state.mode, "shadow");
    assert.equal(status.payload.data.policy.maximumBudget, 0);
    assert.equal(status.payload.data.policy.externalActions, false);
    const allowed = await sendJson("/api/autonomy/run", "POST", { action:"score_opportunity",source:"canonical-brain",confidence:90,budget:0,externalAction:false }, authorization("operator"));
    assert.equal(allowed.response.status, 200);
    assert.equal(allowed.payload.data.executed, false);
    assert.equal(allowed.payload.data.prepared, true);
    const bounded = await sendJson("/api/autonomy/deploy", "POST", { mode:"bounded-autonomous",confirmation:"DEPLOY" }, authorization("owner"));
    assert.equal(bounded.response.status, 409);
    for (let index = 0; index < 3; index += 1) {
        await sendJson("/api/autonomy/run", "POST", { action:"send_email",source:"internet",confidence:10,budget:1,externalAction:true }, authorization("operator"));
    }
    const suspended = await getJson("/api/autonomy/status");
    assert.equal(suspended.payload.data.state.suspended, true);
});

test("cross-origin API requests are denied", async () => {
    const { response, payload } = await getJson("/api/auth/status", {
        Origin: "https://untrusted.example"
    });
    assert.equal(response.status, 403);
    assert.equal(payload.error.code, "ORIGIN_NOT_ALLOWED");
});

test("remote mode protects read APIs with authentication", async () => {
    process.env.JARVIS_REMOTE_ACCESS = "true";
    try {
        const denied = await getJson("/api/releases");
        assert.equal(denied.response.status, 401);
        assert.equal(denied.payload.error.code, "AUTHENTICATION_REQUIRED");
        const allowed = await getJson("/api/releases", authorization("viewer"));
        assert.equal(allowed.response.status, 200);
        assert.equal(allowed.payload.data.currentVersion, "JARVIS-035");
    } finally {
        delete process.env.JARVIS_REMOTE_ACCESS;
    }
});

test("conversation status exposes a safe local provider fallback", async () => {
    const { response, payload } = await getJson(
        "/api/jarvis/conversation/status"
    );
    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    assert.ok(["local", "openai"].includes(payload.data.provider));
    assert.equal(payload.data.history, "browser-local");
    assert.equal(payload.data.contextContract, "1.0");
    assert.equal(payload.data.governanceRequiredForActions, true);
});

test("Ask JARVIS accepts bounded multi-turn history", async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
        const { response, payload } = await sendJson(
            "/api/jarvis/conversation",
            "POST",
            {
                messages: [
                    { role: "user", content: "Tell me about our ventures" },
                    { role: "assistant", content: "Well Noticed is a priority." },
                    { role: "user", content: "Tell me more about that" }
                ]
            }
        );
        assert.equal(response.status, 200);
        assert.equal(payload.ok, true);
        assert.equal(payload.data.provider, "local");
        assert.match(payload.data.response, /earlier question/i);
        assert.equal(payload.meta.externalActions, false);
        assert.equal(payload.meta.mutations, false);
    } finally {
        if (apiKey) process.env.OPENAI_API_KEY = apiKey;
    }
});

test("Ask JARVIS rejects empty conversation requests", async () => {
    const { response, payload } = await sendJson(
        "/api/jarvis/conversation",
        "POST",
        { messages: [] }
    );
    assert.equal(response.status, 400);
    assert.equal(payload.ok, false);
    assert.match(payload.error, /user message/i);
});

test("unified brain exposes canonical context with provenance", async () => {
    const { response, payload } = await getJson(
        "/api/brain/context?include=ventures,organizations,contacts,tasks"
    );
    assert.equal(response.status, 200);
    assert.equal(payload.data.contractVersion, "1.0");
    assert.ok(payload.data.summary.totalRecords > 0);
    const venture = payload.data.collections.ventures[0];
    assert.equal(venture.type, "ventures");
    assert.equal(venture.provenance.source, "local-json");
    assert.ok(["fresh", "aging", "stale"].includes(venture.provenance.freshness));
    assert.equal(venture.policy.writeAuthority, "source-repository");
    assert.equal(payload.data.synchronization.strategy, "read-through canonical adapters");
});

test("unified brain schema and activity stream use stable contracts", async () => {
    const schema = await getJson("/api/brain/schema");
    assert.equal(schema.response.status, 200);
    assert.ok(schema.payload.data.entityTypes.includes("agentActivity"));
    assert.match(schema.payload.data.conflictRule, /never merged automatically/i);

    const conversation = await sendJson(
        "/api/jarvis/conversation",
        "POST",
        { messages: [{ role: "user", content: "What release are we on?" }] }
    );
    assert.equal(conversation.response.status, 200);
    const activity = await getJson("/api/brain/activity?limit=10");
    assert.equal(activity.response.status, 200);
    assert.ok(activity.payload.data.events.some(event => event.phase === "observed"));
    assert.ok(activity.payload.data.events.some(event => event.phase === "recommended"));
    assert.equal(JSON.stringify(activity.payload).includes("What release are we on?"), false);
});

test("Release Center reads canonical release metadata", async () => {
    const { response, payload } = await getJson("/api/releases");
    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.data.currentVersion, "JARVIS-035");
    assert.equal(payload.data.validation.tests, 48);
    assert.ok(payload.data.completedReleases.length >= 6);
    assert.equal(payload.data.nextRelease.id, "JARVIS-036");
    assert.ok(payload.data.plannedReleases.some(release => release.id === "JARVIS-028" && release.status === "deferred"));
});

test("local CRM workspace works without Google credentials", async () => {
    const status = await getJson("/api/crm/workspace/status");
    assert.equal(status.response.status, 200);
    assert.equal(status.payload.mode, "local");
    assert.equal(status.payload.connected, false);

    const prospects = await getJson("/api/crm/workspace/prospects?limit=1");
    assert.equal(prospects.response.status, 200);
    assert.equal(prospects.payload.entity, "prospects");
    assert.ok(Array.isArray(prospects.payload.data));
    assert.ok(prospects.payload.count <= 1);
});

test("multi-venture CRM exposes four policy-bound portfolio lanes", async () => {
    const { response, payload } = await getJson("/api/crm/portfolio");
    assert.equal(response.status, 200);
    assert.equal(payload.data.contractVersion, "1.0");
    assert.deepEqual(payload.data.lanes.map(lane => lane.venture.id), [
        "well-noticed", "xodus", "real-estate", "jarvis-opportunities"
    ]);
    assert.equal(payload.data.boundaries.automaticMerge, false);
    assert.equal(payload.data.boundaries.externalActions, false);
    assert.equal(payload.data.lanes.find(lane => lane.venture.id === "xodus").policy.privacy, "restricted");

    const lane = await getJson("/api/crm/portfolio/well-noticed");
    assert.equal(lane.response.status, 200);
    assert.ok(lane.payload.data.metrics.relationships >= 2);
    assert.ok(Array.isArray(lane.payload.data.nextActions));
});

test("opportunity engine scores evidence and reports zero-action revenue metrics", async () => {
    const inbox = await getJson("/api/opportunities/inbox");
    assert.equal(inbox.response.status, 200);
    assert.ok(inbox.payload.data.opportunities.length >= 3);
    assert.ok(inbox.payload.data.opportunities.every(item => item.score >= 0 && item.score <= 100));
    assert.ok(inbox.payload.data.opportunities.every(item => item.researchPacket.externalActions === false));
    const review = await getJson("/api/opportunities/weekly-review");
    assert.equal(review.response.status, 200);
    assert.equal(review.payload.data.metrics.externalActions, 0);
    assert.equal(review.payload.data.metrics.spend, 0);
    assert.ok(review.payload.data.metrics.projectedValue > 0);
});

test("APCO live CRM snapshot is available for the governed demo", async () => {
    const prospects = await getJson(
        "/api/crm/workspace/prospects?venture=well-noticed&limit=50"
    );
    assert.equal(prospects.response.status, 200);
    assert.ok(prospects.payload.data.length > 0, "Should return prospects from CRM");
    assert.equal(prospects.payload.mode, "live");
});

test("local authentication reports configuration and identity safely", async () => {
    const status = await getJson("/api/auth/status");
    assert.equal(status.response.status, 200);
    assert.equal(status.payload.data.authentication.configured, true);
    assert.equal(status.payload.data.authentication.valid, true);
    assert.deepEqual(
        status.payload.data.authentication.roles.sort(),
        ["operator", "owner", "viewer"]
    );
    assert.equal(JSON.stringify(status.payload).includes("-token-"), false);

    const me = await getJson("/api/auth/me", authorization("viewer"));
    assert.equal(me.response.status, 200);
    assert.equal(me.payload.data.identity.name, "test-viewer");
    assert.equal(me.payload.data.identity.role, "viewer");
});

test("bootstrap credentials create revocable protected sessions", async () => {
    const issued = await sendJson(
        "/api/auth/session",
        "POST",
        { deviceName: "Automated security test" },
        authorization("operator")
    );
    assert.equal(issued.response.status, 201);
    assert.equal(issued.payload.data.token, undefined);
    const cookie = issued.response.headers.get("set-cookie").split(";")[0];
    const me = await getJson("/api/auth/me", { Cookie: cookie });
    assert.equal(me.response.status, 200);
    assert.equal(me.payload.data.identity.role, "operator");
    assert.equal(me.payload.data.identity.credential, "session");
    const sessionId = me.payload.data.identity.sessionId;

    const sessions = await getJson("/api/auth/sessions", authorization("owner"));
    assert.equal(sessions.response.status, 200);
    assert.ok(sessions.payload.data.sessions.some(item => item.id === sessionId));
    assert.equal(JSON.stringify(sessions.payload).includes("hash"), false);

    const revoked = await sendJson(
        `/api/auth/sessions/${sessionId}`,
        "DELETE",
        {},
        authorization("owner")
    );
    assert.equal(revoked.response.status, 200);
    const denied = await getJson("/api/auth/me", { Cookie: cookie });
    assert.equal(denied.response.status, 401);
});

test("local token generator produces a strong URL-safe token", () => {
    const result = spawnSync(
        process.execPath,
        [path.resolve(__dirname, "../scripts/generateLocalToken.js")],
        { encoding: "utf8" }
    );
    const generatedToken = result.stdout.trim();
    assert.equal(result.status, 0);
    assert.match(generatedToken, /^[A-Za-z0-9_-]{43}$/);
});

test("generic CRM route rejects unknown entities", async () => {
    const { response, payload } = await getJson("/api/crm/not-an-entity");
    assert.equal(response.status, 400);
    assert.match(payload.error, /Invalid CRM entity/);
});

test("direct CRM writes require authentication and governance", async () => {
    const unauthenticated = await sendJson(
        "/api/crm/organizations",
        "POST",
        { ventureId: "well-noticed", name: "Do not persist" }
    );
    assert.equal(unauthenticated.response.status, 401);
    assert.equal(
        unauthenticated.payload.error.code,
        "AUTHENTICATION_REQUIRED"
    );

    const governed = await sendJson(
        "/api/crm/organizations",
        "POST",
        { ventureId: "well-noticed", name: "Do not persist" },
        authorization("owner")
    );
    assert.equal(governed.response.status, 403);
    assert.equal(governed.payload.error.code, "GOVERNANCE_REQUIRED");

    const patchGoverned = await sendJson(
        "/api/crm/organizations/does-not-exist",
        "PATCH",
        { status: "qualified" },
        authorization("owner")
    );
    assert.equal(patchGoverned.response.status, 403);
    assert.equal(patchGoverned.payload.error.code, "GOVERNANCE_REQUIRED");
});

test("live CRM fails safely when Google Sheets is not configured", async () => {
    const { response, payload } = await getJson("/api/crm/live/status");

    if (process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
        assert.ok([200, 503].includes(response.status));
    } else {
        assert.equal(response.status, 503);
        assert.equal(payload.mode, "live");
        assert.match(payload.error, /not configured/i);
    }
});

test("prospect intelligence scores and caches a prospect", () => {
    const prospect = {
        "Company Name": "JARVIS 008 Test Company",
        "Main Contact": "Test Contact",
        "EMAIL": "test@example.com",
        "Phone": "614-555-0100",
        "Website": "example.com"
    };

    invalidate(prospect);
    const fresh = buildProfile(prospect);
    const cached = buildProfile(prospect);
    invalidate(prospect);

    assert.equal(fresh.cached, false);
    assert.equal(cached.cached, true);
    assert.ok(fresh.opportunityScore >= 75);
});

test("command envelopes use the backend CommonJS runtime", () => {
    const envelope = createCommandEnvelope({ command: "review crm" });
    assert.equal(envelope.command, "review crm");
    assert.equal(envelope.status, "received");
    assert.match(envelope.id, /^[0-9a-f-]{36}$/i);
});

test("workflow discovery qualifies candidates without side effects", async () => {
    const { response, payload } = await sendJson(
        "/api/crm/workflow/discover",
        "POST",
        {
            ventureId: "well-noticed",
            candidates: [
                {
                    name: "JARVIS 009 Candidate",
                    industry: "Luxury Home Remodeling",
                    city: "Columbus",
                    state: "OH",
                    website: "https://example.com",
                    homeownerRelevance: true,
                    highValueService: true,
                    localOrRegional: true,
                    premiumMarketingPotential: true
                }
            ]
        }
    );

    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.data.workflow, "prospect_discovery");
    assert.equal(payload.meta.crmMutations, false);
    assert.equal(payload.meta.externalActions, false);
    assert.equal(payload.data.result.qualification.count, 1);
    assert.equal(payload.data.result.venture.id, "well-noticed");
    assert.equal(payload.data.result.venture.data, undefined);
    assert.equal(payload.data.result.discovery.venture.data, undefined);
    assert.match(response.headers.get("x-request-id"), /^[0-9a-f-]{36}$/i);
    assert.equal(payload.meta.requestId, response.headers.get("x-request-id"));
});

test("workflow plan and simulation expose the next safe action", async () => {
    const request = {
        ventureId: "well-noticed",
        organizationId: "well-noticed-test-001"
    };
    const plan = await sendJson(
        "/api/crm/workflow/plan",
        "POST",
        request
    );

    assert.equal(plan.response.status, 200);
    assert.equal(plan.payload.data.result.decision.action, "find_email");

    const simulation = await sendJson(
        "/api/crm/workflow/simulate",
        "POST",
        request
    );

    assert.equal(simulation.response.status, 200);
    assert.equal(simulation.payload.data.workflow, "execution_simulation");
    assert.equal(simulation.payload.data.result.execution.executed, false);
    assert.equal(simulation.payload.data.result.execution.crmMutations, false);
    assert.equal(simulation.payload.data.result.execution.externalActions, false);
    assert.ok(simulation.payload.data.result.simulation.wouldDo.length > 0);
});

test("workflow errors use a stable documented contract", async () => {
    const invalidMode = await sendJson(
        "/api/crm/workflow/simulate",
        "POST",
        {
            ventureId: "well-noticed",
            organizationId: "well-noticed-test-001",
            mode: "execute"
        }
    );

    assert.equal(invalidMode.response.status, 400);
    assert.equal(invalidMode.payload.ok, false);
    assert.equal(invalidMode.payload.error.code, "INVALID_REQUEST");
    assert.ok(invalidMode.payload.meta.requestId);

    const missingVenture = await sendJson(
        "/api/crm/workflow/plan",
        "POST",
        { ventureId: "missing-venture" }
    );

    assert.equal(missingVenture.response.status, 404);
    assert.equal(missingVenture.payload.error.code, "RESOURCE_NOT_FOUND");

    const malformedCandidates = await sendJson(
        "/api/crm/workflow/discover",
        "POST",
        {
            ventureId: "well-noticed",
            candidates: [null]
        }
    );

    assert.equal(malformedCandidates.response.status, 400);
    assert.equal(malformedCandidates.payload.error.code, "INVALID_REQUEST");
});

test("governed execution requires explicit approval and consumes it once", async () => {
    const organizationId = fixtureOrganizationId;

    const viewerDenied = await sendJson(
        "/api/crm/workflow/approval/request",
        "POST",
        { ventureId: "well-noticed", organizationId },
        authorization("viewer")
    );
    assert.equal(viewerDenied.response.status, 403);
    assert.equal(viewerDenied.payload.error.code, "INSUFFICIENT_ROLE");

    const requested = await sendJson(
        "/api/crm/workflow/approval/request",
        "POST",
        {
            ventureId: "well-noticed",
            organizationId,
            requestedBy: "spoofed-requester"
        },
        authorization("operator")
    );
    assert.equal(requested.response.status, 201);
    assert.equal(requested.payload.data.approval.status, "pending");
    assert.equal(requested.payload.data.approval.action, "website_outreach");
    assert.equal(requested.payload.data.approval.requestedBy, "test-operator");
    const approvalId = requested.payload.data.approval.id;

    const operatorCannotApprove = await sendJson(
        `/api/crm/workflow/approval/${approvalId}/approve`,
        "POST",
        { confirmation: "APPROVE" },
        authorization("operator")
    );
    assert.equal(operatorCannotApprove.response.status, 403);
    assert.equal(operatorCannotApprove.payload.error.code, "INSUFFICIENT_ROLE");

    const premature = await sendJson(
        "/api/crm/workflow/execute",
        "POST",
        { approvalId, ventureId: "well-noticed", organizationId },
        authorization("operator")
    );
    assert.equal(premature.response.status, 409);
    assert.equal(premature.payload.error.code, "APPROVAL_NOT_APPROVED");

    const weakConfirmation = await sendJson(
        `/api/crm/workflow/approval/${approvalId}/approve`,
        "POST",
        { confirmation: "yes", approvedBy: "spoofed-approver" },
        authorization("owner")
    );
    assert.equal(weakConfirmation.response.status, 400);
    assert.equal(
        weakConfirmation.payload.error.code,
        "APPROVAL_CONFIRMATION_REQUIRED"
    );

    const approved = await sendJson(
        `/api/crm/workflow/approval/${approvalId}/approve`,
        "POST",
        { confirmation: "APPROVE", approvedBy: "spoofed-approver" },
        authorization("owner")
    );
    assert.equal(approved.response.status, 200);
    assert.equal(approved.payload.data.approval.status, "approved");
    assert.equal(approved.payload.data.approval.approvedBy, "test-owner");

    const executed = await sendJson(
        "/api/crm/workflow/execute",
        "POST",
        { approvalId, ventureId: "well-noticed", organizationId },
        authorization("operator")
    );
    assert.equal(executed.response.status, 200);
    assert.equal(executed.payload.data.result.execution.executed, true);
    assert.equal(executed.payload.meta.crmMutations, true);
    assert.equal(executed.payload.meta.externalActions, false);
    assert.equal(executed.payload.data.result.task.approvalId, approvalId);

    const replay = await sendJson(
        "/api/crm/workflow/execute",
        "POST",
        { approvalId, ventureId: "well-noticed", organizationId },
        authorization("operator")
    );
    assert.equal(replay.response.status, 409);
    assert.equal(replay.payload.error.code, "APPROVAL_NOT_APPROVED");

    const approvalStatus = await getJson(
        `/api/crm/workflow/approval/${approvalId}`,
        authorization("operator")
    );
    assert.equal(approvalStatus.payload.data.approval.status, "consumed");

    const auditDenied = await getJson(
        "/api/crm/workflow/audit?limit=20",
        authorization("operator")
    );
    assert.equal(auditDenied.response.status, 403);

    const audit = await getJson(
        "/api/crm/workflow/audit?limit=20",
        authorization("owner")
    );
    const events = audit.payload.data.events.map(event => event.event);
    assert.ok(events.includes("approval_requested"));
    assert.ok(events.includes("approval_granted"));
    assert.ok(events.includes("approval_consumed"));
    assert.ok(events.includes("governed_execution_completed"));
});

test("CRM persistence uses complete atomic JSON replacements", () => {
    const organizations = JSON.parse(
        fs.readFileSync(path.join(testCrmData, "organizations.json"), "utf8")
    );
    assert.ok(organizations.some(item => item.id === fixtureOrganizationId));
    assert.equal(
        fs.readdirSync(testCrmData).some(name => name.endsWith(".tmp")),
        false
    );
});

test("encrypted backups verify integrity and require explicit restore", () => {
    const sourceRoot = path.join(testRoot, "backup-source");
    const sourceData = path.join(sourceRoot, "backend/data");
    const outputPath = path.join(testRoot, "jarvis.backup.json");
    const restoreRoot = path.join(testRoot, "restore-target");
    fs.mkdirSync(sourceData, { recursive: true });
    fs.writeFileSync(
        path.join(sourceData, "sample.json"),
        JSON.stringify({ protected: "recovery-test" })
    );
    const passphrase = "jarvis-test-passphrase-very-safe";
    const created = encryptedBackup.create({
        repoRoot: sourceRoot,
        roots: [sourceData],
        outputPath,
        passphrase
    });
    assert.equal(created.files, 1);
    assert.equal(
        fs.readFileSync(outputPath, "utf8").includes("recovery-test"),
        false
    );
    assert.equal(
        encryptedBackup.verify({ backupPath: outputPath, passphrase }).files,
        1
    );
    assert.throws(() => encryptedBackup.verify({
        backupPath: outputPath,
        passphrase: "wrong-passphrase-but-long"
    }));
    assert.throws(() => encryptedBackup.restore({
        backupPath: outputPath,
        targetRoot: restoreRoot,
        passphrase,
        confirm: "yes"
    }), /RESTORE/);
    encryptedBackup.restore({
        backupPath: outputPath,
        targetRoot: restoreRoot,
        passphrase,
        confirm: "RESTORE"
    });
    assert.deepEqual(
        JSON.parse(fs.readFileSync(
            path.join(restoreRoot, "backend/data/sample.json"),
            "utf8"
        )),
        { protected: "recovery-test" }
    );
});

test("secret vault encrypts allowlisted application credentials", () => {
    const vaultPath = path.join(testRoot, "secrets.enc.json");
    const passphrase = "jarvis-vault-passphrase-very-safe";
    const saved = secretVault.save({
        OPENAI_API_KEY: "test-secret-value-not-real",
        UNAPPROVED_SECRET: "must-not-be-stored"
    }, { path: vaultPath, passphrase });
    assert.deepEqual(saved.keys, ["OPENAI_API_KEY"]);
    const encrypted = fs.readFileSync(vaultPath, "utf8");
    assert.equal(encrypted.includes("test-secret-value-not-real"), false);
    assert.equal(encrypted.includes("must-not-be-stored"), false);
    assert.deepEqual(
        secretVault.load({ path: vaultPath, passphrase }),
        { OPENAI_API_KEY: "test-secret-value-not-real" }
    );
    assert.throws(() => secretVault.load({
        path: vaultPath,
        passphrase: "wrong-vault-passphrase-long"
    }));
});
