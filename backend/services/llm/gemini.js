const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

function getApiKey() {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is required for the Gemini provider");
    return key;
}

function getModel() {
    return process.env.JARVIS_LLM_MODEL || "gemini-2.0-flash-lite";
}

function buildGeminiTools(tools) {
    if (!tools || !tools.length) return undefined;
    return [{
        functionDeclarations: tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
        }))
    }];
}

function buildContents(messages) {
    const contents = [];
    for (const msg of messages) {
        if (msg.role === "user") {
            contents.push({ role: "user", parts: [{ text: msg.content }] });
        } else if (msg.role === "assistant") {
            contents.push({ role: "model", parts: [{ text: msg.content }] });
        }
    }
    return contents;
}

function extractText(payload) {
    const candidates = payload.candidates || [];
    if (!candidates.length) return "";
    const parts = candidates[0].content?.parts || [];
    return parts
        .filter(p => p.text)
        .map(p => p.text)
        .join("\n")
        .trim();
}

function extractToolCalls(payload) {
    const candidates = payload.candidates || [];
    if (!candidates.length) return [];
    const parts = candidates[0].content?.parts || [];
    return parts
        .filter(p => p.functionCall)
        .map(p => ({
            id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: p.functionCall.name,
            arguments: p.functionCall.args || {}
        }));
}

function mapFinishReason(payload) {
    const candidate = (payload.candidates || [])[0];
    const reason = candidate?.finishReason;
    if (reason === "STOP") return "stop";
    if (reason === "MAX_TOKENS") return "length";
    return reason || "stop";
}

async function complete({ systemPrompt, messages, tools, context }) {
    const apiKey = getApiKey();
    const model = getModel();
    const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: buildContents(messages),
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096
        }
    };

    if (tools && tools.length) {
        requestBody.tools = buildGeminiTools(tools);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Gemini API ${response.status}: ${body.slice(0, 200)}`);
        }

        const payload = await response.json();
        return {
            text: extractText(payload),
            toolCalls: extractToolCalls(payload),
            finishReason: mapFinishReason(payload),
            provider: "gemini",
            model
        };
    } finally {
        clearTimeout(timer);
    }
}

module.exports = { complete };
