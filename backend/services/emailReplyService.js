const { ImapFlow } = require("imapflow");
const path = require("path");
const { readJson, writeJsonAtomic } = require("../storage/atomicJsonStore");
const activity = require("../brain/activityService");
const tracking = require("./emailTrackingService");
const learningEngine = require("./learningEngine");

const REPLY_STATE_PATH = path.join(__dirname, "../data/agents/email-reply-state.json");

function loadState() {
    const state = readJson(REPLY_STATE_PATH, { lastCheckDate: null, seenUids: [], replies: [], pausedCampaigns: [] });
    if (!state.seenUids) state.seenUids = [];
    if (!state.replies) state.replies = [];
    if (!state.pausedCampaigns) state.pausedCampaigns = [];
    if (!state.analyzed) state.analyzed = [];
    return state;
}

function saveState(state) {
    writeJsonAtomic(REPLY_STATE_PATH, state);
}

let client = null;
let monitorInterval = null;

async function getClient() {
    if (client && !client.destroyed) return client;

    const email = process.env.WELL_NOTICED_EMAIL;
    const password = process.env.WELL_NOTICED_PASSWORD;

    if (!email || !password) {
        throw new Error("WELL_NOTICED_EMAIL or WELL_NOTICED_PASSWORD not configured");
    }

    client = new ImapFlow({
        host: "imap.gmail.com",
        port: 993,
        secure: true,
        auth: {
            user: email,
            pass: password
        },
        logger: false
    });

    await client.connect();
    return client;
}

async function classifySentiment(subject, fromName, fromAddress) {
    try {
        const groq = require("./llm/groq");
        const text = `Subject: ${subject}\nFrom: ${fromName} <${fromAddress}>`;
        const result = await groq.complete({
            systemPrompt: "You are an email sentiment classifier. Classify the sentiment of the reply email based on the subject line and sender info. Respond with exactly one word: positive, negative, or neutral. Consider:\n- positive: thanks, interest, scheduling, affirmative, yes\n- negative: unsubscribe, stop, not interested, cease, complaint, angry\n- neutral: question, information request, who is this, confirmation",
            messages: [{ role: "user", content: text }],
            tools: false
        });
        const response = (result.text || "").trim().toLowerCase();
        if (response.includes("positive")) return "positive";
        if (response.includes("negative")) return "negative";
        return "neutral";
    } catch (err) {
        console.warn("[EmailReply] Sentiment classification failed:", err.message);
        return "neutral";
    }
}

async function matchProspectInCrm(email) {
    try {
        const repo = require("../repositories/crmSheetRepository");
        const provider = require("../providers/googleSheetsProvider");
        const r = new repo(new provider());
        const all = await r.getEntity("prospects");
        const match = all.find(p => {
            const prospectEmail = (p["Email"] || p["email"] || p["EMAIL"] || "").toLowerCase().trim();
            return prospectEmail === email.toLowerCase().trim();
        });
        return match || null;
    } catch (err) {
        console.warn("[EmailReply] CRM prospect lookup failed:", err.message);
        return null;
    }
}

async function updateCrmStatus(prospect, newStatus) {
    try {
        const repo = require("../repositories/crmSheetRepository");
        const provider = require("../providers/googleSheetsProvider");
        const r = new repo(new provider());
        const statusCol = "Not Touched, Reached Out, In Communication, DNC";
        await r.updateRow("prospects", prospect._row, { [statusCol]: newStatus });
        activity.append("observed", `Updated CRM status for ${prospect["Company Name"] || "unknown"} to "${newStatus}"`, {
            source: "email-reply-learning", status: newStatus
        });
        return true;
    } catch (err) {
        console.warn("[EmailReply] CRM status update failed:", err.message);
        return false;
    }
}

async function checkForReplies() {
    let imap;
    try {
        imap = await getClient();
    } catch (err) {
        console.error("[EmailReply] IMAP connection failed:", err.message);
        return { checked: false, error: err.message };
    }

    const state = loadState();
    const myEmail = process.env.WELL_NOTICED_EMAIL?.toLowerCase();
    let lock = null;

    try {
        lock = await imap.getMailboxLock("INBOX");
        const since = state.lastCheckDate
            ? new Date(state.lastCheckDate)
            : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const messages = [];
        for await (const msg of imap.fetch({ since }, { uid: true, envelope: true })) {
            if (!msg.uid || !msg.envelope) continue;
            if (state.seenUids.includes(msg.uid)) continue;
            messages.push(msg);
        }

        const newSeenUids = messages.map(m => m.uid);
        state.seenUids.push(...newSeenUids);
        state.seenUids = state.seenUids.slice(-500);
        state.lastCheckDate = new Date().toISOString();

        const replies = [];
        for (const msg of messages) {
            const envelope = msg.envelope;
            if (!envelope || !envelope.from) continue;

            const from = envelope.from[0];
            const fromAddress = from.address?.toLowerCase();
            if (!fromAddress || fromAddress === myEmail) continue;

            const subject = (envelope.subject || "");
            const isReply = /^\s*re:/i.test(subject) || /^\s*aw:/i.test(subject);

            const to = (envelope.to || []).map(t => t.address?.toLowerCase()).filter(Boolean);
            const cc = (envelope.cc || []).map(c => c.address?.toLowerCase()).filter(Boolean);
            const allRecipients = [...to, ...cc];
            const isToUs = allRecipients.includes(myEmail);

            if (!isToUs) continue;
            if (!isReply) continue;

            const allMappings = tracking.getTrackingByCampaign();
            const campaignMappings = Array.isArray(allMappings) ? allMappings : [];
            let matchedCampaign = null;
            for (const m of campaignMappings) {
                if (m.to?.toLowerCase() === fromAddress) {
                    matchedCampaign = m;
                    break;
                }
            }

            const reply = {
                uid: msg.uid,
                from: fromAddress,
                fromName: from.name || "",
                subject,
                receivedAt: envelope.date || new Date().toISOString(),
                campaignId: matchedCampaign?.campaignId || null,
                campaignStep: matchedCampaign?.stepNumber || null
            };

            replies.push(reply);

            if (reply.campaignId && !state.pausedCampaigns.includes(reply.campaignId)) {
                await pauseCampaign(reply.campaignId, reply);
                state.pausedCampaigns.push(reply.campaignId);
            }

            activity.append("observed", `Email reply from ${reply.from}${matchedCampaign ? ` (campaign ${matchedCampaign.campaignId})` : ""}: "${subject}"`, {
                source: "email-reply-detection",
                from: reply.from,
                campaignId: reply.campaignId,
                subject
            });
        }

        state.replies.push(...replies);
        state.replies = state.replies.slice(-200);
        saveState(state);

        for (const reply of replies) {
            if (state.analyzed.includes(reply.uid)) continue;
            await analyzeReply(reply);
            state.analyzed.push(reply.uid);
            state.analyzed = state.analyzed.slice(-500);
            saveState(state);
        }

        return { checked: true, newReplies: replies.length, totalReplies: state.replies.length };
    } catch (err) {
        console.error("[EmailReply] Check failed:", err.message);
        return { checked: false, error: err.message };
    } finally {
        if (lock) {
            try { lock.release(); } catch (_) {}
        }
    }
}

