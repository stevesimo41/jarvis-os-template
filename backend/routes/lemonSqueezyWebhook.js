const express = require("express");
const ls = require("../services/lemonSqueezyService");
const audit = require("../governance/auditLog");

const router = express.Router();

router.post("/", express.raw({ type: "application/json" }), async (req, res) => {
    try {
        const rawBody = req.body;
        const signature = req.get("x-signature");

        if (!ls.verifyWebhookSignature(rawBody, signature)) {
            console.warn("[LS Webhook] Invalid signature — rejecting");
            return res.status(401).json({ ok: false, error: "Invalid signature" });
        }

        let event;
        try {
            event = JSON.parse(rawBody.toString());
        } catch {
            return res.status(400).json({ ok: false, error: "Invalid JSON" });
        }

        const eventType = event.meta?.event_name || "unknown";
        const eventData = event.data || {};

        console.log(`[LS Webhook] ${eventType} — ${eventData.id || "no-id"}`);
        ls.recordEvent({ type: eventType, data: eventData });
        audit.append("lemon_squeezy_webhook", { eventType, eventId: eventData.id });

        switch (eventType) {
            case "order_created":
                await handleOrderCreated(eventData);
                break;
            case "subscription_created":
            case "subscription_updated":
                await handleSubscriptionEvent(eventType, eventData);
                break;
            case "subscription_cancelled":
            case "subscription_expired":
                await handleSubscriptionCancelled(eventData);
                break;
            case "subscription_payment_success":
                console.log(`[LS Webhook] Payment received for subscription ${eventData.id}`);
                break;
            case "subscription_payment_failed":
                console.warn(`[LS Webhook] Payment FAILED for subscription ${eventData.id}`);
                break;
            case "license_key_created":
                console.log(`[LS Webhook] License key created: ${eventData.attributes?.key?.substring(0, 8)}...`);
                break;
            default:
                console.log(`[LS Webhook] Unhandled event type: ${eventType}`);
        }

        res.json({ ok: true });
    } catch (error) {
        console.error("[LS Webhook] Error:", error.message);
        res.status(500).json({ ok: false, error: "Internal error" });
    }
});

async function handleOrderCreated(data) {
    const attrs = data.attributes || {};
    const email = attrs.user_email || "unknown";
    const total = (attrs.total || 0) / 100;
    const orderId = data.id;

    console.log(`[LS Webhook] NEW ORDER: $${total} from ${email} (order ${orderId})`);

    try {
        const emailService = require("../services/emailService");
        await emailService.sendEmail(
            process.env.WELL_NOTICED_EMAIL,
            `JARVIS OS Sale: $${total} from ${email}`,
            `<h2>New JARVIS OS Purchase</h2>
             <p><strong>Amount:</strong> $${total}</p>
             <p><strong>Customer:</strong> ${email}</p>
             <p><strong>Order ID:</strong> ${orderId}</p>
             <p><strong>Time:</strong> ${new Date().toISOString()}</p>`,
            `New JARVIS OS Purchase: $${total} from ${email} (order ${orderId})`
        );
    } catch (emailErr) {
        console.error("[LS Webhook] Failed to send notification email:", emailErr.message);
    }
}

async function handleSubscriptionEvent(type, data) {
    const attrs = data.attributes || {};
    console.log(`[LS Webhook] ${type}: subscription ${data.id} — status=${attrs.status}, product=${attrs.product_name}`);
}

async function handleSubscriptionCancelled(data) {
    const attrs = data.attributes || {};
    console.log(`[LS Webhook] Subscription ${data.id} cancelled/expired — customer=${attrs.user_email}`);
}

module.exports = router;
