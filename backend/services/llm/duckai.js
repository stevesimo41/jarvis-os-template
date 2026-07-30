const { createHash } = require("crypto");

let _JSDOM = null;
function getJSDOM() {
    if (!_JSDOM) {
        _JSDOM = require("jsdom").JSDOM;
    }
    return _JSDOM;
}

const MODELS = {
    "gpt-4o-mini": "gpt-4o-mini",
    "gpt-5-mini": "gpt-5-mini",
    "claude": "claude-3-5-haiku-latest",
    "claude-haiku": "claude-3-5-haiku-latest",
    "llama": "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    "mistral": "mistralai/Mistral-Small-24B-Instruct-2501",
    "gpt-oss": "openai/gpt-oss-120b"
};

const DEFAULT_MODEL = "gpt-4o-mini";
const BASE = "https://duckduckgo.com";
const CHAT_URL = `${BASE}/duckchat/v1/chat`;
const STATUS_URL = `${BASE}/duckchat/v1/status`;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";

function baseHeaders() {
    return {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "priority": "u=0, i",
        "sec-ch-ua": '"Not)A;Brand";v="8", "Chromium";v=138, "Brave";v=138',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "sec-gpc": "1",
        "upgrade-insecure-requests": "1",
        "user-agent": UA
    };
}

async function getVqdHash(userAgent) {
    const statusRes = await fetch(STATUS_URL, {
        method: "GET",
        headers: {
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "no-store",
            "pragma": "no-cache",
            "priority": "u=1, i",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-vqd-accept": "1",
            "User-Agent": userAgent
        },
        referrer: "https://duckduckgo.com/",
        referrerPolicy: "origin",
        credentials: "include"
    });

    if (!statusRes.ok) throw new Error(`Failed to get VQD: ${statusRes.status}`);
    const vqdHash = statusRes.headers.get("x-vqd-hash-1") || statusRes.headers.get("x-Vqd-hash-1");
    if (!vqdHash) throw new Error("Missing x-vqd-hash-1 header");
    return vqdHash;
}

async function solveVqdHash(vqdHashB64) {
    const jsScript = Buffer.from(vqdHashB64, "base64").toString("utf-8");
    const JSDOM = getJSDOM();
    const dom = new JSDOM(`<iframe id="jsa" sandbox="allow-scripts allow-same-origin" srcdoc="<!DOCTYPE html>
<html>
<head>
<meta http-equiv="Content-Security-Policy"; content="default-src 'none'; script-src 'unsafe-inline'">
</head>
<body></body>
</iframe>" style="position: absolute; left: -9999px; top: -9999px;"></iframe>`, {
        runScripts: "dangerously"
    });

    dom.window.top.__DDG_BE_VERSION__ = 1;
    dom.window.top.__DDG_FE_CHAT_HASH__ = 1;
    const jsa = dom.window.top.document.querySelector("#jsa");
    const contentDoc = jsa.contentDocument || jsa.contentWindow.document;
    const meta = contentDoc.createElement("meta");
    meta.setAttribute("http-equiv", "Content-Security-Policy");
    meta.setAttribute("content", "default-src 'none'; script-src 'unsafe-inline';");
    contentDoc.head.appendChild(meta);

    const result = await dom.window.eval(jsScript);
    if (!result || !result.client_hashes) { dom.window.close(); return null; }

    result.client_hashes[0] = UA;
    result.client_hashes = result.client_hashes.map(h =>
        createHash("sha256").update(h).digest("base64")
    );

    dom.window.close();
    return Buffer.from(JSON.stringify(result)).toString("base64");
}

function resolveModel(name) {
    if (!name) return DEFAULT_MODEL;
    return MODELS[name.toLowerCase()] || name;
}

async function chat(messages, model, options = {}) {
    const resolvedModel = resolveModel(model);
    const userAgent = UA;

    const vqdHash = await getVqdHash(userAgent);
    const solvedHash = await solveVqdHash(vqdHash);
    if (!solvedHash) throw new Error("Failed to solve x-vqd-hash-1 challenge");

    const chatHeaders = {
        "accept": "text/event-stream",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        "pragma": "no-cache",
        "priority": "u=1, i",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-fe-version": "serp_20250401_100419_ET-19d438eb199b2bf7c300",
        "User-Agent": userAgent,
        "x-vqd-hash-1": solvedHash
    };

    const formattedMessages = messages.map(m => ({
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        role: m.role
    }));

    const body = {
        model: resolvedModel,
        messages: formattedMessages,
        canUseTools: options.tools || false,
        metadata: {
            toolChoice: {
                NewsSearch: false,
                VideosSearch: false,
                LocalSearch: false,
                WeatherForecast: false
            }
        }
    };

    const chatRes = await fetch(CHAT_URL, {
        method: "POST",
        headers: chatHeaders,
        referrer: "https://duckduckgo.com/",
        referrerPolicy: "origin",
        credentials: "include",
        body: JSON.stringify(body)
    });

    if (!chatRes.ok) {
        const errText = await chatRes.text().catch(() => "");
        throw new Error(`DuckDuckGo chat error ${chatRes.status}: ${errText.slice(0, 200)}`);
    }

    const reader = chatRes.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
            if (!line || line === "data: [DONE]") continue;
            const payload = line.replace(/^data:\s*/, "");
            try {
                const obj = JSON.parse(payload);
                if (obj.message) fullText += obj.message;
            } catch (_e) { /* skip malformed lines */ }
        }
    }

    return {
        text: fullText,
        provider: "duckai",
        model: resolvedModel,
        finishReason: "stop"
    };
}

function status() {
    return {
        provider: "duckai",
        model: DEFAULT_MODEL,
        configured: true,
        note: "Free — no API key required. Rate limited by DuckDuckGo."
    };
}

async function complete({ systemPrompt, messages, tools, context }) {
    const allMessages = [];
    if (systemPrompt) {
        allMessages.push({ role: "user", content: systemPrompt });
        allMessages.push({ role: "assistant", content: "Understood. I will follow these instructions." });
    }
    for (const m of messages) {
        allMessages.push({ role: m.role, content: m.content || "" });
    }

    const result = await chat(allMessages, process.env.JARVIS_LLM_MODEL || DEFAULT_MODEL, { tools: false });
    return {
        text: result.text,
        provider: "duckai",
        model: result.model,
        finishReason: "stop",
        toolCalls: null
    };
}

module.exports = { chat, complete, status, resolveModel, MODELS, DEFAULT_MODEL };