async function analyzeReply(reply) {
    try {
        const sentiment = await classifySentiment(reply.subject, reply.fromName, reply.from);
        const prospectName = reply.fromName || reply.from;

        const outcome = sentiment === "positive" ? "engaged" : sentiment === "negative" ? "disengaged" : "queried";

        learningEngine.recordOutcome(prospectName, reply.from, outcome, sentiment, {
            subject: reply.subject,
            campaignId: reply.campaignId,
            campaignStep: reply.campaignStep,
            source: "email-reply"
        });

        console.log(`[EmailReply] Recorded learning outcome: ${outcome}/${sentiment} from ${reply.from}`);

        const prospect = await matchProspectInCrm(reply.from);
        if (prospect) {
            const newStatus = sentiment === "positive" ? "In Communication" : sentiment === "negative" ? "DNC" : "In Communication";
            await updateCrmStatus(prospect, newStatus);
            console.log(`[EmailReply] Updated CRM: ${prospect["Company Name"] || reply.from} → ${newStatus}`);
        } else {
            console.log(`[EmailReply] No CRM match for ${reply.from}, outcome recorded in learning engine only`);
        }

        activity.append("observed", `Reply analyzed: ${reply.from} → ${sentiment}`, {
            source: "email-reply-learning",
            from: reply.from,
            sentiment,
            outcome,
            crmMatched: !!prospect
        });
    } catch (err) {
        console.warn("[EmailReply] Reply analysis failed:", err.message);
    }
}

async function pauseCampaign(campaignId, reply) {
    try {
        const campaignPath = path.join(__dirname, "../data/agents/well-noticed-campaigns.json");
        const campaigns = readJson(campaignPath, { campaigns: [] });
        const campaignList = campaigns.campaigns || campaigns;
        const campaign = campaignList.find(c => c.id === campaignId);
        if (campaign) {
            campaign.status = "paused-reply";
            campaign.pausedAt = new Date().toISOString();
            campaign.pauseReason = `Reply received from ${reply.from}: "${reply.subject}"`;
            writeJsonAtomic(campaignPath, Array.isArray(campaigns) ? campaignList : { ...campaigns, campaigns: campaignList });
            console.log(`[EmailReply] Paused campaign ${campaignId} due to reply from ${reply.from}`);
        }
    } catch (err) {
        console.error(`[EmailReply] Failed to pause campaign ${campaignId}:`, err.message);
    }
}

async function getReplyStatus() {
    const state = loadState();
    return {
        totalReplies: state.replies.length,
        pausedCampaigns: state.pausedCampaigns.length,
        pausedCampaignIds: state.pausedCampaigns,
        recentReplies: state.replies.slice(-10).reverse(),
        analyzedCount: state.analyzed.length
    };
}

async function startMonitoring(intervalMs = 5 * 60 * 1000) {
    if (monitorInterval) clearInterval(monitorInterval);
    console.log(`[EmailReply] Starting reply monitoring every ${intervalMs / 1000}s`);
    try {
        const result = await checkForReplies();
        if (result.checked) {
            console.log(`[EmailReply] Initial check: ${result.newReplies} new replies`);
        }
    } catch (err) {
        console.error("[EmailReply] Initial check failed:", err.message);
    }
    monitorInterval = setInterval(async () => {
        try {
            const result = await checkForReplies();
            if (result.newReplies > 0) {
                console.log(`[EmailReply] Found ${result.newReplies} new reply/replies`);
            }
        } catch (err) {
            console.error("[EmailReply] Monitor tick error:", err.message);
        }
    }, intervalMs);
}

function stopMonitoring() {
    if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
    }
    if (client && !client.destroyed) {
        client.logout().catch(() => {});
    }
}

module.exports = { checkForReplies, getReplyStatus, startMonitoring, stopMonitoring, pauseCampaign, analyzeReply };
