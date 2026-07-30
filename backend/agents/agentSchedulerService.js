const crypto = require("crypto");
const path = require("path");
const { readJson, writeJsonAtomic } = require("../storage/atomicJsonStore");
const activity = require("../brain/activityService");
const escalations = require("../services/agentEscalationService");
const marketDiscovery = require("./marketDiscoveryAgent");
const wellNoticedCrm = require("./wellNoticedCrmAgent");
const opportunityPilot = require("./opportunityPilotService");
const ventureRevenue = require("./avoRevenueAgentService");
const xodusAgent = require("./xodusMissionAgentService");
const jarvisOpps = require("./jarvisOpportunitiesService");
const control = require("../services/systemControlService");
const approvals = require("../governance/approvalService");
const runTracker = require("../services/runTracker");
const learningEngine = require("../services/learningEngine");
const signalMonitor = require("../services/signalMonitorService");

function schedulerPath() {
    return process.env.JARVIS_SCHEDULER_STATE_PATH || path.join(__dirname, "../data/agents/scheduler-state.json");
}

function loadState() {
    return readJson(schedulerPath(), {
        schedules: [
            {
                id: "market-discovery-weekly",
                name: "Weekly Market Discovery",
                agentId: "market-discovery",
                ventureId: "well-noticed",
                frequency: "weekly",
                dayOfWeek: 1,
                hour: 8,
                minute: 0,
                enabled: true,
                lastRunAt: null,
                nextRunAt: null,
                runCount: 0,
                action: "discover_prospects"
            },
            {
                id: "market-discovery-daily",
                name: "Daily Prospect Discovery",
                agentId: "market-discovery",
                ventureId: "well-noticed",
                frequency: "daily",
                hour: 14,
                minute: 0,
                enabled: true,
                lastRunAt: null,
                nextRunAt: null,
                runCount: 0,
                action: "discover_prospects"
            },
            {
                id: "well-noticed-crm-daily",
                name: "Daily Well Noticed CRM Research",
                agentId: "well-noticed-crm-agent",
                ventureId: "well-noticed",
                frequency: "daily",
                hour: 8,
                minute: 30,
                enabled: true,
                lastRunAt: null,
                nextRunAt: null,
                runCount: 0,
                action: "research_and_qualify"
            },
            {
                id: "opportunity-pilot-daily",
                name: "Daily Opportunity Scan",
                agentId: "opportunity-pilot",
                frequency: "daily",
                hour: 9,
                minute: 0,
                enabled: true,
                lastRunAt: null,
                nextRunAt: null,
                runCount: 0,
                action: "score_opportunity"
            },
            {
                id: "market-discovery-xodus-weekly",
                name: "Xodus Market Research",
                agentId: "market-discovery",
                ventureId: "xodus",
                frequency: "weekly",
                dayOfWeek: 3,
                hour: 8,
                minute: 0,
                enabled: false,
                lastRunAt: null,
                nextRunAt: null,
                runCount: 0,
                action: "discover_prospects"
            },
            {
                id: "avo-revenue-weekly",
                name: "Weekly AVO Pipeline",
                agentId: "avo-revenue",
                frequency: "weekly",
                dayOfWeek: 2,
                hour: 8,
                minute: 0,
                enabled: true,
                lastRunAt: null,
                nextRunAt: null,
                runCount: 0,
                action: "discover_opportunities"
            },
            {
                id: "xodus-mission-weekly",
                name: "Weekly Xodus Mission Research",
                agentId: "xodus-mission",
                frequency: "weekly",
                dayOfWeek: 4,
                hour: 8,
                minute: 0,
                enabled: true,
                lastRunAt: null,
                nextRunAt: null,
                runCount: 0,
                action: "research_lanes"
            },
            {
                id: "jarvis-opportunities-daily",
                name: "Daily Revenue Discovery",
                agentId: "jarvis-opportunities",
                frequency: "daily",
                hour: 7,
                minute: 0,
                enabled: true,
                lastRunAt: null,
                nextRunAt: null,
                runCount: 0,
                action: "discover_opportunities"
            },
            {
                id: "well-noticed-campaign-daily",
                name: "Daily Well Noticed Campaign Progression",
                agentId: "well-noticed-campaign",
                frequency: "daily",
                hour: 10,
                minute: 0,
                enabled: true,
                lastRunAt: null,
                nextRunAt: null,
                runCount: 0,
                action: "advance_campaigns"
            },
            {
                id: "strategic-intel-morning",
                name: "Morning Strategic Intelligence",
                agentId: "strategic-intel",
                frequency: "daily",
                hour: 6,
                minute: 0,
                enabled: true,
                lastRunAt: null,
                nextRunAt: null,
                runCount: 0,
                action: "scan_intelligence"
            },
            {
                id: "jarvis-cadence-daily",
                name: "Daily JARVIS Cadence Progression",
                agentId: "jarvis-cadence",
                frequency: "daily",
                hour: 10,
                minute: 5,
                enabled: true,
                lastRunAt: null,
                nextRunAt: null,
                runCount: 0,
                action: "advance_cadences"
            },
            {
                id: "avo-cadence-daily",
                name: "Daily AVO Cadence Progression",
                agentId: "avo-cadence",
                frequency: "daily",
                hour: 10,
                minute: 10,
                enabled: true,
                lastRunAt: null,
                nextRunAt: null,
                runCount: 0,
                action: "advance_avo_cadences"
            },
            {
                id: "venture-prospecting-daily",
                name: "Daily Well Noticed Prospecting",
                agentId: "venture-prospecting",
                frequency: "daily",
                hour: 9,
                minute: 30,
                enabled: true,
                lastRunAt: null,
                nextRunAt: null,
                runCount: 0,
                action: "run_prospecting"
            },
            {
                id: "market-pulse-daily",
                name: "Daily Market Pulse Scan",
                agentId: "market-pulse",
                frequency: "daily",
                hour: 7,
                minute: 30,
                enabled: true,
                lastRunAt: null,
                nextRunAt: null,
                runCount: 0,
                action: "scan_market_pulse"
            },
            {
                id: "daily-priorities-morning",
                name: "Daily Priorities Briefing",
                agentId: "daily-priorities",
                frequency: "daily",
                hour: 6,
                minute: 15,
                enabled: true,
                lastRunAt: null,
                nextRunAt: null,
                runCount: 0,
                action: "generate_priorities"
            },
            {
                id: "avo-ideation-weekly",
                name: "Weekly AVO Ideation",
                agentId: "avo-ideation",
                frequency: "weekly",
                dayOfWeek: 1,
                hour: 7,
                minute: 0,
                enabled: true,
                lastRunAt: null,
                nextRunAt: null,
                runCount: 0,
                action: "generate_ideas"
            },
            {
                id: "avo-project-executor-hourly",
                name: "Hourly AVO Project Execution",
                agentId: "avo-project-executor",
                frequency: "hourly",
                hour: 0,
                minute: 0,
                enabled: true,
                lastRunAt: null,
                nextRunAt: null,
                runCount: 0,
                action: "execute_projects"
            },
            {
                id: "chief-of-staff-daily",
                name: "Daily Chief of Staff Review",
                agentId: "chief-of-staff",
                frequency: "daily",
                hour: 7,
                minute: 0,
                enabled: true,
                lastRunAt: null,
                nextRunAt: null,
                runCount: 0,
                action: "run_staff_review"
            },
            {
                id: "signal-monitor-hourly",
                name: "Hourly External Signal Scan",
                agentId: "signal-monitor",
                frequency: "hourly",
                hour: 0,
                minute: 0,
                enabled: true,
                lastRunAt: null,
                nextRunAt: null,
                runCount: 0,
                action: "scan_signals"
            },
            {
                id: "crm-enrichment-weekly",
                name: "Weekly CRM Stale Enrichment",
                agentId: "crm-sweep",
                frequency: "weekly",
                dayOfWeek: 6,
                hour: 9,
                minute: 0,
                enabled: true,
                lastRunAt: null,
                nextRunAt: null,
                runCount: 0,
                action: "sweep_crm"
            },
            {
                id: "crm-profile-daily",
                name: "Daily CRM Profile",
                agentId: "crm-profile",
                frequency: "daily",
                hour: 5,
                minute: 0,
                enabled: true,
                lastRunAt: null,
                nextRunAt: null,
                runCount: 0,
                action: "profile_crm"
            }
        ],
        runs: [],
        findings: []
    });
}

