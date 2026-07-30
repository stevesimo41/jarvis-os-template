const fs = require("fs");
const path = require("path");
const activity = require("../brain/activityService");

const STATE_PATH = path.join(__dirname, "../data/run-tracker.json");

function load() {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, "utf8")); }
  catch { return { runs: [], agentHistory: {}, alerts: [] }; }
}

function save(data) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(data, null, 2));
}

function recordRun(agentId, agentName, metrics) {
  const data = load();
  const run = {
    agentId,
    agentName,
    timestamp: new Date().toISOString(),
    discovered: metrics.discovered || 0,
    qualified: metrics.qualified || 0,
    enriched: metrics.enriched || 0,
    submitted: metrics.submitted || 0,
    avgFitScore: metrics.avgFitScore || 0,
    topFitScore: metrics.topFitScore || 0,
    duration: metrics.duration || 0
  };
  data.runs.push(run);
  data.runs = data.runs.slice(-200);

  if (!data.agentHistory[agentId]) data.agentHistory[agentId] = [];
  data.agentHistory[agentId].push(run);
  data.agentHistory[agentId] = data.agentHistory[agentId].slice(-20);

  const history = data.agentHistory[agentId];
  if (history.length >= 3) {
    const last3 = history.slice(-3);
    const allEmpty = last3.every(r => r.qualified === 0 && r.discovered === 0);
    if (allEmpty) {
      const alert = {
        type: "regression",
        agentId,
        agentName,
        message: `${agentName} returned 0 qualified prospects for 3 consecutive runs`,
        last3Timestamps: last3.map(r => r.timestamp),
        createdAt: new Date().toISOString()
      };
      data.alerts.push(alert);
      activity.append("observed", `Regression: ${agentName} returned 0 results for 3 runs`, {
        source: "run-tracker", agentId, severity: "warning"
      });
    }

    const avgDropped = last3.length >= 3 && last3[0].discovered > 0 &&
      last3[2].discovered < last3[0].discovered * 0.3;
    if (avgDropped) {
      const alert = {
        type: "drop",
        agentId,
        agentName,
        message: `${agentName} discovery dropped 70%+ over 3 runs (${last3[0].discovered} → ${last3[2].discovered})`,
        last3Values: last3.map(r => r.discovered),
        createdAt: new Date().toISOString()
      };
      data.alerts.push(alert);
      activity.append("observed", `Drop: ${agentName} discovery dropped 70%+`, {
        source: "run-tracker", agentId, severity: "warning"
      });
    }
  }

  data.alerts = data.alerts.slice(-50);
  save(data);
  return run;
}

function getRecentRuns(agentId, limit) {
  const data = load();
  let runs = data.runs;
  if (agentId) runs = runs.filter(r => r.agentId === agentId);
  return runs.slice(-(limit || 20)).reverse();
}

function getAlerts(clear) {
  const data = load();
  const alerts = data.alerts.slice().reverse();
  if (clear) {
    data.alerts = [];
    save(data);
  }
  return alerts;
}

function getAgentHealth() {
  const data = load();
  const health = {};
  for (const [agentId, history] of Object.entries(data.agentHistory)) {
    const recent = history.slice(-5);
    const avgQualified = recent.length > 0
      ? recent.reduce((s, r) => s + r.qualified, 0) / recent.length
      : 0;
    const lastRun = recent[recent.length - 1];
    health[agentId] = {
      totalRuns: history.length,
      recentRuns: recent.length,
      avgQualified,
      lastRunAt: lastRun?.timestamp || null,
      lastQualified: lastRun?.qualified || 0,
      healthy: recent.length >= 3 ? recent.some(r => r.qualified > 0) : true
    };
  }
  return health;
}

module.exports = { recordRun, getRecentRuns, getAlerts, getAgentHealth };
