(function () {
    function escapeHtml(value) {
        const element = document.createElement("div");
        element.textContent = String(value ?? "");
        return element.innerHTML;
    }

    async function loadReleases() {
        const workspace = document.getElementById("conversation");
        workspace.innerHTML = `
            <section class="release-center">
                <div class="release-loading">Loading release intelligence...</div>
            </section>
        `;

        try {
            const response = await fetch("/api/releases");
            const payload = await response.json();
            if (!response.ok || !payload.ok) {
                throw new Error(payload.error || "Release metadata unavailable");
            }
            render(workspace, payload.data);
        } catch (error) {
            workspace.innerHTML = `
                <section class="release-center">
                    <div class="release-alert">${escapeHtml(error.message)}</div>
                </section>
            `;
        }
    }

    function render(workspace, data) {
        const validation = data.validation || {};
        workspace.innerHTML = `
            <section class="release-center">
                <header class="release-hero">
                    <div>
                        <div class="eyebrow">DEVELOPMENT / UPGRADES / RELEASES</div>
                        <h1>${escapeHtml(data.currentVersion)}</h1>
                        <p>${escapeHtml(data.theme)}</p>
                    </div>
                    <span class="release-state">${escapeHtml(data.state)}</span>
                </header>

                <div class="release-metrics">
                    <article><span>RELEASED</span><strong>${escapeHtml(data.releasedAt)}</strong></article>
                    <article><span>VALIDATION</span><strong>${escapeHtml(validation.status)}</strong></article>
                    <article><span>JAVASCRIPT</span><strong>${escapeHtml(validation.javascriptFiles)} files</strong></article>
                    <article><span>TESTS</span><strong>${escapeHtml(validation.tests)} passing</strong></article>
                </div>

                <div class="release-grid">
                    <article class="release-panel">
                        <div class="eyebrow">UPCOMING DEMO</div>
                        <h2>${escapeHtml(data.upcomingDemo?.name)}</h2>
                        <p>${escapeHtml(data.upcomingDemo?.focus)}</p>
                        <span class="release-url">${escapeHtml(data.upcomingDemo?.url)}</span>
                    </article>
                    <article class="release-panel">
                        <div class="eyebrow">NEXT RELEASE</div>
                        <h2>${escapeHtml(data.nextRelease?.id)} — ${escapeHtml(data.nextRelease?.title)}</h2>
                        <p>${escapeHtml(data.nextRelease?.scope)}</p>
                    </article>
                </div>

                <section class="release-panel release-history">
                    <div class="eyebrow">COMPLETED RELEASES</div>
                    ${(data.completedReleases || []).map(release => `
                        <article class="release-row">
                            <div><strong>${escapeHtml(release.id)}</strong><span>${escapeHtml(release.date)}</span></div>
                            <div><h3>${escapeHtml(release.title)}</h3><p>${escapeHtml(release.summary)}</p></div>
                        </article>
                    `).join("")}
                </section>

                <section class="release-panel release-history">
                    <div class="eyebrow">PLANNED ROADMAP</div>
                    ${(data.plannedReleases || []).map(release => `
                        <article class="release-row">
                            <div><strong>${escapeHtml(release.id)}</strong><span>PLANNED</span></div>
                            <div><h3>${escapeHtml(release.title)}</h3><p>${escapeHtml(release.outcome)}</p></div>
                        </article>
                    `).join("")}
                </section>

                <section class="release-panel">
                    <div class="eyebrow">KNOWN ISSUES</div>
                    <ul class="release-issues">
                        ${(data.knownIssues || []).map(issue => `<li>${escapeHtml(issue)}</li>`).join("")}
                    </ul>
                </section>

                <p class="release-boundary">Use this workspace for release visibility and planning. Use Codex for repository changes, validation, tests, and commits.</p>
            </section>
        `;
    }

    window.loadReleases = loadReleases;
}());
