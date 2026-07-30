(function () {
    "use strict";

    const { state } = window.JarvisCrmState;
    const { loadStatus, loadProspects, loadPortfolio } = window.JarvisCrmApi;
    const { field, uniqueValues } = window.JarvisCrmFields;

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function filteredRecords() {
        return state.records.filter(record => {
            if (
                state.category &&
                field(record, "category") !== state.category
            ) {
                return false;
            }

            if (
                state.owner &&
                field(record, "owner") !== state.owner
            ) {
                return false;
            }

            return true;
        });
    }

    function renderHeader() {
        const activeLane = state.portfolio?.lanes?.find(lane => lane.venture.id === state.ventureId);
        const connectionText =
            state.status?.connected === false
                ? "Unavailable"
                : state.status
                    ? "Connected"
                    : "Checking";

        return `
            <header class="jarvis-crm-header">
                <div>
                    <div class="jarvis-crm-eyebrow">
                        ${escapeHtml(activeLane?.venture?.name || "MULTI-VENTURE CRM")}
                    </div>

                    <h1>${escapeHtml(activeLane?.policy?.label || "Portfolio CRM")}</h1>

                    <p>
                        Shared relationship and opportunity infrastructure with venture-specific policy.
                    </p>
                </div>

                <div class="jarvis-crm-status">
                    <span
                        class="jarvis-crm-status-dot ${
                            state.status
                                ? "is-connected"
                                : ""
                        }"
                    ></span>

                    <div>
                        <strong>${escapeHtml(connectionText)}</strong>
                        <span>${escapeHtml(
                            state.status?.source || "JARVIS CRM"
                        )}</span>
                    </div>
                </div>
            </header>
        `;
    }

    function renderLanes() {
        const lanes = state.portfolio?.lanes || [];
        return `<nav class="jarvis-crm-lanes" aria-label="CRM venture lanes">${lanes.map(lane => `
            <button type="button" class="jarvis-crm-lane ${lane.venture.id === state.ventureId ? "is-active" : ""}" data-venture-id="${escapeHtml(lane.venture.id)}">
                <span>${escapeHtml(lane.policy.label)}</span><small>${escapeHtml(lane.metrics.relationships)} relationships · ${escapeHtml(lane.metrics.openTasks)} tasks</small>
            </button>`).join("")}</nav>`;
    }

    function renderFooter() {
        const firstVisible =
            state.total === 0
                ? 0
                : state.offset + 1;

        const lastVisible =
            Math.min(
                state.offset + state.records.length,
                state.total
            );

        return `
            <footer class="jarvis-crm-footer">
                <button
                    id="jarvis-crm-previous"
                    class="jarvis-crm-button"
                    type="button"
                    ${
                        state.offset === 0
                            ? "disabled"
                            : ""
                    }
                >
                    Previous
                </button>

                <span>
                    ${escapeHtml(firstVisible)}
                    –
                    ${escapeHtml(lastVisible)}
                    of
                    ${escapeHtml(state.total)}
                </span>

                <button
                    id="jarvis-crm-next"
                    class="jarvis-crm-button"
                    type="button"
                    ${
                        state.offset +
                            state.records.length >=
                        state.total
                            ? "disabled"
                            : ""
                    }
                >
                    Next
                </button>
            </footer>
        `;
    }

    function renderIntelligence() {
        if (state.intelligenceLoading) {
            return window.JarvisCrmIntelligence.renderLoading(
                field(
                    state.selectedProspect,
                    "company"
                )
            );
        }

        if (state.intelligenceError) {
            return window.JarvisCrmIntelligence.renderError(
                state.intelligenceError
            );
        }

        if (state.intelligenceProfile) {
            return window.JarvisCrmIntelligence.renderProfile(
                state.intelligenceProfile
            );
        }

        return window.JarvisCrmIntelligence.renderEmpty();
    }

    function renderTrackingSummary() {
        if (!state.trackingStats) return "";
        const s = state.trackingStats;
        return `
            <div class="jarvis-crm-tracking-bar">
                <span class="jarvis-crm-tracking-item">📨 ${s.totalSent} sent</span>
                <span class="jarvis-crm-tracking-item">👁 ${s.totalOpened} opened (${s.openRate}%)</span>
                <span class="jarvis-crm-tracking-item">🔗 ${s.totalClicked} clicked (${s.clickRate}%)</span>
            </div>
        `;
    }

    function render() {
        if (!state.root) {
            return;
        }

        const visibleRecords = filteredRecords();
        const categories =
            uniqueValues(state.records, "category");
        const owners =
            uniqueValues(state.records, "owner");

        const source =
            state.status?.spreadsheet?.title ||
            state.status?.spreadsheet ||
            state.status?.source ||
            "Prospects";

        state.root.innerHTML = `
            <section class="jarvis-crm-workspace">
                ${renderHeader()}
                ${renderLanes()}
                ${renderTrackingSummary()}

                ${window.JarvisCrmMetrics.render({
                    total: state.total,
                    visible: visibleRecords.length,
                    offset: state.offset,
                    pageSize: state.pageSize,
                    source
                })}

                ${window.JarvisCrmFilters.render({
                    query: state.query,
                    categories,
                    category: state.category,
                    owners,
                    owner: state.owner,
                    pageSize: state.pageSize
                })}

                ${
                    state.loading
                        ? `
                            <div class="jarvis-crm-message">
                                Syncing live CRM data...
                            </div>
                        `
                        : ""
                }

                ${
                    state.error
                        ? `
                            <div
                                class="jarvis-crm-message is-error"
                                role="alert"
                            >
                                <strong>CRM sync unavailable</strong>
                                <span>${escapeHtml(state.error)}</span>
                            </div>
                        `
                        : ""
                }

                ${
                    !state.loading &&
                    !state.error &&
                    state.records.length === 0
                        ? `
                            <div class="jarvis-crm-message">
                                No prospect records were returned.
                            </div>
                        `
                        : ""
                }

                ${
                    !state.loading &&
                    !state.error &&
                    state.records.length > 0
                        ? `
                            <div id="crm-attention-container"></div>

                            <div class="jarvis-crm-main-grid">
                                <div>
                                    ${window.JarvisCrmTable.render(
                                        visibleRecords,
                                        state.offset
                                    )}

                                    ${renderFooter()}
                                </div>

                                <div class="jarvis-crm-side-column">
                                    ${renderIntelligence()}
                                    ${window.JarvisCrmGovernance.render(
                                        state.selectedProspect,
                                        state.governance
                                    )}
                                </div>
                            </div>
                        `
                        : ""
                }
            </section>
        `;

        bindEvents(visibleRecords);
        window.JarvisCrmGovernance.bind(
            state.selectedProspect,
            state.governance,
            render
        );

        // Render attention banner into its container
        if (window.CrmAttention) {
            const attContainer = document.getElementById("crm-attention-container");
            if (attContainer) attContainer.innerHTML = window.CrmAttention.render();
        }

        if (state.selectedProspect) {
            const rows = document.querySelectorAll(".jarvis-crm-selectable-row");
            rows.forEach((row, i) => {
                const record = visibleRecords[i];
                if (record && (
                    record === state.selectedProspect ||
                    (record.name || record["Company Name"]) === (state.selectedProspect.name || state.selectedProspect["Company Name"])
                )) {
                    row.classList.add("is-selected");
                }
            });
        }
    }

    async function selectProspect(prospect) {
        state.selectedProspect = prospect;
        state.intelligenceProfile = null;
        state.intelligenceError = "";
        state.intelligenceLoading = true;
        state.governance.plan = null;
        state.governance.approval = null;
        state.governance.execution = null;
        state.governance.auditEvents = [];
        state.governance.message = "";
        state.governance.error = "";
        render();

        try {
            state.intelligenceProfile =
                await window.JarvisCrmIntelligence.analyze(
                    prospect
                );
        } catch (error) {
            state.intelligenceError =
                error?.message ||
                "Unable to analyze prospect.";
        } finally {
            state.intelligenceLoading = false;
            render();
        }
    }

    function bindEvents(visibleRecords) {
        document.querySelectorAll(".jarvis-crm-lane").forEach(button => {
            button.addEventListener("click", () => {
                state.ventureId = button.dataset.ventureId;
                state.offset = 0;
                state.selectedProspect = null;
                state.intelligenceProfile = null;
                loadData();
            });
        });
        const search =
            document.getElementById("jarvis-crm-search");

        const category =
            document.getElementById("jarvis-crm-category");

        const owner =
            document.getElementById("jarvis-crm-owner");

        const refresh =
            document.getElementById("jarvis-crm-refresh");

        const previous =
            document.getElementById("jarvis-crm-previous");

        const next =
            document.getElementById("jarvis-crm-next");

        search?.addEventListener("input", event => {
            state.query = event.target.value;
            state.offset = 0;
            state.selectedProspect = null;
            loadData();

            const restored =
                document.getElementById("jarvis-crm-search");

            restored?.focus();
            restored?.setSelectionRange(
                state.query.length,
                state.query.length
            );
        });

        category?.addEventListener("change", event => {
            state.category = event.target.value;
            render();
        });

        owner?.addEventListener("change", event => {
            state.owner = event.target.value;
            render();
        });

        const pageSizeSelect = document.getElementById("jarvis-crm-page-size");
        pageSizeSelect?.addEventListener("change", event => {
            state.pageSize = Number(event.target.value) || 50;
            state.offset = 0;
            state.selectedProspect = null;
            loadData();
        });

        refresh?.addEventListener("click", loadData);

        previous?.addEventListener("click", () => {
            state.offset = Math.max(
                0,
                state.offset - state.pageSize
            );

            state.selectedProspect = null;
            state.intelligenceProfile = null;
            loadData();
        });

        next?.addEventListener("click", () => {
            if (
                state.offset +
                    state.records.length <
                state.total
            ) {
                state.offset += state.pageSize;
                state.selectedProspect = null;
                state.intelligenceProfile = null;
                loadData();
            }
        });

        document
            .querySelectorAll(
                ".jarvis-crm-selectable-row"
            )
            .forEach(row => {
                const activate = () => {
                    const index = Number(
                        row.dataset.crmRecordIndex
                    );

                    const prospect =
                        visibleRecords[index];

                    if (prospect) {
                        selectProspect(prospect);
                    }
                };

                row.addEventListener("click", activate);

                row.addEventListener(
                    "keydown",
                    event => {
                        if (
                            event.key === "Enter" ||
                            event.key === " "
                        ) {
                            event.preventDefault();
                            activate();
                        }
                    }
                );
            });
    }

    async function loadData() {
        state.loading = true;
        state.error = "";
        render();

        try {
            const [
                statusPayload,
                prospectPayload,
                portfolioPayload
            ] = await Promise.all([
                loadStatus(state.ventureId),
                loadProspects(
                    state.pageSize,
                    state.offset,
                    state.ventureId,
                    state.query
                ),
                loadPortfolio()
            ]);

            state.status = statusPayload;
            state.records = prospectPayload.records;
            state.total = prospectPayload.total;
            state.portfolio = portfolioPayload.data;
            await window.JarvisCrmGovernance.loadAuthStatus(
                state.governance
            );
            // Load attention items (review tasks + enrichment suggestions)
            if (window.CrmAttention) {
                await window.CrmAttention.load();
            }
            // Load email tracking stats
            try {
                const trackResp = await fetch("/api/tracking/stats");
                const trackJson = await trackResp.json();
                if (trackJson.ok) state.trackingStats = trackJson.data;
            } catch (_e) { /* non-critical */ }
        } catch (error) {
            state.error =
                error?.message ||
                "Unable to load CRM data.";
        } finally {
            state.loading = false;
            render();
        }
    }

    window.JarvisCrmWorkspace = {
        render,
        loadData
    };
})();
