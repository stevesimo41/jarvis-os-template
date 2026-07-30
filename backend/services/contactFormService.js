let _JSDOM = null;
function getJSDOM() {
    if (!_JSDOM) {
        _JSDOM = require("jsdom").JSDOM;
    }
    return _JSDOM;
}
const webResearch = require("./webResearch");
const activity = require("../brain/activityService");

const FORM_TYPES = {
    CONTACT_FORM_7: "contact-form-7",
    GRAVITY_FORMS: "gravity-forms",
    WPFORMS: "wpforms",
    HUBSPOT: "hubspot",
    GENERIC: "generic"
};

const CAPTCHA_PATTERNS = [
    /recaptcha/i,
    /hcaptcha/i,
    /captcha/i,
    /g-recaptcha/i,
    /turnstile/i
];

const NAME_FIELD_PATTERNS = [
    /your[_-]?name/i, /name/i, /full[_-]?name/i,
    /first[_-]?name/i, /contact[_-]?name/i, /from[_-]?name/i,
    /wpcf7-user-name/i, /gf_name/i, /wpforms\[name\]/i
];

const EMAIL_FIELD_PATTERNS = [
    /your[_-]?email/i, /email/i, /e-mail/i,
    /from[_-]?email/i, /contact[_-]?email/i,
    /wpcf7-user-email/i, /gf_email/i, /wpforms\[email\]/i
];

const MESSAGE_FIELD_PATTERNS = [
    /your[_-]?message/i, /message/i, /comment/i, /inquiry/i,
    /question/i, /details/i, /notes/i,
    /wpcf7-user-message/i, /gf_message/i, /wpforms\[message\]/i
];

const PHONE_FIELD_PATTERNS = [
    /your[_-]?phone/i, /phone/i, /telephone/i, /mobile/i,
    /wpcf7-user-phone/i, /gf_phone/i, /wpforms\[phone\]/i
];

const COMPANY_FIELD_PATTERNS = [
    /your[_-]?company/i, /company/i, /business/i, /organization/i,
    /gf_company/i
];

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function detectFormType(html, form) {
    if (html.includes("wpcf7") || html.includes("contact-form-7")) return FORM_TYPES.CONTACT_FORM_7;
    if (html.includes("gform_") || html.includes("gravityform")) return FORM_TYPES.GRAVITY_FORMS;
    if (html.includes("wpforms") || form?.getAttribute("class")?.includes("wpforms")) return FORM_TYPES.WPFORMS;
    if (html.includes("hsForm") || html.includes("hubspot") || html.includes("hbspt")) return FORM_TYPES.HUBSPOT;
    return FORM_TYPES.GENERIC;
}

function hasCaptcha(html) {
    return CAPTCHA_PATTERNS.some(p => p.test(html));
}

function findFieldMatch(inputs, patterns) {
    for (const input of inputs) {
        const name = input.getAttribute("name") || "";
        const id = input.getAttribute("id") || "";
        const placeholder = input.getAttribute("placeholder") || "";
        const ariaLabel = input.getAttribute("aria-label") || "";
        const title = input.getAttribute("title") || "";
        const inputType = input.getAttribute("type") || "";
        const label = input.getAttribute("aria-label") || "";

        const combined = `${name} ${id} ${placeholder} ${ariaLabel} ${title} ${inputType}`;
        if (patterns.some(p => p.test(combined))) {
            return name || id;
        }

        const labelEl = id ? input.ownerDocument?.querySelector(`label[for="${id}"]`) : null;
        const parentLabel = input.closest("label");
        const labelText = (labelEl?.textContent || parentLabel?.textContent || "").toLowerCase();
        if (labelText && patterns.some(p => p.test(labelText))) {
            return name || id;
        }
    }
    return null;
}

function detectFormFields(html, formElement) {
    const dom = new (getJSDOM())(html);
    const inputs = formElement
        ? Array.from(formElement.querySelectorAll("input, textarea, select"))
        : Array.from(dom.window.document.querySelectorAll("form input, form textarea, form select"));

    const fields = {
        name: findFieldMatch(inputs, NAME_FIELD_PATTERNS),
        email: findFieldMatch(inputs, EMAIL_FIELD_PATTERNS),
        message: findFieldMatch(inputs, MESSAGE_FIELD_PATTERNS),
        phone: findFieldMatch(inputs, PHONE_FIELD_PATTERNS),
        company: findFieldMatch(inputs, COMPANY_FIELD_PATTERNS)
    };

    const hiddenFields = [];
    inputs.forEach(input => {
        if (input.getAttribute("type") === "hidden") {
            hiddenFields.push({
                name: input.getAttribute("name"),
                value: input.getAttribute("value") || ""
            });
        }
    });
    fields.hidden = hiddenFields.filter(f => f.name);

    return fields;
}

function findContactPageUrl(html, baseUrl) {
    const patterns = [
        /href="([^"]*contact[^"]*)"/gi,
        /href="([^"]*get-in-touch[^"]*)"/gi,
        /href="([^"]*reach-us[^"]*)"/gi
    ];
    const urls = new Set();
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(html))) {
            let url = match[1];
            if (url.startsWith("/")) {
                try { url = new URL(url, baseUrl).href; } catch {}
            }
            if (url.startsWith("http")) urls.add(url);
        }
    }
    return [...urls][0] || null;
}

