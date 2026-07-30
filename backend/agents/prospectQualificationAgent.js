function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .trim();
}

function classifyProspect(prospect) {

    const reasons = [];
    let score = Number(
        prospect.fitScore || 0
    );

    const industry =
        normalizeText(
            prospect.industry
        );

    const description =
        normalizeText(
            prospect.description
        );

    const homeownerIndustries = [
        "home services",
        "roofing",
        "hvac",
        "plumbing",
        "electrical",
        "landscaping",
        "hardscaping",
        "pool",
        "pools",
        "outdoor living",
        "windows",
        "doors",
        "siding",
        "solar",
        "home security",
        "smart home",
        "custom builder",
        "home builder",
        "remodeling",
        "kitchen remodeling",
        "bathroom remodeling",
        "basement finishing",
        "interior design",
        "architecture",
        "flooring",
        "cabinetry",
        "countertops",
        "appliance",
        "furniture",
        "pest control",
        "water treatment",
        "generators",
        "garage doors",
        "concrete",
        "tree service"
    ];

    const highValueIndicators = [
        "luxury",
        "premium",
        "custom",
        "high end",
        "high-end",
        "designer",
        "estate",
        "whole home",
        "renovation",
        "remodel",
        "installation",
        "replacement",
        "construction"
    ];

    const homeownerRelevant =
        homeownerIndustries.some(
            item =>
                industry.includes(item)
        );

    if (homeownerRelevant) {

        score += 15;

        reasons.push(
            "Industry has direct homeowner relevance"
        );
    }

    const highValueMatch =
        highValueIndicators.some(
            item =>
                industry.includes(item) ||
                description.includes(item)
        );

    if (highValueMatch) {

        score += 10;

        reasons.push(
            "Business appears positioned around higher value services"
        );
    }

    if (
        prospect.website &&
        prospect.website.length > 0
    ) {

        score += 5;

        reasons.push(
            "Public website available for research"
        );
    }

    if (
        prospect.city &&
        prospect.state
    ) {

        score += 5;

        reasons.push(
            "Geographic information available"
        );
    }

    let priority =
        "low";

    if (score >= 80) {
        priority = "high";
    } else if (score >= 60) {
        priority = "medium";
    }

    let recommendation =
        "monitor";

    if (priority === "high") {
        recommendation =
            "recommend_for_research";
    }

    if (priority === "medium") {
        recommendation =
            "research_if_capacity_allows";
    }

    return {
        ...prospect,

        qualificationScore:
            score,

        qualificationPriority:
            priority,

        qualificationRecommendation:
            recommendation,

        qualificationReasons:
            reasons
    };
}

function qualifyProspects(
    prospects = []
) {

    const qualified =
        prospects.map(
            prospect =>
                classifyProspect(
                    prospect
                )
        );

    qualified.sort(
        (a, b) =>
            b.qualificationScore -
            a.qualificationScore
    );

    return {
        count:
            qualified.length,

        prospects:
            qualified,

        recommended:
            qualified.filter(
                prospect =>
                    prospect.qualificationRecommendation ===
                    "recommend_for_research"
            ),

        status:
            "qualified"
    };
}

module.exports = {
    classifyProspect,
    qualifyProspects
};
