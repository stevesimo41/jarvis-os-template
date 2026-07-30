(function () {
    "use strict";

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function render({
        total,
        visible,
        offset,
        pageSize,
        source
    }) {
        const page =
            total
                ? Math.floor(offset / pageSize) + 1
                : 0;

        return `
            <div class="jarvis-crm-metrics">
                <article class="jarvis-crm-metric">
                    <span>Prospects</span>
                    <strong>${escapeHtml(total)}</strong>
                </article>

                <article class="jarvis-crm-metric">
                    <span>Visible</span>
                    <strong>${escapeHtml(visible)}</strong>
                </article>

                <article class="jarvis-crm-metric">
                    <span>Page</span>
                    <strong>${escapeHtml(page)}</strong>
                </article>

                <article class="jarvis-crm-metric">
                    <span>Source</span>
                    <strong class="jarvis-crm-source-name">
                        ${escapeHtml(source || "Prospects")}
                    </strong>
                </article>
            </div>
        `;
    }

    window.JarvisCrmMetrics = {
        render
    };
})();