function saveState(state) {
    return writeJsonAtomic(schedulerPath(), state);
}

function calculateNextRun(schedule) {
    const now = new Date();
    const next = new Date(now);
    next.setHours(schedule.hour || 8, schedule.minute || 0, 0, 0);

    if (schedule.frequency === "daily") {
        if (next <= now) next.setDate(next.getDate() + 1);
    } else if (schedule.frequency === "weekly") {
        const targetDay = schedule.dayOfWeek || 1;
        while (next.getDay() !== targetDay || next <= now) {
            next.setDate(next.getDate() + 1);
        }
    } else if (schedule.frequency === "hourly") {
        if (next <= now) next.setHours(next.getHours() + 1);
    }

    return next.toISOString();
}

async function runSchedule(scheduleId, actor) {
    if (control.status().stopped) throw new Error("Global emergency stop is active");

    const state = loadState();
    const schedule = state.schedules.find(s => s.id === scheduleId);
    if (!schedule) {
        const error = new Error("Schedule not found");
        error.statusCode = 404;
        throw error;
    }
    if (!schedule.enabled) {
        const error = new Error("Schedule is disabled");
        error.statusCode = 409;
        throw error;
    }

    let result = null;
    let outcome = "completed";

    try {
        if (schedule.agentId === "market-discovery") {
            result = await marketDiscovery.discoverAndSubmit(schedule.ventureId || "well-noticed", { maxPerQuery: 5, actor: actor || "scheduler" });
        } else if (schedule.agentId === "well-noticed-crm-agent") {
            result = await wellNoticedCrm.runProspecting(actor || "scheduler");
        } else if (schedule.agentId === "opportunity-pilot") {
            result = await opportunityPilot.discoverAndSubmit({ actor: actor || "scheduler" });
        } else if (schedule.agentId === "avo-revenue") {
            const vrResult = await ventureRevenue.discoverAndSubmit({ actor: actor || "scheduler" });
            result = vrResult;
        } else if (schedule.agentId === "xodus-mission") {
            const xdResult = await xodusAgent.runResearchAndSubmit({ actor: actor || "scheduler" });
            result = xdResult;
        } else if (schedule.agentId === "jarvis-opportunities") {
            const joResult = await jarvisOpps.discoverAndSubmit({ actor: actor || "scheduler" });
            result = { ...joResult, newProspects: joResult.discovered };
        } else if (schedule.agentId === "well-noticed-campaign") {
            const campaignSvc = require("../services/wellNoticedCampaignService");
            const due = campaignSvc.getCampaignsDue();
            const executed = [];
            for (const c of due) {
                if (!c.pendingStep) continue;
                try {
                    campaignSvc.advanceCampaign(c.id);
                    await campaignSvc.executeStep(c.id, c.pendingStep.step);
                    executed.push({ id: c.id, prospect: c.prospectName, step: c.pendingStep.name, status: "sent" });
                } catch (err) {
                    executed.push({ id: c.id, prospect: c.prospectName, step: c.pendingStep?.name, status: "error", error: err.message });
                }
            }
            result = { campaignsProcessed: due.length, executed: executed.length, campaigns: executed };
        } else if (schedule.agentId === "strategic-intel") {
            const intelService = require("../services/strategicIntelligenceService");
            const intelResult = await intelService.runIntelligenceScan();
            result = { insights: intelResult.insights.length, lastRun: intelResult.lastRun };
        } else if (schedule.agentId === "jarvis-cadence") {
            const jarvisCadence = require("../services/jarvisCadenceService");
            const due = jarvisCadence.getCadencesDue();
            const executed = [];
            for (const c of due) {
                try {
                    await jarvisCadence.advanceCadence(c.id);
                    executed.push({ id: c.id, prospect: c.companyName, step: c.currentStep, status: "sent" });
                } catch (err) {
                    executed.push({ id: c.id, prospect: c.companyName, step: c.currentStep, status: "error", error: err.message });
                }
            }
            result = { cadencesProcessed: due.length, executed: executed.length, cadences: executed };
        } else if (schedule.agentId === "avo-cadence") {
            const avoService = require("../services/avoService");
            const due = avoService.getAvosDue();
            const executed = [];
            for (const a of due) {
                try {
                    await avoService.advanceCadence(a.id);
                    executed.push({ id: a.id, avo: a.title, step: a.cadence.currentStep, status: "sent" });
                } catch (err) {
                    executed.push({ id: a.id, avo: a.title, step: a.cadence.currentStep, status: "error", error: err.message });
                }
            }
            result = { avosProcessed: due.length, executed: executed.length, avos: executed };
        } else if (schedule.agentId === "venture-prospecting") {
            const vpService = require("../services/ventureProspectingService");
            const vpResult = await vpService.runProspecting({ actor: actor || "scheduler" });
            result = { ...vpResult, newProspects: vpResult.qualified };
        } else if (schedule.agentId === "market-pulse") {
            const mpService = require("../agents/marketPulseAgent");
            const mpResult = await mpService.runMarketPulse(actor || "scheduler");
            result = { newFound: mpResult.newFound, totalFound: mpResult.totalFound, categories: mpResult.categories };
        } else if (schedule.agentId === "daily-priorities") {
            const dpService = require("../services/dailyPrioritiesService");
            const priorities = dpService.generateDailyPriorities();
            result = { prioritiesGenerated: true, topPriority: priorities.priorities?.[0]?.title || "none" };
        } else if (schedule.agentId === "avo-ideation") {
            const viService = require("../services/avoIdeationService");
            const viResult = await viService.generateIdeas();
            result = { ideasGenerated: viResult.count || 0, topIdea: viResult.ideas?.[0]?.title || "none", error: viResult.error };
        } else if (schedule.agentId === "avo-project-executor") {
            const executor = require("../services/avoProjectExecutorService");
            const execResult = await executor.executeAllProjects(actor || "scheduler");
            result = { projectsProcessed: execResult.projectsProcessed, ok: execResult.results.filter(r => r.status === "completed").length, errors: execResult.results.filter(r => r.status === "error").length };
        } else if (schedule.agentId === "chief-of-staff") {
            const cos = require("../agents/chiefOfStaffOperationsService");
            const runResult = await cos.run(actor || "scheduler");
            result = { agentsReviewed: runResult.agentsReviewed, alertsPrepared: runResult.alertsPrepared, handoffsPrepared: runResult.handoffsPrepared, reasoningGenerated: !!runResult.llmReasoning };
        } else if (schedule.agentId === "signal-monitor") {
            const signals = await signalMonitor.runScan();
            result = { signalsFound: signals.length, signals };
        } else if (schedule.agentId === "crm-sweep") {
            const sweepResult = await require("../services/crmSweepService").runSweep();
            result = { processed: sweepResult.processed, enriched: sweepResult.enriched };
        } else if (schedule.agentId === "crm-profile") {
            const repo = wellNoticedCrm.getRepository ? wellNoticedCrm.getRepository() : null;
            if (repo) {
                const profile = await learningEngine.crmProfile(repo);
                result = { profiled: true, total: profile?.total || 0 };
            } else {
                result = { profiled: false, reason: "no-repository" };
            }
        } else {
            outcome = "unknown-agent";
        }
    } catch (error) {
        outcome = `error: ${error.message}`;
        escalations.raise(schedule.agentId, "error",
            `Scheduled run failed: ${error.message}`,
            { scheduleId, agentId: schedule.agentId, error: error.message },
            "critical"
        );
    }

    const run = {
        id: crypto.randomUUID(),
        scheduleId,
        agentId: schedule.agentId,
        runAt: new Date().toISOString(),
        actor: actor || "scheduler",
        outcome,
        findingsCount: result?.newProspects || result?.candidates?.length || 0,
        result: result ? { summary: `Discovered ${result.newProspects || result.candidates?.length || 0} items` } : null
    };

    schedule.lastRunAt = run.runAt;
    schedule.nextRunAt = calculateNextRun(schedule);
    schedule.runCount = (schedule.runCount || 0) + 1;
    state.runs.push(run);
    state.runs = state.runs.slice(-500);

    const discoveryActions = ["research_and_qualify", "discover_prospects", "run_prospecting", "discover_opportunities", "scan_market_pulse", "score_opportunity"];
    if (discoveryActions.includes(schedule.action) && run.findingsCount === 0 && schedule.runCount >= 3) {
        const recentRuns = state.runs.filter(r => r.scheduleId === scheduleId).slice(-3);
        if (recentRuns.length >= 3 && recentRuns.every(r => r.findingsCount === 0)) {
            schedule.enabled = false;
            outcome += " (auto-paused: 3 empty runs)";
            run.outcome = outcome;
            activity.append("observed", `Auto-paused ${schedule.name}: 3 consecutive empty runs`, {
                source: "agent-scheduler", scheduleId, agentId: schedule.agentId, severity: "info"
            });
        }
    }

    if (result?.prospects) {
        state.findings.push(...result.prospects.map(p => ({
            ...p,
            scheduleId,
            foundAt: run.runAt
        })));
        state.findings = state.findings.slice(-500);
    }

    saveState(state);
    activity.append("prepared", `Agent scheduler ran ${schedule.name}: ${outcome}`, {
        source: "agent-scheduler",
        scheduleId,
        agentId: schedule.agentId,
        findingsCount: run.findingsCount
    });

    try {
        const r = result || {};
        const prospects = r.prospects || r.newProspects || r.candidates || [];
        const qualified = prospects.filter ? prospects.filter(p => (p.fitScore || 0) >= 40).length : 0;
        const scores = prospects.filter ? prospects.map(p => p.fitScore || 0).filter(Boolean) : [];
        runTracker.recordRun(schedule.agentId, schedule.name, {
            discovered: r.discovered || prospects.length || 0,
            qualified,
            enriched: r.enriched || 0,
            submitted: r.submitted || r.newProspects?.length || 0,
            avgFitScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
            topFitScore: scores.length > 0 ? Math.max(...scores) : 0,
            duration: 0
        });
    } catch {}

    return run;
}

