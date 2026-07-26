/* =============================================
   JARVIS OS — Lemon Squeezy Checkout Integration
   
   Setup required:
   1. Create a Lemon Squeezy account at lemonsqueezy.com
   2. Create products: "JARVIS OS Pro" ($29/mo) and "JARVIS OS Business" ($997 one-time)
   3. Replace the checkout URLs below with your actual Lemon Squeezy checkout URLs
   4. (Optional) Add your Lemon Squeezy store ID for analytics
   
   The checkout URLs follow this pattern:
   https://[store].lemonsqueezy.com/checkout/buy/[variant-id]
   
   You can find your checkout URLs in the Lemon Squeezy dashboard under Products > Checkout Links.
   ============================================= */

(function () {
    "use strict";

    var CONFIG = {
        checkout: {
            pro: "https://jarvis-os.lemonsqueezy.com/checkout/buy/09df18ce-7b98-4996-955b-8373abdac1c2",
            business: "https://jarvis-os.lemonsqueezy.com/checkout/buy/57fad3b1-b933-418f-8171-7b4954576298"
        },
        storeId: "",
        fallbackDownload: "https://github.com/stevesimo41/jarvis-os-template/archive/refs/heads/main.zip"
    };

    function trackEvent(event, data) {
        if (typeof gtag === "function") {
            gtag(event, "checkout", data);
        }
        console.log("[JARVIS Checkout]", event, data);
    }

    function handleCheckout(e) {
        var btn = e.currentTarget;
        var plan = btn.getAttribute("data-plan");

        if (plan === "pro" || plan === "business") {
            trackEvent("event", {
                event_category: "pricing",
                event_label: plan,
                value: plan === "pro" ? 29 : 997
            });

            var url = CONFIG.checkout[plan];
            if (url && url.includes("lemonsqueezy.com")) {
                window.location.href = url;
            } else {
                showWaitlist(plan);
            }
        } else if (plan === "download") {
            trackEvent("event", {
                event_category: "download",
                event_label: "github"
            });
            window.location.href = CONFIG.fallbackDownload;
        }
    }

    function showWaitlist(plan) {
        var modal = document.createElement("div");
        modal.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;";
        
        var price = plan === "pro" ? "$29/mo" : "$997 one-time";
        
        modal.innerHTML = '<div style="background:#0d1117;border:1px solid #1a1f2e;border-radius:12px;padding:40px;max-width:440px;width:90%;position:relative;">' +
            '<button onclick="this.closest(\'div[style*=fixed]\').remove()" style="position:absolute;top:12px;right:16px;background:none;border:none;color:#888;font-size:20px;cursor:pointer;">&times;</button>' +
            '<h3 style="color:#fff;font-size:20px;margin-bottom:8px;">Join the ' + (plan === "pro" ? "Pro" : "Business") + ' Waitlist</h3>' +
            '<p style="color:#8892a4;font-size:14px;margin-bottom:24px;">JARVIS OS ' + (plan === "pro" ? "Pro" : "Business") + ' (' + price + ') is coming soon. Enter your email to be first in line.</p>' +
            '<form id="waitlistForm" style="display:flex;flex-direction:column;gap:12px;">' +
            '<input type="email" placeholder="you@company.com" required style="padding:12px 16px;background:#161b22;border:1px solid #333;border-radius:8px;color:#fff;font-size:14px;outline:none;" />' +
            '<button type="submit" style="padding:12px;background:#22c55e;color:#080b10;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">Join Waitlist</button>' +
            '</form>' +
            '<p id="waitlistConfirm" style="color:#22c55e;font-size:14px;margin-top:12px;display:none;">You\'re on the list! We\'ll notify you when it\'s ready.</p>' +
            '</div>';

        document.body.appendChild(modal);
        modal.addEventListener("click", function (e) {
            if (e.target === modal) modal.remove();
        });

        document.getElementById("waitlistForm").addEventListener("submit", function (e) {
            e.preventDefault();
            var email = this.querySelector("input").value;
            
            // Store waitlist email (replace with actual API call)
            trackEvent("event", {
                event_category: "waitlist",
                event_label: plan,
                value: email
            });

            // In production, POST to your API: /api/waitlist
            console.log("[JARVIS Waitlist]", plan, email);

            this.style.display = "none";
            document.getElementById("waitlistConfirm").style.display = "block";
        });
    }

    // Attach to all checkout buttons
    document.addEventListener("DOMContentLoaded", function () {
        var buttons = document.querySelectorAll("[data-plan]");
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].addEventListener("click", handleCheckout);
        }
    });

    // Expose for external use
    window.JarvisCheckout = {
        config: CONFIG,
        showWaitlist: showWaitlist,
        trackEvent: trackEvent
    };
})();