async function detectForm(url) {
    const html = await webResearch.fetchPage(url).catch(() => null);
    if (!html) return { detected: false, reason: "Could not fetch page" };

    if (hasCaptcha(html)) {
        return { detected: false, reason: "captcha-detected", needsManual: true };
    }

    const dom = new (getJSDOM())(html);
    const forms = Array.from(dom.window.document.querySelectorAll("form"));

    for (const form of forms) {
        const action = form.getAttribute("action") || "";
        const method = (form.getAttribute("method") || "POST").toUpperCase();
        const formClass = form.getAttribute("class") || "";
        const formId = form.getAttribute("id") || "";

        let isContact = /contact|inquiry|get-in-touch|reach|message/i.test(action + " " + formClass + " " + formId)
            || /contact|inquiry/i.test(form.innerHTML.substring(0, 500));

        if (!isContact) {
            const fields = detectFormFields(html, form);
            if (fields.name && fields.email && fields.message) {
                isContact = true;
            }
        }

        if (!isContact && forms.length > 1) continue;

        const formType = detectFormType(html, form);
        const fields = detectFormFields(html, form);

        const submitBtn = form.querySelector("input[type=submit], button[type=submit]");
        const submitName = submitBtn?.getAttribute("name") || "submit";

        return {
            detected: true,
            formType,
            action: action || url,
            method,
            fields,
            submitName,
            hasCaptcha: false
        };
    }

    if (forms.length > 0) {
        const form = forms[0];
        const fields = detectFormFields(html, form);
        return {
            detected: true,
            formType: FORM_TYPES.GENERIC,
            action: form.getAttribute("action") || url,
            method: (form.getAttribute("method") || "POST").toUpperCase(),
            fields,
            submitName: "submit",
            hasCaptcha: false
        };
    }

    const contactPage = findContactPageUrl(html, url);
    if (contactPage) {
        return { detected: false, reason: "no-form-on-homepage", suggestUrl: contactPage };
    }

    return { detected: false, reason: "no-form-found" };
}

async function submitForm(url, formData) {
    const { name, email, phone, company, message, subject } = formData;

    const detection = await detectForm(url);

    if (!detection.detected) {
        if (detection.reason === "captcha-detected") {
            activity.append("observed", `Contact form: captcha detected`, { url, prospect: company });
            return { success: false, reason: "captcha", needsManual: true, suggestion: "Visit the website manually to submit." };
        }
        if (detection.suggestUrl) {
            const retry = await detectForm(detection.suggestUrl);
            if (retry.detected) {
                return await doSubmit(retry, { name, email, phone, company, message, subject });
            }
        }
        activity.append("observed", `Contact form: ${detection.reason}`, { url });
        return { success: false, reason: detection.reason, needsManual: detection.needsManual || false };
    }

    return await doSubmit(detection, { name, email, phone, company, message, subject });
}

async function doSubmit(formInfo, data) {
    const { action, method, fields, formType, submitName } = formInfo;
    const payload = {};

    if (fields.hidden) {
        fields.hidden.forEach(h => { payload[h.name] = h.value; });
    }

    if (fields.name && data.name) payload[fields.name] = data.name;
    if (fields.email && data.email) payload[fields.email] = data.email;
    if (fields.phone && data.phone) payload[fields.phone] = data.phone;
    if (fields.company && data.company) payload[fields.company] = data.company;
    if (fields.message && data.message) payload[fields.message] = data.message;

    payload[submitName] = "Submit";

    if (formType === FORM_TYPES.HUBSPOT) {
        payload.context = { pageUri: data.websiteUrl || "" };
    }

    if (!action || action.startsWith("javascript:") || action === "#" || action === "#0") {
        return { success: false, reason: "invalid-form-action", formType, suggestion: "Form action is not a real URL." };
    }

    let submitUrl;
    try {
        submitUrl = action.startsWith("http") ? action : new URL(action, data.websiteUrl).href;
    } catch {
        return { success: false, reason: "invalid-url", formType, suggestion: "Could not resolve form action URL." };
    }

    try {
        const body = new URLSearchParams(payload).toString();
        const response = await fetch(submitUrl, {
            method: method || "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": USER_AGENT,
                "Accept": "text/html,application/xhtml+xml,*/*",
                "Referer": data.websiteUrl || submitUrl,
                "Origin": new URL(submitUrl).origin
            },
            body,
            redirect: "follow"
        });

        const responseText = await response.text().catch(() => "");
        const success = response.ok && !/error|failed|invalid/i.test(responseText.substring(0, 1000));

        activity.append("observed", `Contact form ${success ? "submitted" : "failed"}`, {
            url: submitUrl,
            formType,
            status: response.status,
            prospect: data.company
        });

        return {
            success,
            formType,
            status: response.status,
            submittedTo: submitUrl,
            fieldsSubmitted: Object.keys(payload).filter(k => k !== submitName)
        };
    } catch (error) {
        activity.append("observed", `Contact form error: ${error.message}`, { url: submitUrl });
        return { success: false, reason: error.message, formType };
    }
}

module.exports = { detectForm, submitForm, FORM_TYPES };
