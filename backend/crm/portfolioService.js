const crm = require("./crmEngine");
const policy = require("../config/avoLanes.json");
const jarvisOpps = require("../agents/jarvisOpportunitiesService");
const projectService = require("../services/avoProjectService");
const avoService = require("../services/avoService");

function stageFor(record) {
    return record.stage || record.status || "unclassified";
}

function laneSummary(venture) {
    if (venture.id === "jarvis-opportunities") {
        const oppsState = jarvisOpps.status();
        const stages = oppsState.metrics.pipeline;
        const records = oppsState.opportunities;
        const avoList = avoService.listAvos();
        const avoMetrics = avoService.metrics();
        const projectStats = projectService.getProjectStats();
        return {
            venture,
            policy: policy.lanes[venture.id],
            metrics: {
                relationships: 0,
                opportunities: oppsState.metrics.totalOpportunities + avoList.length,
                openTasks: oppsState.metrics.totalOpportunities - (stages.revenue || 0) - (stages.learned || 0) + avoList.filter(a => a.status !== "closed" && a.status !== "launched").length,
                pipelineValue: 0
            },
            stages: {
                ...stages,
                projects: projectStats.activeProjects,
                "projects-completed": projectStats.byStatus.completed,
                "avos-identified": avoMetrics.byStatus.identified,
                "avos-active": avoMetrics.byStatus.active,
                "avos-validating": avoMetrics.byStatus.validating,
                "avos-launched": avoMetrics.byStatus.launched
            },
            nextActions: [
                ...records.filter(o => o.stage !== "learned").slice(0, 3).map(o => ({
                    id: o.id,
                    title: `${o.title} — ${o.fitGrade} fit, stage: ${o.stage}`,
                    owner: "jarvis-opportunities-agent"
                })),
                ...avoList.filter(a => a.status === "validating").slice(0, 3).map(a => ({
                    id: a.id,
                    title: `AVO: ${a.title} — cadence complete, needs review`,
                    owner: process.env.JARVIS_OWNER_NAME || "owner"
                }))
            ],
            projects: projectStats,
            avos: { total: avoList.length, byStatus: avoMetrics.byStatus }
        };
    }

    const organizations = crm.getEntity("organizations", venture.id);
    const opportunities = crm.getEntity("opportunities", venture.id);
    const tasks = crm.getEntity("tasks", venture.id);
    const records = [...organizations, ...opportunities];
    const stages = {};
    records.forEach(record => { const stage = stageFor(record); stages[stage] = (stages[stage] || 0) + 1; });
    return {
        venture,
        policy: policy.lanes[venture.id],
        metrics: {
            relationships: organizations.length,
            opportunities: opportunities.length,
            openTasks: tasks.filter(task => !["completed", "cancelled"].includes(task.status)).length,
            pipelineValue: opportunities.reduce((sum, item) => sum + (Number(item.value || item.potentialValue) || 0), 0)
        },
        stages,
        nextActions: [...tasks.filter(task => task.status !== "completed"), ...records.filter(item => item.nextAction)]
            .slice(0, 5).map(item => ({ id: item.id, title: item.title || item.nextAction, owner: item.owner || item.assignedTo || policy.lanes[venture.id].defaultOwner }))
    };
}

function portfolio() {
    const lanes = crm.getVentures().map(laneSummary);
    return {
        contractVersion: policy.version,
        generatedAt: new Date().toISOString(),
        lanes,
        totals: lanes.reduce((result, lane) => ({
            relationships: result.relationships + lane.metrics.relationships,
            opportunities: result.opportunities + lane.metrics.opportunities,
            openTasks: result.openTasks + lane.metrics.openTasks,
            pipelineValue: result.pipelineValue + lane.metrics.pipelineValue
        }), { relationships: 0, opportunities: 0, openTasks: 0, pipelineValue: 0 }),
        boundaries: { crossLaneVisibility: "summary-only by default", automaticMerge: false, externalActions: false }
    };
}

module.exports = { portfolio, laneSummary };
