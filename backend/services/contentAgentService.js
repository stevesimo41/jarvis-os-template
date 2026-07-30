const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data", "agents");
const STATE_FILE = path.join(DATA_DIR, "content-agent.json");

const VENTURE_BRANDS = {
    "well-noticed": {
        name: "Well Noticed",
        tone: "professional, warm, community-focused",
        audience: "Central Ohio business owners, affluent households",
        platforms: ["linkedin", "facebook", "instagram"],
        keywords: ["print marketing", "direct mail", "Central Ohio", "luxury households", "category exclusive", " measurable results"]
    },
    "xodus": {
        name: "Xodus Recovery Pathways",
        tone: "compassionate, hopeful, mission-driven",
        audience: "individuals in recovery, families, community partners",
        platforms: ["facebook", "instagram", "linkedin"],
        keywords: ["recovery", "sobriety", "community", "hope", "healing", "second chance"]
    },
    "real-estate": {
        name: "Real Estate",
        tone: "professional, trustworthy, market-savvy",
        audience: "homebuyers, sellers, investors",
        platforms: ["instagram", "facebook", "linkedin", "x"],
        keywords: ["real estate", "market update", "home", "investment", "property"]
    },
    "personal": {
        name: process.env.JARVIS_OWNER_NAME || "Owner",
        tone: "authentic, visionary, faith-driven",
        audience: "professional network, faith community, entrepreneurs",
        platforms: ["linkedin", "x"],
        keywords: ["leadership", "faith", "entrepreneurship", "AI", "innovation", "purpose"]
    }
};

const PRINT_SPECS = {
    "well-noticed-ad": {
        name: "Well Noticed Print Ad",
        totalWidth: 9.25,
        totalHeight: 4.125,
        bleed: 0.25,
        paperWidth: 8.75,
        paperHeight: 3.625,
        liveWidth: 8,
        liveHeight: 3.1,
        format: "PDF",
        colorMode: "CMYK",
        notes: "No spot colors or patterns. Keep important info in live area."
    }
};

const PLATFORM_SPECS = {
    linkedin: {
        name: "LinkedIn",
        postLength: { min: 100, max: 3000 },
        headlineLength: { min: 10, max: 150 },
        hashtagCount: { min: 3, max: 5 },
        style: "professional, thought leadership, industry insights"
    },
    facebook: {
        name: "Facebook",
        postLength: { min: 40, max: 63206 },
        headlineLength: { min: 10, max: 255 },
        hashtagCount: { min: 1, max: 3 },
        style: "conversational, community-oriented, engaging"
    },
    instagram: {
        name: "Instagram",
        postLength: { min: 100, max: 2200 },
        headlineLength: { min: 10, max: 100 },
        hashtagCount: { min: 5, max: 15 },
        style: "visual-first, inspiring, hashtag-rich"
    },
    x: {
        name: "X (Twitter)",
        postLength: { min: 10, max: 280 },
        headlineLength: { min: 0, max: 0 },
        hashtagCount: { min: 1, max: 3 },
        style: "concise, punchy, timely"
    }
};

function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
        }
    } catch (e) {
        console.error("Failed to load content agent state:", e.message);
    }
    return {
        generatedContent: [],
        websiteReviews: [],
        socialPosts: [],
        printAds: [],
        runCount: 0
    };
}

function saveState(state) {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (e) {
        console.error("Failed to save content agent state:", e.message);
    }
}

function getVentureBrand(ventureId) {
    return VENTURE_BRANDS[ventureId] || VENTURE_BRANDS["personal"];
}

function getPrintSpec(templateId) {
    return PRINT_SPECS[templateId] || PRINT_SPECS["well-noticed-ad"];
}

function getPlatformSpec(platform) {
    return PLATFORM_SPECS[platform] || PLATFORM_SPECS["linkedin"];
}

