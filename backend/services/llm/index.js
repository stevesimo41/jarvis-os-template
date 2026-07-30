const geminiProvider = require("./gemini");
const openaiProvider = require("./openai");
const duckaiProvider = require("./duckai");
const ollamaProvider = require("./ollama");
const groqProvider = require("./groq");
const { getTools, getToolMap } = require("./tools");

const MAX_TOOL_ROUNDS = 5;

const FALLBACK_CHAIN = {
    ollama: ["ollama", "groq", "gemini"],
    gemini: ["gemini", "groq", "duckai"],
    openai: ["openai", "groq", "gemini"],
    duckai: ["duckai", "groq", "gemini"],
    groq: ["groq", "ollama", "gemini"]
};

const providers = {
    gemini: geminiProvider,
    openai: openaiProvider,
    duckai: duckaiProvider,
    ollama: ollamaProvider,
    groq: groqProvider
};

function getProvider() {
    const name = process.env.JARVIS_LLM_PROVIDER || "groq";
    const provider = providers[name];
    if (!provider) {
        throw new Error(`Unknown LLM provider "${name}". Available: ${Object.keys(providers).join(", ")}`);
    }
    return { provider, name };
}

function getFallbackProviders() {
    const name = process.env.JARVIS_LLM_PROVIDER || "groq";
    return FALLBACK_CHAIN[name] || [name, "gemini"];
}

function loadPrompt(agentId) {
    const fs = require("fs");
    const path = require("path");
    const promptsDir = path.resolve(__dirname, "../../../prompts");
    const promptFiles = {
        "chief-of-staff": "chief-of-staff-system-prompt.md",
        "venture-studio": "venture-studio-system-prompt.md",
        "research": "research-system-prompt.md",
        "investment": "investment-system-prompt.md",
        "content": "content-agent-system-prompt.md"
    };
    const fileName = promptFiles[agentId];
    if (!fileName) return null;
    const filePath = path.join(promptsDir, fileName);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, "utf8");
}

function buildJarvisSystemPrompt(agentId, context) {
    const agentPrompt = agentId ? loadPrompt(agentId) : null;
    const basePrompt = [
        "You are JARVIS, your executive AI operating system.",
        "You serve as Chief of Staff, research department, business intelligence platform, and strategic advisor.",
        "Lead with the answer. Use plain language. Be direct and actionable.",
        "Use tools when you need to look up data, search the web, or take action.",
        "Never claim to have executed actions that require human approval.",
        "Any consequential action or data mutation must go through JARVIS governance.",
        "When asked about your health, capabilities, gaps, or what you're lacking, use the self_diagnose tool to run a system check and report the results.",
        "Report the diagnostic as a quick status: green (healthy), yellow (needs attention), or red (broken) per subsystem, with a one-line summary.",
        context ? `\nLocal JARVIS context:\n${JSON.stringify(context).slice(0, 4000)}` : ""
    ].filter(Boolean).join("\n");

    if (agentPrompt) {
        return `${basePrompt}\n\n---\n\nYou are currently operating as the ${agentId} agent. Follow these specialized instructions:\n\n${agentPrompt}`;
    }
    return basePrompt;
}

async function complete({ systemPrompt, messages, tools, context, maxRounds }) {
    const rounds = maxRounds || MAX_TOOL_ROUNDS;
    const toolList = tools !== false ? getTools() : [];
    const toolMap = getToolMap();
    const chain = getFallbackProviders();
    let lastError = null;

    for (const providerName of chain) {
        const provider = providers[providerName];
        if (!provider) continue;

        try {
            let currentMessages = [...messages];
            let totalRounds = 0;
            let lastResult = null;

            while (totalRounds < rounds) {
                totalRounds++;
                lastResult = await provider.complete({
                    systemPrompt,
                    messages: currentMessages,
                    tools: toolList.length ? toolList : undefined,
                    context
                });

                if (!lastResult.toolCalls || !lastResult.toolCalls.length || lastResult.finishReason !== "tool_calls") {
                    break;
                }

                for (const toolCall of lastResult.toolCalls) {
                    const tool = toolMap[toolCall.name];
                    let toolResult;
                    if (tool && tool.execute) {
                        try {
                            toolResult = await tool.execute(toolCall.arguments);
                        } catch (error) {
                            toolResult = { error: error.message };
                        }
                    } else {
                        toolResult = { error: `Unknown tool: ${toolCall.name}` };
                    }

                    currentMessages.push({
                        role: "assistant",
                        content: lastResult.text || `[Called tool: ${toolCall.name}]`
                    });
                    currentMessages.push({
                        role: "user",
                        content: `Tool result for ${toolCall.name}: ${JSON.stringify(toolResult)}`
                    });
                }
            }

            return {
                text: lastResult.text || "",
                provider: lastResult.provider || providerName,
                model: lastResult.model,
                toolCallsMade: totalRounds - 1,
                finishReason: lastResult.finishReason
            };
        } catch (error) {
            console.warn(`LLM provider "${providerName}" failed:`, error.message);
            lastError = error;
            continue;
        }
    }

    throw lastError || new Error("All LLM providers failed");
}

function status() {
    const name = process.env.JARVIS_LLM_PROVIDER || "groq";
    let hasKey;

    if (name === "ollama") {
        const ollamaStatus = ollamaProvider.status();
        hasKey = ollamaStatus.localAvailable || ollamaStatus.cloudAvailable;
    } else if (name === "openai") {
        hasKey = !!process.env.OPENAI_API_KEY;
    } else if (name === "duckai") {
        hasKey = true;
    } else if (name === "groq") {
        hasKey = !!process.env.GROQ_API_KEY;
    } else {
        hasKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);
    }

    const modelMap = {
        ollama: process.env.JARVIS_LLM_MODEL_LOCAL || "llama3.2:3b",
        openai: process.env.JARVIS_LLM_MODEL || "gpt-4o-mini",
        duckai: process.env.JARVIS_LLM_MODEL || "gpt-4o-mini",
        gemini: process.env.JARVIS_LLM_MODEL || "gemini-2.0-flash-lite",
        groq: process.env.JARVIS_GROQ_MODEL || "llama-3.1-8b-instant"
    };

    return {
        provider: name,
        model: modelMap[name] || "unknown",
        configured: hasKey,
        fallbackChain: getFallbackProviders(),
        toolsAvailable: getTools().map(t => t.name),
        maxToolRounds: MAX_TOOL_ROUNDS
    };
}

module.exports = { complete, loadPrompt, buildJarvisSystemPrompt, status };
