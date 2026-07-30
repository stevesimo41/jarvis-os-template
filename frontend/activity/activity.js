(function () {
    function escapeHtml(value) {
        const element = document.createElement("div");
        element.textContent = String(value ?? "");
        return element.innerHTML;
    }

    function timeLabel(value) {
        const date = new Date(value);
        return Number.isNaN(date.valueOf()) ? "UNKNOWN" : date.toLocaleString();
    }

    async function loadActivity() {
        const workspace = document.getElementById("conversation");
        workspace.innerHTML = `<section class="activity-center"><div class="activity-loading">Synchronizing the unified brain...</div></section>`;
        try {
            const [activityResponse, contextResponse] = await Promise.all([
                fetch("/api/brain/activity?limit=75"),
                fetch("/api/brain/context")
            ]);
            const activityPayload = await activityResponse.json();
            const contextPayload = await contextResponse.json();
            if (!activityResponse.ok || !activityPayload.ok || !contextResponse.ok || !contextPayload.ok) {
                throw new Error("Unified brain status is unavailable.");
            }
            render(workspace, contextPayload.data, activityPayload.data.events);
        } catch (error) {
            workspace.innerHTML = `<section class="activity-center"><div class="activity-alert">${escapeHtml(error.message)}</div></section>`;
        }
    }

    function render(workspace, brain, events) {
        const counts = brain.summary?.counts || {};
        const sources = brain.synchronization?.sourceStatus || {};
        workspace.innerHTML = `
            <section class="activity-center">
                <header class="activity-hero">
                    <div><div class="eyebrow">JARVIS OS / UNIFIED BRAIN</div><h1>Activity & Context</h1><p>One synchronized operating picture shared by JARVIS interfaces and agents.</p></div>
                    <span class="brain-contract">CONTRACT ${escapeHtml(brain.contractVersion)}</span>
                </header>
                <div class="brain-metrics">
                    <article><span>CANONICAL RECORDS</span><strong>${escapeHtml(brain.summary?.totalRecords || 0)}</strong></article>
                    <article><span>CONNECTED SOURCES</span><strong>${escapeHtml(Object.values(sources).filter(item => item.available).length)}</strong></article>
                    <article><span>CONFLICTS</span><strong>${escapeHtml(brain.summary?.conflicts || 0)}</strong></article>
                    <article><span>ASSEMBLED</span><strong>${escapeHtml(timeLabel(brain.assembledAt))}</strong></article>
                </div>
                <div class="brain-grid">
                    <article class="brain-panel">
                        <div class="eyebrow">SHARED CONTEXT</div>
                        <div class="context-counts">${Object.entries(counts).map(([type, count]) => `<span><strong>${escapeHtml(count)}</strong>${escapeHtml(type)}</span>`).join("")}</div>
                        <p class="brain-note">Records remain in their authoritative repositories. JARVIS assembles them through a versioned, provenance-aware contract.</p>
                    </article>
                    <article class="brain-panel">
                        <div class="eyebrow">SYNCHRONIZATION HEALTH</div>
                        <div class="source-list">${Object.entries(sources).map(([type, source]) => `<div><span class="source-dot ${source.available ? "online" : "offline"}"></span><strong>${escapeHtml(type)}</strong><small>${escapeHtml(source.count)} records · ${source.available ? "connected" : "not created"}</small></div>`).join("")}</div>
                    </article>
                </div>
                <section class="brain-panel activity-stream">
                    <div class="eyebrow">OBSERVE → RECOMMEND → PREPARE → REQUEST → EXECUTE → LEARN</div>
                    ${events.length ? events.map(event => `
                        <article class="activity-event">
                            <span class="phase phase-${escapeHtml(event.phase)}">${escapeHtml(event.phase)}</span>
                            <div><strong>${escapeHtml(event.summary)}</strong><p>${escapeHtml(event.actor)} · ${escapeHtml(event.source)} · ${escapeHtml(timeLabel(event.timestamp))}</p></div>
                        </article>
                    `).join("") : `<p class="brain-note">No activity has been recorded yet. Ask JARVIS or run a governed workflow to begin the stream.</p>`}
                </section>
                <p class="brain-boundary">Duplicate records are surfaced as conflicts and are never merged automatically. Private and restricted context stays local.</p>
            </section>`;
    }

    window.loadActivity = loadActivity;
}());