function generateWebsiteReviewPrompt(url, content) {
    return `You are a website content strategist. Review this website and provide actionable recommendations.

Website URL: ${url}

Page Content:
${content.slice(0, 8000)}

Provide your review in this format:
1. OVERVIEW (2-3 sentences summarizing the site)
2. STRENGTHS (3-5 bullet points)
3. WEAKNESSES (3-5 bullet points)
4. RECOMMENDATIONS (5-7 specific, actionable items)
5. CONTENT GAPS (what's missing that should be there)
6. SEO OBSERVATIONS (title tags, meta, headings, keywords)
7. BRAND CONSISTENCY (tone, messaging, visual cues)
8. COMPETITIVE POSITION (how it compares to similar organizations)

Be direct, specific, and actionable.`;
}

function generateSocialPostPrompt(venture, platform, topic, additionalContext) {
    const brand = getVentureBrand(venture);
    const spec = getPlatformSpec(platform);

    return `You are a social media content creator for ${brand.name}.

Brand tone: ${brand.tone}
Target audience: ${brand.audience}
Platform: ${spec.name}
Platform style: ${spec.style}
Post length: ${spec.postLength.min}-${spec.postLength.max} characters
Hashtags: ${spec.hashtagCount.min}-${spec.hashtagCount.max} relevant hashtags

${additionalContext ? `Additional context: ${additionalContext}` : ""}

Create a ${spec.name} post about: ${topic}

Requirements:
- Match the brand tone exactly
- Include relevant hashtags (appropriate count for ${spec.name})
- Be engaging and actionable
- Include a call-to-action where appropriate
- For Instagram, suggest a visual concept
- For LinkedIn, include thought leadership angle
- For X, keep it punchy and timely
- For Facebook, make it community-oriented

Format your response as:
HEADLINE: (if applicable)
POST: (the full post content)
HASHTAGS: (list of hashtags)
VISUAL SUGGESTION: (image/content recommendation)
BEST TIME TO POST: (recommended timing)`;
}

function generatePrintAdPrompt(companyData, venture, template) {
    const brand = getVentureBrand(venture);
    const spec = getPrintSpec(template);

    return `You are a print ad designer for ${brand.name}. Create content for a print advertisement.

PRINT SPECS:
- Total size with bleed: ${spec.totalWidth}" x ${spec.totalHeight}"
- Bleed: ${spec.bleed}"
- Paper size: ${spec.paperWidth}" x ${spec.paperHeight}"
- Live area: ${spec.liveWidth}" x ${spec.liveHeight}" (keep important info here)
- Color mode: ${spec.colorMode}
- No spot colors or patterns

Company information:
${JSON.stringify(companyData, null, 2)}

Create the ad content with:
1. HEADLINE (bold, attention-grabbing, max 8 words)
2. SUBHEADLINE (supporting message, max 15 words)
3. BODY COPY (key value proposition, max 50 words)
4. CALL TO ACTION (clear next step)
5. CONTACT INFO (phone, website, QR code placement)
6. VISUAL DIRECTION (image/layout recommendations)
7. COLOR PALETTE (CMYK values for brand colors)
8. TYPOGRAPHY RECOMMENDATIONS

Requirements:
- All text must fit within ${spec.liveWidth}" x ${spec.liveHeight}" live area
- Headline should be the largest text element
- Include QR code placement recommendation (measureable/traceable)
- Professional, clean layout
- Brand-consistent messaging`;
}

function generateWebsiteReview(url, title, content) {
    const state = loadState();

    const review = {
        id: `review-${Date.now()}`,
        url,
        title: title || url,
        contentPreview: content?.slice(0, 500) || "",
        analyzedAt: new Date().toISOString(),
        status: "analyzed"
    };

    state.websiteReviews.push(review);
    state.websiteReviews = state.websiteReviews.slice(-50);
    state.runCount = (state.runCount || 0) + 1;
    saveState(state);

    return review;
}

function generateSocialPosts(venture, topic, platforms, additionalContext) {
    const state = loadState();
    const brand = getVentureBrand(venture);

    const posts = platforms.map(platform => ({
        id: `post-${Date.now()}-${platform}`,
        venture,
        platform,
        topic,
        brand: brand.name,
        createdAt: new Date().toISOString(),
        status: "draft"
    }));

    state.socialPosts.push(...posts);
    state.socialPosts = state.socialPosts.slice(-100);
    state.runCount = (state.runCount || 0) + 1;
    saveState(state);

    return posts;
}

