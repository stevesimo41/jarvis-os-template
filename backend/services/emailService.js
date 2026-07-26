const nodemailer = require("nodemailer");
const validation = require("./prospectValidationService");

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    const email = process.env.WELL_NOTICED_EMAIL;
    const password = process.env.WELL_NOTICED_PASSWORD;

    if (!email || !password) {
        console.warn("[Email Service] WELL_NOTICED_EMAIL or WELL_NOTICED_PASSWORD not configured");
        return null;
    }

    transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: email,
            pass: password
        },
        tls: {
            rejectUnauthorized: true
        }
    });

    return transporter;
}

async function sendEmail(to, subject, htmlBody, textBody) {
    const transport = getTransporter();
    if (!transport) {
        return { success: false, error: "Email not configured — WELL_NOTICED_EMAIL/WELL_NOTICED_PASSWORD missing" };
    }

    try {
        const info = await transport.sendMail({
            from: `"Steve Simonetti - Well Noticed" <${process.env.WELL_NOTICED_EMAIL}>`,
            to,
            subject,
            text: textBody || htmlBody.replace(/<[^>]*>/g, ""),
            html: htmlBody
        });

        return {
            success: true,
            messageId: info.messageId,
            to,
            subject,
            sentAt: new Date().toISOString()
        };
    } catch (error) {
        console.error("[Email Service] Send failed:", error.message);
        return { success: false, error: error.message, to, subject };
    }
}

async function sendCampaignEmail(campaign, step) {
    const to = campaign.executiveEmail || campaign.prospect?.email;
    if (!to) {
        return { success: false, error: "No recipient email address" };
    }

    const companyName = campaign.prospectName || campaign.name || "";
    if (!companyName || validation.isPlaceholderName(companyName)) {
        return { success: false, error: `BLOCKED: Company name is invalid ("${companyName || '(empty)'}"). Campaign emails require a verified business name.` };
    }

    const subject = step.subject || `Well Noticed — ${campaign.prospectName}`;
    const htmlBody = step.message || step.body || "";

    return sendEmail(to, subject, htmlBody);
}

async function verifyConnection() {
    const transport = getTransporter();
    if (!transport) {
        return { connected: false, error: "Email not configured" };
    }

    try {
        await transport.verify();
        return { connected: true, email: process.env.WELL_NOTICED_EMAIL };
    } catch (error) {
        return { connected: false, error: error.message };
    }
}

module.exports = { sendEmail, sendCampaignEmail, verifyConnection };