function getSchedules() {
    const state = loadState();
    return state.schedules.map(s => ({
        ...s,
        nextRunAt: s.enabled ? calculateNextRun(s) : null
    }));
}

function toggleSchedule(scheduleId, enabled, actor) {
    const state = loadState();
    const schedule = state.schedules.find(s => s.id === scheduleId);
    if (!schedule) {
        const error = new Error("Schedule not found");
        error.statusCode = 404;
        throw error;
    }
    schedule.enabled = enabled;
    schedule.nextRunAt = enabled ? calculateNextRun(schedule) : null;
    schedule.updatedAt = new Date().toISOString();
    schedule.updatedBy = actor;
    saveState(state);
    activity.append("observed", `Schedule ${schedule.name} ${enabled ? "enabled" : "disabled"}`, { source: "agent-scheduler" });
    return schedule;
}

function getRecentRuns(limit) {
    const state = loadState();
    return state.runs.slice().reverse().slice(0, Math.min(limit || 20, 100));
}

function getFindings(options) {
    const state = loadState();
    let findings = state.findings.slice().reverse();
    if (options?.ventureId) {
        findings = findings.filter(f => f.ventureId === options.ventureId);
    }
    if (options?.fitGrade) {
        findings = findings.filter(f => f.fitGrade === options.fitGrade);
    }
    return findings.slice(0, Math.min(options?.limit || 50, 200));
}