function generatePrintAd(venture, companyData, template) {
    const state = loadState();
    const spec = getPrintSpec(template);

    const ad = {
        id: `print-${Date.now()}`,
        venture,
        template,
        specs: spec,
        companyData,
        createdAt: new Date().toISOString(),
        status: "draft",
        content: generateLocalPrintContent(companyData, spec)
    };

    state.printAds.push(ad);
    state.printAds = state.printAds.slice(-50);
    state.runCount = (state.runCount || 0) + 1;
    saveState(state);

    return ad;
}

function generateLocalPrintContent(companyData, spec) {
    const name = companyData.companyName || companyData.name || "Your Company";
    const industry = (companyData.industry || "commercial services").split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    const services = companyData.services || [];
    const phone = companyData.phone || "(614) 555-0100";
    const website = companyData.website || "yourcompany.com";

    const headlines = [
        `Trusted ${industry} Experts in Columbus`,
        `Columbus's Premier ${industry} Partner`,
        `Your Local ${industry} Specialists`
    ];
    const headline = headlines[0];

    const subheadline = `Serving Central Ohio families with quality ${industry.toLowerCase()} services since 2010.`;

    const servicesText = services.length > 0
        ? services.slice(0, 3).join(" | ")
        : "Residential & Commercial | Free Estimates | Licensed & Insured";

    const bodyCopy = `${name} is Central Ohio's trusted choice for ${industry.toLowerCase()}. We deliver exceptional results with transparent pricing and a satisfaction guarantee. Every project receives our full attention and commitment to excellence.`;

    const cta = "Call today for your FREE consultation!";

    return {
        headline,
        subheadline,
        bodyCopy,
        cta,
        contactInfo: { phone, website, qrPlacement: "Bottom right corner — 1.25\" x 1.25\" area" },
        visualDirection: `Professional photograph of completed ${industry} work. Clean white background. Trust-building imagery.`,
        colorPalette: {
            primary: "C62828 (Deep Red)",
            secondary: "1565C0 (Blue)",
            accent: "F9A825 (Gold)",
            text: "212121 (Charcoal)",
            background: "FFFFFF (White)"
        },
        typography: {
            headline: "Montserrat Bold, 24pt",
            subheadline: "Montserrat Regular, 11pt",
            body: "Open Sans, 8.5pt",
            cta: "Montserrat Bold, 10pt",
            contact: "Open Sans, 7pt"
        },
        servicesLine: servicesText,
        liveArea: `${spec.liveWidth}" x ${spec.liveHeight}"`,
        totalSize: `${spec.totalWidth}" x ${spec.totalHeight}"`
    };
}

function getRecentContent(limit) {
    const state = loadState();
    return {
        websiteReviews: state.websiteReviews.slice(-limit),
        socialPosts: state.socialPosts.slice(-limit),
        printAds: state.printAds.slice(-limit),
        totalGenerated: state.runCount || 0
    };
}

function status() {
    const state = loadState();
    return {
        agent: {
            id: "content",
            name: "Content Agent",
            version: "1.0"
        },
        capabilities: [
            "website-review",
            "social-media",
            "print-content",
            "brand-management"
        ],
        ventures: Object.keys(VENTURE_BRANDS),
        platforms: Object.keys(PLATFORM_SPECS),
        templates: Object.keys(PRINT_SPECS),
        metrics: {
            totalReviews: state.websiteReviews?.length || 0,
            totalSocialPosts: state.socialPosts?.length || 0,
            totalPrintAds: state.printAds?.length || 0,
            runCount: state.runCount || 0
        }
    };
}

module.exports = {
    VENTURE_BRANDS,
    PRINT_SPECS,
    PLATFORM_SPECS,
    getVentureBrand,
    getPrintSpec,
    getPlatformSpec,
    generateWebsiteReviewPrompt,
    generateSocialPostPrompt,
    generatePrintAdPrompt,
    generateWebsiteReview,
    generateSocialPosts,
    generatePrintAd,
    getRecentContent,
    status
};
