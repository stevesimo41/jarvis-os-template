(function () {
    "use strict";

    const FIELD_CANDIDATES = {
        company: [
            "Company Name",
            "Company",
            "Organization",
            "Business Name",
            "Name",
            "name"
        ],
        category: [
            "Master-Category",
            "Master Category",
            "Category",
            "industry"
        ],
        subcategory: [
            "Sub-Category Name",
            "Subcategory",
            "Sub-Category",
            "subcategory"
        ],
        contact: [
            "Main Contact",
            "Contact",
            "Contact Name"
        ],
        city: ["City", "city"],
        state: ["ST", "State", "state"],
        owner: [
            "WN / Owner (S / P)",
            "Owner",
            "Assigned To",
            "owner"
        ],
        lastContact: [
            "**DATE ONLY** Last Date of Contact",
            "Last Date of Contact",
            "Last Contact",
            "lastOutreachAt"
        ],
        followUp: [
            "**DATE ONLY** Follow up date",
            "Follow up date",
            "Follow Up",
            "Follow Up Date",
            "nextActionDue"
        ],
        stage: [
            "Prospect, Customer, Term",
            "Stage",
            "Status",
            "status"
        ],
        website: ["Website", "URL", "website"],
        email: ["EMAIL", "Email", "email"],
        phone: ["Phone", "PHONE", "phone"]
    };

    function getField(record, candidates) {
        for (const candidate of candidates) {
            const value = record?.[candidate];

            if (
                value !== undefined &&
                value !== null &&
                String(value).trim() !== ""
            ) {
                return String(value).trim();
            }
        }

        return "";
    }

    function field(record, key) {
        return getField(
            record,
            FIELD_CANDIDATES[key] || []
        );
    }

    function uniqueValues(records, key) {
        return [
            ...new Set(
                records
                    .map(record => field(record, key))
                    .filter(Boolean)
            )
        ].sort((a, b) => a.localeCompare(b));
    }

    window.JarvisCrmFields = {
        FIELD_CANDIDATES,
        field,
        uniqueValues
    };
})();
