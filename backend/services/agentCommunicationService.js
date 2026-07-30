const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../data/agents");
const STATE_FILE = path.join(DATA_DIR, "agent-communication.json");

function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
        }
    } catch (e) {
        console.error("Failed to load agent communication state:", e.message);
    }
    return { messages: [], contextShares: [] };
}

function saveState(state) {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (e) {
        console.error("Failed to save agent communication state:", e.message);
    }
}

function shareContext(fromAgent, toAgent, topic, message, context) {
    const state = loadState();
    const share = {
        id: `share-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        from: fromAgent,
        to: toAgent,
        topic,
        message,
        context: context || {},
        sharedAt: new Date().toISOString(),
        read: false
    };
    state.contextShares.push(share);
    state.contextShares = state.contextShares.slice(-500);
    saveState(state);
    return share;
}

function broadcast(fromAgent, topic, message, context) {
    const agents = ["venture-revenue-agent", "well-noticed-campaign", "content", "research", "xodus-mission-partnership-agent", "chief-of-staff"];
    const shares = [];
    for (const agent of agents) {
        if (agent !== fromAgent) {
            shares.push(shareContext(fromAgent, agent, topic, message, context));
        }
    }
    return shares;
}

function getMessagesForAgent(agentId) {
    return loadState().contextShares.filter(s => s.to === agentId || s.to === "all");
}

function getUnreadForAgent(agentId) {
    return loadState().contextShares.filter(s => (s.to === agentId || s.to === "all") && !s.read);
}

function markRead(shareId) {
    const state = loadState();
    const share = state.contextShares.find(s => s.id === shareId);
    if (share) {
        share.read = true;
        saveState(state);
    }
    return share;
}

function status() {
    const state = loadState();
    const shares = state.contextShares || [];
    const unread = shares.filter(s => !s.read);
    return {
        totalMessages: shares.length,
        unreadMessages: unread.length,
        byAgent: shares.reduce((acc, s) => {
            acc[s.from] = (acc[s.from] || 0) + 1;
            return acc;
        }, {}),
        recentShares: shares.slice(-10).reverse()
    };
}

module.exports = { shareContext, broadcast, getMessagesForAgent, getUnreadForAgent, markRead, status };
