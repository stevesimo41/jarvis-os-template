(function () {
    "use strict";

    const ENDPOINT =
        "/api/crm/intelligence/analyze";

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    async function analyze(prospect) {
        const response = await fetch(
            ENDPOINT,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify({
                    prospect
                })
            }
        );

        const payload = await response.json();

        if (!response.ok) {
            throw new Error(
                payload?.error ||
                "Prospect intelligence analysis failed."
            );
        }

        return payload.profile;
    }

    function renderEmpty() {
        return `
            <aside class="jarvis-crm-intelligence">
                <div class="jarvis-crm-intelligence-empty">
                    <span>PROSPECT INTELLIGENCE</span>
                    <strong>Select a prospect</strong>
                    <p>
                        Choose a row to view its opportunity score,
                        summary, signals, and recommended next action.
                    </p>
                </div>
            </aside>
        `;
    }

    function renderLoading(company) {
        return `
            <aside class="jarvis-crm-intelligence">
                <div class="jarvis-crm-intelligence-empty">
                    <span>PROSPECT INTELLIGENCE</span>
                    <strong>${escapeHtml(company || "Analyzing prospect")}</strong>
                    <p>Building intelligence profile...</p>
                </div>
            </aside>
        `;
    }

    function renderError(message) {
        return `
            <aside class="jarvis-crm-intelligence">
                <div class="jarvis-crm-message is-error">
                    <strong>Intelligence unavailable</strong>
                    <span>${escapeHtml(message)}</span>
                </div>
            </aside>
        `;
    }

    function renderProfile(profile) {
        const score = Number(
            profile?.opportunityScore || 0
        );

        const reasons = Array.isArray(profile?.scoreReasons)
            ? profile.scoreReasons
            : [];

        const signals = Object.entries(
            profile?.signals || {}
        )
            .filter(([, value]) => Boolean(value))
            .map(([key]) =>
                key
                    .replace(/^has/, "")
                    .replace(/([A-Z])/g, " $1")
                    .trim()
            );

        return `
            <aside class="jarvis-crm-intelligence">
                <div class="jarvis-crm-intelligence-heading">
                    <span>PROSPECT INTELLIGENCE</span>
                    <strong>${escapeHtml(profile?.company)}</strong>
                </div>

                <div class="jarvis-crm-score">
                    <div>
                        <span>Opportunity score</span>
                        <strong>${escapeHtml(score)}</strong>
                    </div>

                    <div
                        class="jarvis-crm-score-bar"
                        aria-label="Opportunity score ${escapeHtml(score)} out of 100"
                    >
                        <span style="width: ${Math.max(0, Math.min(100, score))}%"></span>
                    </div>
                </div>

                <section class="jarvis-crm-intelligence-section">
                    <span>Summary</span>
                    <p>${escapeHtml(profile?.summary)}</p>
                </section>

                <section class="jarvis-crm-intelligence-section">
                    <span>Next best action</span>
                    <p>
                        <strong>
                            ${escapeHtml(profile?.nextBestAction)}
                        </strong>
                    </p>
                </section>

                <section class="jarvis-crm-intelligence-section">
                    <span>Positive signals</span>

                    ${
                        signals.length
                            ? `
                                <div class="jarvis-crm-signal-list">
                                    ${signals
                                        .map(signal => `
                                            <span>
                                                ${escapeHtml(signal)}
                                            </span>
                                        `)
                                        .join("")}
                                </div>
                            `
                            : `
                                <p>No strong signals detected yet.</p>
                            `
                    }
                </section>

                <section class="jarvis-crm-intelligence-section">
                    <span>Why this score</span>

                    ${
                        reasons.length
                            ? `
                                <ul>
                                    ${reasons
                                        .map(reason => `
                                            <li>
                                                ${escapeHtml(reason)}
                                            </li>
                                        `)
                                        .join("")}
                                </ul>
                            `
                            : `
                                <p>
                                    More prospect data is needed
                                    to strengthen the score.
                                </p>
                            `
                    }
                </section>

                <div class="jarvis-crm-intelligence-footer">
                    ${
                        profile?.cached
                            ? "Loaded from intelligence cache"
                            : "New intelligence profile created"
                    }
                </div>
            </aside>
        `;
    }

    window.JarvisCrmIntelligence = {
        analyze,
        renderEmpty,
        renderLoading,
        renderError,
        renderProfile
    };
})();
