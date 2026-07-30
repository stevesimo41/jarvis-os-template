const activity = require("../brain/activityService");

async function runSweep() {
  const wellNoticedCrm = require("../agents/wellNoticedCrmAgent");
  const repo = wellNoticedCrm.getRepository ? wellNoticedCrm.getRepository() : null;
  if (!repo) {
    console.warn("[CrmSweep] No repository available");
    return { processed: 0, enriched: 0, errors: 0 };
  }

  let prospects = [];
  try {
    prospects = await repo.getEntity("prospects");
  } catch (e) {
    console.warn("[CrmSweep] Failed to load prospects:", e.message);
    return { processed: 0, enriched: 0, errors: 0 };
  }

  const stale = prospects.filter(p => {
    const email = p["Email"] || p["email"] || p["EMAIL"] || "";
    const phone = p["Phone"] || p["phone"] || "";
    const website = p["Website"] || p["website"] || p["WEBSITE"] || "";
    const name = p["Company Name"] || p["Company"] || p["Organization"] || p["name"] || "";
    return name && !email && !phone && !website;
  });

  const missingEmail = prospects.filter(p => {
    const email = p["Email"] || p["email"] || p["EMAIL"] || "";
    const name = p["Company Name"] || p["Company"] || p["Organization"] || p["name"] || "";
    return name && !email;
  });

  const webResearch = require("./webResearch");
  let enriched = 0;
  let errors = 0;

  for (const p of stale.slice(0, 5)) {
    try {
      const name = p["Company Name"] || p["Company"] || p["Organization"] || p["name"] || "";
      const website = p["Website"] || p["website"] || p["WEBSITE"] || "";
      const result = await webResearch.searchWeb(`${name} ${website} email contact`);
      if (result && result.length > 0) {
        enriched++;
      }
    } catch {
      errors++;
    }
  }

  for (const p of missingEmail.slice(0, 5)) {
    try {
      const name = p["Company Name"] || p["Company"] || p["Organization"] || p["name"] || "";
      const website = p["Website"] || p["website"] || p["WEBSITE"] || "";
      const result = await webResearch.searchWeb(`${name} ${website} email`);
      if (result && result.length > 0) {
        enriched++;
      }
    } catch {
      errors++;
    }
  }

  const summary = { processed: stale.length + missingEmail.length, attempted: Math.min(stale.length, 5) + Math.min(missingEmail.length, 5), enriched, errors };
  activity.append("observed", `CRM Sweep: ${summary.attempted} rechecked, ${summary.enriched} enriched, ${summary.errors} errors`, { source: "crm-sweep" });
  return summary;
}

module.exports = { runSweep };