function status() {
    const state = loadState();
    const enabledCount = state.schedules.filter(s => s.enabled).length;
    const totalRuns = state.runs.length;
    const recentRuns = state.runs.slice(-10).reverse();

    return {
        agent: { id: "agent-scheduler", name: "Agent Scheduler", version: "1.0" },
        metrics: {
            totalSchedules: state.schedules.length,
            enabledSchedules: enabledCount,
            totalRuns,
            totalFindings: state.findings.length,
            highFitFindings: state.findings.filter(f => f.fitGrade === "high").length
        },
        schedules: getSchedules(),
        recentRuns,
        boundaries: { externalActions: false, humanApprovalRequired: true, maximumBudget: 0 }
    };
}

let tickRunning = false;

async function tick() {
    if (control.status().stopped) return { skipped: true, reason: "emergency-stop" };
    if (tickRunning) return { skipped: true, reason: "already-running" };
    tickRunning = true;

    const state = loadState();
    const now = new Date();
    const results = [];

    for (const schedule of state.schedules) {
        if (!schedule.enabled) continue;

        const scheduledTime = new Date(now);
        scheduledTime.setHours(schedule.hour || 8, schedule.minute || 0, 0, 0);

        if (schedule.frequency === "daily") {
            const lastRun = schedule.lastRunAt ? new Date(schedule.lastRunAt) : null;
            const alreadyRanToday = lastRun && lastRun.toDateString() === now.toDateString() && lastRun >= scheduledTime;
            if (!alreadyRanToday && now >= scheduledTime) {
                try {
                    const run = await runSchedule(schedule.id, "scheduler-tick");
                    results.push({ scheduleId: schedule.id, name: schedule.name, outcome: run.outcome });
                } catch (error) {
                    results.push({ scheduleId: schedule.id, name: schedule.name, outcome: `error: ${error.message}` });
                }
            }
        } else if (schedule.frequency === "weekly") {
            const targetDay = schedule.dayOfWeek || 1;
            const isTargetDay = now.getDay() === targetDay;
            if (isTargetDay && now >= scheduledTime) {
                const lastRun = schedule.lastRunAt ? new Date(schedule.lastRunAt) : null;
                const alreadyRanToday = lastRun && lastRun.toDateString() === now.toDateString();
                if (!alreadyRanToday) {
                    try {
                        const run = await runSchedule(schedule.id, "scheduler-tick");
                        results.push({ scheduleId: schedule.id, name: schedule.name, outcome: run.outcome });
                    } catch (error) {
                        results.push({ scheduleId: schedule.id, name: schedule.name, outcome: `error: ${error.message}` });
                    }
                }
            } else if (!isTargetDay && schedule.lastRunAt) {
                const lastRun = new Date(schedule.lastRunAt);
                const daysSince = Math.floor((now - lastRun) / 86400000);
                if (daysSince >= 7) {
                    try {
                        const run = await runSchedule(schedule.id, "scheduler-tick-catchup");
                        results.push({ scheduleId: schedule.id, name: schedule.name, outcome: run.outcome + " (catch-up)" });
                    } catch (error) {
                        results.push({ scheduleId: schedule.id, name: schedule.name, outcome: `error: ${error.message}` });
                    }
                }
            }
        }
    }

    tickRunning = false;
    return { checked: state.schedules.length, ran: results.length, results };
}

module.exports = { runSchedule, getSchedules, toggleSchedule, getRecentRuns, getFindings, status, calculateNextRun, tick };
