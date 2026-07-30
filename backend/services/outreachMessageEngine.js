function generateOutreachMessages(outreachPlan) {

    const messages =
        outreachPlan.outreach.map((prospect) => {

            return {

                prospect:
                    prospect.prospect,

                category:
                    prospect.category,

                channel:
                    prospect.contact
                        ? "Email or direct contact"
                        : "Research contact information first",

                subject:
                    "Local Partnership Opportunity with Well Noticed",

                message:
                    `Hello ${prospect.prospect},

I am reaching out regarding a potential local partnership opportunity through Well Noticed, a premium direct mail publication connecting Central Ohio businesses with high value local homeowners.

Based on your business category and local presence, I believe your company could be a strong fit for the publication.

I would be glad to share more information about the audience, format, and partnership opportunity and see if it could be a fit for your business.

Best,

[Your Name]
[Your Company]`,

                nextAction:
                    prospect.contact
                        ? "Send personalized outreach."
                        : "Identify the correct decision maker and contact information."

            };

        });

    return {

        status: "outreach_messages_ready",

        totalMessages:
            messages.length,

        messages,

        nextStep:
            "Review each message and begin outreach to the highest priority prospects."

    };

}

module.exports = {
    generateOutreachMessages
};
