const contentAgent = require("./contentAgentService");

async function fetchWebsiteContent(url) {
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
            },
            signal: AbortSignal.timeout(15000)
        });
        const html = await response.text();

        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : url;

        const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i)
            || html.match(/<meta[^>]*content=["'](.*?)["'][^>]*name=["']description["']/i);
        const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : "";

        const headings = [];
        const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
        let match;
        while ((match = headingRegex.exec(html)) !== null && headings.length < 20) {
            headings.push({ level: parseInt(match[1]), text: match[2].replace(/<[^>]*>/g, "").trim() });
        }

        const bodyText = html
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 12000);

        const links = [];
        const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
        while ((match = linkRegex.exec(html)) !== null && links.length < 30) {
            const href = match[1];
            const text = match[2].replace(/<[^>]*>/g, "").trim();
            if (text && href && !href.startsWith("#") && !href.startsWith("javascript:")) {
                links.push({ href, text: text.slice(0, 100) });
            }
        }

        const images = [];
        const imgRegex = /<img[^>]*src=["']([^"']*)["'][^>]*(?:alt=["']([^"']*)["'])?/gi;
        while ((match = imgRegex.exec(html)) !== null && images.length < 20) {
            images.push({ src: match[1], alt: match[2] || "" });
        }

        return {
            url,
            title,
            metaDescription,
            headings,
            bodyText,
            links,
            images,
            fetchedAt: new Date().toISOString()
        };
    } catch (error) {
        return { url, error: error.message, fetchedAt: new Date().toISOString() };
    }
}

function extractKeyInfo(siteData) {
    if (siteData.error) return { error: siteData.error };

    const text = siteData.bodyText.toLowerCase();

    const services = [];
    const servicePatterns = [
        /(?:services?|what we do|our offerings|solutions|programs|how we help)[:\s]*([^.]*(?:\.[^.]*){0,3})/gi
    ];
    for (const pattern of servicePatterns) {
        let m;
        while ((m = pattern.exec(siteData.bodyText)) !== null && services.length < 5) {
            services.push(m[1].trim().slice(0, 200));
        }
    }

    const contactInfo = {};
    const phoneMatch = siteData.bodyText.match(/(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) contactInfo.phone = phoneMatch[0];

    const emailMatch = siteData.bodyText.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    if (emailMatch) contactInfo.email = emailMatch[0];

    const addressMatch = siteData.bodyText.match(/\d{1,5}\s[\w\s]+(?:St|Ave|Blvd|Rd|Dr|Ln|Way|Ct|Pl)\b[^.]*/i);
    if (addressMatch) contactInfo.address = addressMatch[0].trim().slice(0, 150);

    const socialLinks = siteData.links.filter(l =>
        /facebook|linkedin|instagram|twitter|x\.com|youtube/i.test(l.href)
    ).map(l => ({ platform: l.href.match(/facebook|linkedin|instagram|twitter|x\.com|youtube/i)?.[0], url: l.href }));

    return {
        title: siteData.title,
        metaDescription: siteData.metaDescription,
        headings: siteData.headings,
        services,
        contactInfo,
        socialLinks,
        imageCount: siteData.images.length,
        linkCount: siteData.links.length,
        bodyTextPreview: siteData.bodyText.slice(0, 2000)
    };
}

async function reviewWebsite(url) {
    const siteData = await fetchWebsiteContent(url);
    if (siteData.error) {
        return { url, error: siteData.error, review: null };
    }

    const keyInfo = extractKeyInfo(siteData);
    const record = contentAgent.generateWebsiteReview(url, keyInfo.title, siteData.bodyText);

    return {
        url,
        record,
        siteData: {
            title: keyInfo.title,
            metaDescription: keyInfo.metaDescription,
            headings: keyInfo.headings,
            contactInfo: keyInfo.contactInfo,
            socialLinks: keyInfo.socialLinks,
            imageCount: keyInfo.imageCount,
            linkCount: keyInfo.linkCount,
            bodyTextPreview: keyInfo.bodyTextPreview
        },
        prompt: contentAgent.generateWebsiteReviewPrompt(url, siteData.bodyText)
    };
}

module.exports = { fetchWebsiteContent, extractKeyInfo, reviewWebsite };
