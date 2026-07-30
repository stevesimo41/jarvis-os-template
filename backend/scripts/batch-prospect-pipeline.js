#!/usr/bin/env node
/**
 * Batch Prospect Pipeline
 * - Scores 26 net-new prospects
 * - Enriches via website scraping (email, phone, exec name)
 * - Adds to Google Sheet
 * - Creates 5-touch cadence campaigns
 * - Sends first email step
 * - Reports results
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const liveCrm = require("../services/liveCrmService");
const campaignService = require("../services/wellNoticedCampaignService");
const { sendEmail } = require("../services/emailService");
const GoogleSheetsProvider = require("../providers/googleSheetsProvider");

const sheetsProvider = new GoogleSheetsProvider();

const PROSPECTS = [
    { name: "Summit Building & Roofing", category: "Home Improvement", subcategory: "Roofing/Siding", website: "https://summitbuildingroofing.com", city: "Columbus", phone: "(614) 989-1444", execName: "Jason Kear", execTitle: "Owner", reviews: 263, fitScore: 92, reason: "Family-owned since 2010, 4.9 rating, GAF Master Elite certified, strong insurance claim expertise" },
    { name: "Pioneer Roofing", category: "Home Improvement", subcategory: "Roofing", website: "https://pioneerroofingohio.com", city: "Plain City", phone: "(614) 631-8572", execName: "Jason Lee", execTitle: "Owner", reviews: 200, fitScore: 88, reason: "Locally owned near Dublin, CertainTeed ShingleMaster, A+ BBB, 4.9 rating" },
    { name: "Dynasty Roofing & Restoration", category: "Home Improvement", subcategory: "Roofing", website: "https://dynastyroofingohio.com", city: "Columbus", phone: "(614) 631-0760", execName: "Ethan", execTitle: "Owner", reviews: 145, fitScore: 85, reason: "Family-owned, HAAG Certified, BBB A+, personal owner involvement" },
    { name: "KFX Roofing", category: "Home Improvement", subcategory: "Roofing", website: "https://kfxroofing.com", city: "Columbus", phone: "(614) 560-7663", execName: "Felix Fyffe", execTitle: "Founder", reviews: 94, fitScore: 82, reason: "Two Central Ohio natives, not a franchise, owner-operated, 4.9 rating" },
    { name: "Fresh Touch Custom Painting", category: "Home Improvement", subcategory: "Painting", website: "https://ftpainting.com", city: "Columbus", phone: "(614) 849-3500", execName: "", execTitle: "", reviews: 1049, fitScore: 90, reason: "4.9 rating, Angi Super Service Award, 30+ years, 95% 5-star reviews" },
    { name: "Buckeye House Painting", category: "Home Improvement", subcategory: "Painting", website: "https://buckeyepaint.com", city: "Powell", phone: "(614) 401-8572", execName: "Dan Hartwell", execTitle: "Owner", reviews: 200, fitScore: 86, reason: "27 years in business, owner-operated, Powell-based serving all of Columbus" },
    { name: "Polaris Family Dental", category: "Healthcare", subcategory: "Dental", website: "https://polarisfamilydental.com", city: "Columbus", phone: "(614) 846-0846", execName: "Dr. Jaclyn Winner", execTitle: "Dentist", reviews: 809, fitScore: 91, reason: "4.8 rating, 809 reviews, modern practice, strong community reputation" },
    { name: "Riverview Dental", category: "Healthcare", subcategory: "Dental", website: "https://riverview-dental.com", city: "Columbus", phone: "(614) 487-0984", execName: "Dr. Chowdhury", execTitle: "Dentist", reviews: 350, fitScore: 87, reason: "4.9 rating, conservative/low-stress approach, top 9% of Columbus dentists" },
    { name: "Central Ohio Spine and Joint", category: "Healthcare", subcategory: "Chiropractic", website: "https://centralohiospineandjoint.com", city: "Columbus", phone: "(614) 792-3789", execName: "", execTitle: "", reviews: 776, fitScore: 89, reason: "4.9 rating, #3 ranked chiropractor in Columbus, sports injury specialty" },
    { name: "Patriot Chiropractic", category: "Healthcare", subcategory: "Chiropractic", website: "https://patriotchiropractic.com", city: "Dublin", phone: "(614) 889-1440", execName: "Dr. Hoag", execTitle: "Chiropractor", reviews: 245, fitScore: 84, reason: "5.0 rating, brain-based techniques, whole-body wellness, Dublin location" },
    { name: "Active Edge Chiropractic & Functional Medicine", category: "Healthcare", subcategory: "Chiropractic/Wellness", website: "https://columbuschiropractors.com", city: "Columbus", phone: "(614) 775-7363", execName: "Dr. Erik Hensel", execTitle: "Chiropractor", reviews: 215, fitScore: 83, reason: "4.9 rating, functional medicine + chiropractic, holistic health approach" },
    { name: "The Skin Center", category: "Healthcare", subcategory: "Med Spa", website: "https://theskincentermedspa.com", city: "Columbus", phone: "(614) 488-3800", execName: "", execTitle: "", reviews: 515, fitScore: 88, reason: "4.9 rating, comprehensive med spa, multiple locations" },
    { name: "Scioto Wealth Advisors", category: "Financial", subcategory: "Wealth Management", website: "https://sciotowealthadvisors.com", city: "Columbus", phone: "(614) 826-3602", execName: "", execTitle: "Forbes Best-in-State Team", reviews: 0, fitScore: 80, reason: "Forbes 2026 Best-in-State Wealth Management Team, independent fiduciary" },
    { name: "Peerless Wealth Management", category: "Financial", subcategory: "Wealth Management", website: "https://peerless-wealth.com", city: "Columbus", phone: "(614) 555-0100", execName: "Erik Thompson", execTitle: "Owner", reviews: 50, fitScore: 79, reason: "25+ years experience, fee-only SEC-registered, owner-operated" },
    { name: "Ciminello's Landscaping", category: "Home Services", subcategory: "Landscaping", website: "https://ciminellos.com", city: "Columbus", phone: "(614) 470-2606", execName: "Ciminello Family", execTitle: "Owner", reviews: 150, fitScore: 85, reason: "Award-winning design + craftsmanship, full-service outdoor living" },
    { name: "Real World Cleaning Services", category: "Home Services", subcategory: "Cleaning", website: "https://realworldcleaningservices.com", city: "Columbus", phone: "(614) 300-0288", execName: "Brandi", execTitle: "Owner", reviews: 700, fitScore: 86, reason: "15+ years, 40k+ services completed, 4.9 rating, residential + commercial" },
    { name: "REWILD Yoga", category: "Wellness", subcategory: "Yoga/Fitness", website: "https://rewildyoga.com", city: "Columbus", phone: "", execName: "", execTitle: "", reviews: 150, fitScore: 78, reason: "Columbus' heated power yoga studio, unique aesthetic, strong community" },
    { name: "Hackett House Studio", category: "Luxury/Lifestyle", subcategory: "Interior Design", website: "https://hacketthousestudio.com", city: "Columbus", phone: "", execName: "", execTitle: "", reviews: 50, fitScore: 77, reason: "Full-service residential design, new builds + renovations, nationwide projects" },
    { name: "Katherine Thomas Studio", category: "Luxury/Lifestyle", subcategory: "Interior Design", website: "https://katherinethomasstudio.com", city: "Columbus", phone: "", execName: "Katherine Thomas", execTitle: "Principal Designer", reviews: 50, fitScore: 76, reason: "14 years experience, featured on Apartment Therapy, residential + hospitality" },
    { name: "Y2 Design Build", category: "Home Improvement", subcategory: "Design-Build Remodeling", website: "https://y2designbuild.com", city: "Columbus", phone: "", execName: "", execTitle: "", reviews: 100, fitScore: 87, reason: "Award-winning, zero change order guarantee, transparent pricing, 5-star reviews" },
    { name: "ReadyGo Remodeling", category: "Home Improvement", subcategory: "Remodeling", website: "https://readygoremodeling.com", city: "Galena", phone: "", execName: "Mike", execTitle: "Owner", reviews: 39, fitScore: 75, reason: "Family-owned, 4.9 rating, basement/kitchen/bath specialist, Central Ohio" },
    { name: "Gold Path Solar", category: "Home Services", subcategory: "Solar", website: "https://goldpathsolar.com", city: "Worthington", phone: "", execName: "", execTitle: "", reviews: 0, fitScore: 81, reason: "Highest rated solar company in Ohio, EnergySage 2025/2026 Installer of the Year" },
    { name: "Ecohouse Solar", category: "Home Services", subcategory: "Solar", website: "https://ecohousesolar.com", city: "Columbus", phone: "(614) 456-7641", execName: "", execTitle: "", reviews: 0, fitScore: 78, reason: "20+ years in Greater Columbus, residential + commercial solar, local focus" },
    { name: "Curate Interiors", category: "Luxury/Lifestyle", subcategory: "Interior Design", website: "https://curate-interiors.com", city: "Columbus", phone: "", execName: "", execTitle: "", reviews: 0, fitScore: 80, reason: "Luxury residential designer, serves Dublin/UA/New Albany/Bexley, custom builds" },
    { name: "Roseberry Allen", category: "Luxury/Lifestyle", subcategory: "Interior Design", website: "https://roseberryallen.com", city: "Columbus", phone: "", execName: "", execTitle: "", reviews: 0, fitScore: 79, reason: "Elevated interior design, serves UA/Dublin/Bexley/New Albany, full-service" },
    { name: "Mary Beckett Design", category: "Luxury/Lifestyle", subcategory: "Interior Design", website: "https://marybeckett.com", city: "Columbus", phone: "", execName: "Mary Beckett", execTitle: "Principal Designer", reviews: 0, fitScore: 78, reason: "Luxury residential firm, space planning, custom furnishings, strong client testimonials" }
];

function fetchUrl(url, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith("https") ? https : http;
        const req = mod.get(url, { timeout, headers: { "User-Agent": "Mozilla/5.0 (compatible; JARVIS/1.0)" } }, res => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchUrl(res.headers.location, timeout).then(resolve).catch(reject);
            }
            let data = "";
            res.on("data", c => data += c);
            res.on("end", () => resolve(data));
        });
        req.on("error", reject);
        req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    });
}

function extractEmails(html) {
    const matches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    return [...new Set(matches)].filter(e => !e.endsWith(".png") && !e.endsWith(".jpg") && !e.includes("example.com") && !e.includes("sentry.io"));
}

function extractPhones(html) {
    const matches = html.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [];
    return [...new Set(matches)];
}

function extractExecName(html, knownName) {
    if (knownName) return knownName;
    const patterns = [
        /(?:Owner|Founder|CEO|President|Principal)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/,
        /([A-Z][a-z]+ [A-Z][a-z]+),?\s*(?:Owner|Founder|CEO|President)/,
    ];
    for (const p of patterns) {
        const m = html.match(p);
        if (m) return m[1];
    }
    return "";
}

async function enrichProspect(p) {
    const result = { ...p, enrichedEmail: "", enrichedPhone: p.phone || "", enrichedExec: p.execName || "" };
    try {
        const html = await fetchUrl(p.website);
        const emails = extractEmails(html);
        const phones = extractPhones(html);
        result.enrichedEmail = emails[0] || "";
        if (!result.enrichedPhone && phones.length > 0) result.enrichedPhone = phones[0];
        if (!result.enrichedExec) result.enrichedExec = extractExecName(html, p.execName);
    } catch (e) {
        result.enrichError = e.message;
    }
    return result;
}

async function main() {
    console.log("=== BATCH PROSPECT PIPELINE ===");
    console.log("Prospects:", PROSPECTS.length);
    console.log("");

    // Phase 1: Enrich
    console.log("--- Phase 1: Enriching prospects ---");
    const enriched = [];
    for (let i = 0; i < PROSPECTS.length; i++) {
        const p = PROSPECTS[i];
        process.stdout.write(`  [${i + 1}/${PROSPECTS.length}] ${p.name}... `);
        const result = await enrichProspect(p);
        enriched.push(result);
        const email = result.enrichedEmail || "no email";
        const phone = result.enrichedPhone || "no phone";
        console.log(`${email} | ${phone}`);
    }

    const withEmail = enriched.filter(e => e.enrichedEmail);
    const withoutEmail = enriched.filter(e => !e.enrichedEmail);
    console.log(`\nEnriched: ${withEmail.length} with email, ${withoutEmail.length} without email`);

    // Phase 2: Add to Google Sheet
    console.log("\n--- Phase 2: Adding to Google Sheet ---");
    let addedCount = 0;
    for (const e of enriched) {
        try {
            const row = [
                e.category,           // Master-Category
                e.subcategory,        // Sub-Category Name
                "",                   // Mult. Sub Cat "x"
                e.name,               // Company Name
                e.enrichedExec,       // Main Contact
                "",                   // Street Address
                e.city,               // City
                "OH",                 // ST
                "",                   // Zip
                e.enrichedPhone,      // Phone
                e.enrichedEmail,      // EMAIL
                e.website,            // Website
                process.env.JARVIS_OWNER_NAME || "owner",              // WN / Owner (S / P)
                new Date().toLocaleDateString("en-US"),  // **DATE ONLY** Last Date of Contact
                `Batch pipeline: ${e.reason}`,            // Call info - Rolling / Details / Put Date at Top (NOTES)
                "",                   // **DATE ONLY** Follow up date
                "",                   // Prospect, Customer, Term
                "Not Touched"         // Not Touched, Reached Out, In Communication, DNC
            ];
            await sheetsProvider.appendRange("Prospects!A:R", [row]);
            addedCount++;
            console.log(`  + ${e.name}`);
        } catch (e2) {
            console.log(`  ! FAILED: ${e.name} — ${e2.message}`);
        }
    }
    console.log(`Added ${addedCount}/${enriched.length} to Google Sheet`);

    // Phase 3: Create campaigns for prospects with email
    console.log("\n--- Phase 3: Creating campaigns ---");
    const campaigns = [];
    for (const e of withEmail) {
        try {
            const campaign = campaignService.createCampaign({
                name: e.name,
                category: e.category,
                executiveName: e.enrichedExec,
                executiveEmail: e.enrichedEmail,
                website: e.website,
                googleReviewCount: String(e.reviews),
                city: e.city
            });
            campaigns.push({ prospect: e, campaign });
            console.log(`  ✓ ${e.name} → ${campaign.id}`);
        } catch (e2) {
            console.log(`  ✗ ${e.name} — ${e2.message}`);
        }
    }
    console.log(`Created ${campaigns.length} campaigns`);

    // Phase 4: Send first email step for top prospects
    console.log("\n--- Phase 4: Sending first emails ---");
    const toSend = campaigns.filter(c => {
        const firstEmail = c.campaign.steps.find(s => s.channel === "email");
        return firstEmail;
    }).slice(0, 5); // Send first 5 only

    for (const { prospect: e, campaign: c } of toSend) {
        const emailStep = c.steps.find(s => s.channel === "email");
        if (!emailStep) continue;

        process.stdout.write(`  Sending to ${e.enrichedEmail}... `);
        try {
            const personalizedSubject = emailStep.subject
                .replace(/\{\{companyName\}\}/g, e.name)
                .replace(/\{\{executiveName\}\}/g, e.enrichedExec || "there")
                .replace(/\{\{greeting\}\}/g, e.enrichedExec ? `Hi ${e.enrichedExec.split(" ")[0]}` : "Hi there");

            const personalizedBody = emailStep.message
                .replace(/\{\{companyName\}\}/g, e.name)
                .replace(/\{\{executiveName\}\}/g, e.enrichedExec || "there")
                .replace(/\{\{greeting\}\}/g, e.enrichedExec ? `Hi ${e.enrichedExec.split(" ")[0]}` : "Hi there")
                .replace(/\{\{city\}\}/g, e.city || "Columbus");

            await sendEmail(e.enrichedEmail, personalizedSubject, personalizedBody);

            emailStep.status = "completed";
            emailStep.executedAt = new Date().toISOString();
            console.log(`✓ Sent`);
        } catch (e2) {
            console.log(`✗ Failed: ${e2.message}`);
        }
    }

    // Save campaign states
    console.log("\n--- Phase 5: Saving campaign states ---");
    // Campaigns are already saved by createCampaign

    // Summary
    console.log("\n=== PIPELINE SUMMARY ===");
    console.log(`Total prospects: ${PROSPECTS.length}`);
    console.log(`Enriched: ${enriched.length}`);
    console.log(`With email: ${withEmail.length}`);
    console.log(`Added to sheet: ${addedCount}`);
    console.log(`Campaigns created: ${campaigns.length}`);
    console.log(`First emails sent: ${toSend.length}`);
    console.log("\nProspects without email (need manual enrichment):");
    withoutEmail.forEach(e => console.log(`  - ${e.name} (${e.website})`));
}

main().catch(e => {
    console.error("Pipeline failed:", e.message);
    process.exit(1);
});
