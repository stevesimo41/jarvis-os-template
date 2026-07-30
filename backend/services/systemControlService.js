const path = require("path");
const { readJson, writeJsonAtomic } = require("../storage/atomicJsonStore");
function statePath() { return process.env.JARVIS_SYSTEM_CONTROL_PATH || path.join(__dirname, "../data/governance/system-control.json"); }
function status() { return readJson(statePath(), { stopped: false, updatedAt: null, updatedBy: null, reason: null }); }
function stop(actor, reason) { return writeJsonAtomic(statePath(), { stopped: true, updatedAt: new Date().toISOString(), updatedBy: actor, reason: String(reason || "Operator emergency stop").slice(0, 200) }); }
function resume(actor) { return writeJsonAtomic(statePath(), { stopped: false, updatedAt: new Date().toISOString(), updatedBy: actor, reason: "Owner resumed operations" }); }
module.exports = { status, stop, resume };
