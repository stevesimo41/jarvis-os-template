(function () {
    "use strict";

    const { field } = window.JarvisCrmFields;

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function safeUrl(value) {
        const normalized = String(value || "").trim();

        if (!normalized) {
            return "";
        }

        if (
            normalized.startsWith("http://") ||
            normalized.startsWith("https://")
        ) {
            return normalized;
        }

        return `https://${normalized}`;
    }

    function renderRow(record, index, offset) {
        const company =
            field(record, "company") ||
            "Unnamed prospect";

        const category = field(record, "category");
        const subcategory = field(record, "subcategory");
        const contact = field(record, "contact");
        const city = field(record, "city");
        const region = field(record, "state");
        const owner = field(record, "owner");
        const lastContact = field(record, "lastContact");
        const followUp = field(record, "followUp");
        const stage = field(record, "stage");
        const website = safeUrl(field(record, "website"));
        const email = field(record, "email");
        const phone = field(record, "phone");
        const location = [city, region]
            .filter(Boolean)
            .join(", ");

        const rowId =
            record?._sheetRow ||
            record?.rowNumber ||
            index + offset + 1;

        return `
            <tr
                class="jarvis-crm-selectable-row"
                data-crm-row="${escapeHtml(rowId)}"
                data-crm-record-index="${escapeHtml(index)}"
                tabindex="0"
            >
                <td>
                    <div class="jarvis-crm-company">
                        ${escapeHtml(company)}
                    </div>

                    ${
                        subcategory
                            ? `
                                <div class="jarvis-crm-secondary">
                                    ${escapeHtml(subcategory)}
                                </div>
                            `
                            : ""
                    }
                </td>

                <td>${escapeHtml(category)}</td>

                <td>
                    <div>${escapeHtml(contact)}</div>

                    ${
                        email
                            ? `
                                <a
                                    class="jarvis-crm-inline-link"
                                    href="mailto:${escapeHtml(email)}"
                                >
                                    ${escapeHtml(email)}
                                </a>
                            `
                            : ""
                    }

                    ${
                        phone
                            ? `
                                <a
                                    class="jarvis-crm-inline-link"
                                    href="tel:${escapeHtml(phone)}"
                                >
                                    ${escapeHtml(phone)}
                                </a>
                            `
                            : ""
                    }
                </td>

                <td>${escapeHtml(location)}</td>
                <td>${escapeHtml(owner)}</td>
                <td>${escapeHtml(lastContact)}</td>
                <td>${escapeHtml(followUp)}</td>

                <td>
                    ${
                        stage
                            ? `
                                <span class="jarvis-crm-stage">
                                    ${escapeHtml(stage)}
                                </span>
                            `
                            : ""
                    }
                </td>

                <td>
                    ${
                        website
                            ? `
                                <a
                                    class="jarvis-crm-action"
                                    href="${escapeHtml(website)}"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Open
                                </a>
                            `
                            : `
                                <span class="jarvis-crm-secondary">
                                    None
                                </span>
                            `
                    }
                </td>
            </tr>
        `;
    }

    function render(records, offset) {
        const body =
            records.length
                ? records
                    .map((record, index) =>
                        renderRow(record, index, offset)
                    )
                    .join("")
                : `
                    <tr>
                        <td
                            colspan="9"
                            class="jarvis-crm-empty-row"
                        >
                            No records match the current filters.
                        </td>
                    </tr>
                `;

        return `
            <div class="jarvis-crm-table-shell">
                <table class="jarvis-crm-table">
                    <thead>
                        <tr>
                            <th>Company</th>
                            <th>Category</th>
                            <th>Contact</th>
                            <th>Location</th>
                            <th>Owner</th>
                            <th>Last contact</th>
                            <th>Follow up</th>
                            <th>Stage</th>
                            <th>Website</th>
                        </tr>
                    </thead>

                    <tbody>${body}</tbody>
                </table>
            </div>
        `;
    }

    window.JarvisCrmTable = {
        render
    };
})();
