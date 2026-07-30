(function () {
    const escapeHtml = value => {
        const node = document.createElement("div");
        node.textContent = String(value ?? "");
        return node.innerHTML;
    };

    async function request(url, options) {
        const response = await fetch(url, options);
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.error?.message || payload.error || "Request failed");
        return payload.data;
    }

    async function loadReadiness() {
        const workspace = document.getElementById("conversation");
        workspace.innerHTML = `<section class="readiness-center"><div class="readiness-panel">Assessing operational readiness...</div></section>`;
        try {
            const [readiness, pilot] = await Promise.all([
                request("/api/readiness/status"),
                request("/api/readiness/revenue-pilot")
            ]);
            render(workspace, readiness, pilot);
        } catch (error) {
            workspace.innerHTML = `<section class="readiness-center"><div class="readiness-panel">${escapeHtml(error.message)}</div></section>`;
        }
    }

    function render(workspace, readiness, pilot, message = "") {
        const plan = pilot.plan;
        workspace.innerHTML = `<section class="readiness-center">
            <header class="readiness-hero"><div><div class="eyebrow">JARVIS OS / OPERATIONAL READINESS</div><h1>Readiness & Revenue Pilot</h1><p>Production gates and the first measurable Well Noticed shadow workflow.</p></div><span class="${readiness.criticalBlockers.length ? "blocked" : "ready"}">${escapeHtml(readiness.score)}% · ${escapeHtml(readiness.status)}</span></header>
            ${message ? `<div class="readiness-message">${escapeHtml(message)}</div>` : ""}
            <div class="readiness-grid">${readiness.gates.map(gate => `<article class="readiness-gate ${gate.ready ? "is-ready" : "is-blocked"}"><span>${gate.ready ? "READY" : gate.critical ? "BLOCKER" : "OPTIONAL"}</span><strong>${escapeHtml(gate.label)}</strong><p>${escapeHtml(gate.detail)}</p></article>`).join("")}</div>
            <article class="readiness-panel pilot-panel"><div><div class="eyebrow">WELL NOTICED / RENEWAL SHADOW PILOT</div><h2>${escapeHtml(plan.objective)}</h2><p>${escapeHtml(plan.proposedExperiment.hypothesis)}</p></div><div class="pilot-score"><strong>${escapeHtml(plan.candidateCount)}</strong><span>ELIGIBLE PARTNERS</span></div></article>
            <article class="readiness-panel"><div class="eyebrow">CURRENT EVIDENCE</div>${plan.candidates.length ? plan.candidates.map(item => `<p class="readiness-row"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.nextAction)}</span></p>`).join("") : plan.blockers.map(item => `<p class="pilot-blocker">${escapeHtml(item)}</p>`).join("")}<div class="pilot-metrics"><span><strong>${pilot.metrics.runs}</strong>shadow runs</span><span><strong>${pilot.metrics.candidatesPrepared}</strong>prepared</span><span><strong>${pilot.metrics.externalActions}</strong>external actions</span><span><strong>$${pilot.metrics.spend}</strong>spend</span><span><strong>$${pilot.metrics.realizedRevenue}</strong>realized revenue</span></div><button id="runRenewalShadow" type="button">RUN SHADOW REVIEW</button></article>
            <p class="readiness-boundary">Shadow mode observes and prepares only. It does not contact partners, change CRM records, spend money, or claim projected value as revenue.</p>
        </section>`;
        document.getElementById("runRenewalShadow")?.addEventListener("click", async () => {
            const button = document.getElementById("runRenewalShadow");
            button.disabled = true;
            try {
                const result = await request("/api/readiness/revenue-pilot/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation: "RUN SHADOW" }) });
                const freshPilot = await request("/api/readiness/revenue-pilot");
                render(workspace, readiness, freshPilot, `Shadow review complete: ${result.outcome}.`);
            } catch (error) {
                render(workspace, readiness, pilot, `Connect as owner or operator before running the pilot: ${error.message}`);
            }
        });
    }

    window.loadReadiness = loadReadiness;
}());
