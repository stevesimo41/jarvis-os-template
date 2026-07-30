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

    function renderOptions(values, currentValue) {
        return values
            .map(value => {
                const selected =
                    value === currentValue
                        ? " selected"
                        : "";

                return `
                    <option
                        value="${escapeHtml(value)}"
                        ${selected}
                    >
                        ${escapeHtml(value)}
                    </option>
                `;
            })
            .join("");
    }

    function render({
        query,
        categories,
        category,
        owners,
        owner,
        pageSize
    }) {
        return `
            <div class="jarvis-crm-controls">
                <label class="jarvis-crm-search">
                    <span>Search</span>
                    <input
                        id="jarvis-crm-search"
                        type="search"
                        value="${escapeHtml(query)}"
                        placeholder="Company, contact, city, category..."
                    >
                </label>

                <label>
                    <span>Category</span>
                    <select id="jarvis-crm-category">
                        <option value="">All categories</option>
                        ${renderOptions(categories, category)}
                    </select>
                </label>

                <label>
                    <span>Owner</span>
                    <select id="jarvis-crm-owner">
                        <option value="">All owners</option>
                        ${renderOptions(owners, owner)}
                    </select>
                </label>

                <label>
                    <span>Show</span>
                    <select id="jarvis-crm-page-size">
                        <option value="10" ${pageSize === 10 ? "selected" : ""}>10</option>
                        <option value="25" ${pageSize === 25 ? "selected" : ""}>25</option>
                        <option value="50" ${pageSize === 50 ? "selected" : ""}>50</option>
                        <option value="100" ${pageSize === 100 ? "selected" : ""}>100</option>
                    </select>
                </label>

                <button
                    id="jarvis-crm-refresh"
                    class="jarvis-crm-button"
                    type="button"
                >
                    Refresh
                </button>
            </div>
        `;
    }

    window.JarvisCrmFilters = {
        render
    };
})();
