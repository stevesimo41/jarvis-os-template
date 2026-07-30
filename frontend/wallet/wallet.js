(function () {
    const escapeHtml = value => { const node = document.createElement("div"); node.textContent = String(value ?? ""); return node.innerHTML; };

    async function apiGet(path) {
        const authToken = sessionStorage.getItem("jarvis.authToken");
        const headers = { "Content-Type": "application/json" };
        if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
        const res = await fetch(`/api/lemon-squeezy${path}`, { headers });
        const payload = await res.json();
        if (!payload.ok) throw new Error(payload.error || "Request failed");
        return payload.data;
    }

    const storeUrl = "https://jarvis-os.lemonsqueezy.com";

    async function loadWallet() {
        const workspace = document.getElementById("conversation");
        workspace.innerHTML = `<section class="wallet-center"><article class="wallet-card">Loading JARVIS Wallet...</article></section>`;

        try {
            const [revenue, orders, products, events, status] = await Promise.all([
                apiGet("/revenue").catch(() => null),
                apiGet("/orders?perPage=10").catch(() => null),
                apiGet("/products").catch(() => null),
                apiGet("/events?limit=15").catch(() => null),
                apiGet("/status").catch(() => null)
            ]);

            workspace.innerHTML = `
                <section class="wallet-center">
                    <header>
                        <div>
                            <div class="eyebrow">JARVIS OS / WALLET</div>
                            <h1>Revenue Wallet</h1>
                            <p>Lemon Squeezy store revenue, orders, and license management.</p>
                        </div>
                        <span class="wallet-badge">${status?.configured ? `${storeUrl.replace("https://", "")}` : "DISCONNECTED"}</span>
                    </header>

                    <div class="wallet-grid">
                        <div class="wallet-card">
                            <div class="eyebrow">TOTAL REVENUE</div>
                            <div class="wallet-value">${revenue ? revenue.currency === "USD" ? "$" : "" : "—"}${revenue ? Number(revenue.totalRevenue).toLocaleString(undefined, {minimumFractionDigits: 2}) : "—"}</div>
                            <div class="wallet-value-sub">${revenue ? revenue.totalSales + " total sales" : "No data"}</div>
                            <div class="wallet-status"><span class="status-dot ${status?.apiConnected ? "connected" : "disconnected"}"></span>${status?.apiConnected ? "API connected" : "API disconnected"}${status?.webhookConfigured ? " · Webhook configured" : " · Webhook not configured"}</div>
                        </div>

                        <div class="wallet-card">
                            <div class="eyebrow">LAST 30 DAYS</div>
                            <div class="wallet-value">${revenue ? (revenue.currency === "USD" ? "$" : "") + Number(revenue.thirtyDayRevenue).toLocaleString(undefined, {minimumFractionDigits: 2}) : "—"}</div>
                            <div class="wallet-value-sub">${revenue ? revenue.thirtyDaySales + " sales in last 30 days" : "No data"}</div>
                        </div>
                    </div>

                    <div class="wallet-card">
                        <div class="eyebrow">PRODUCTS</div>
                        <div class="wallet-product-grid">${products && products.length ? products.map(p => `
                            <div class="wallet-product">
                                <h3>${escapeHtml(p.name)}</h3>
                                <div class="price">${escapeHtml(p.priceFormatted)}</div>
                                <span class="status-badge ${p.testMode ? "test_mode" : "published"}">${p.testMode ? "TEST MODE" : "PUBLISHED"}</span>
                                <br><a href="${storeUrl}/checkout/buy/${p.id === 1248439 ? "57fad3b1-b933-418f-8171-7b4954576298" : "09df18ce-7b98-4996-955b-8373abdac1c2"}" target="_blank">Checkout →</a>
                            </div>
                        `).join("") : `<div class="wallet-empty">No products found</div>`}</div>
                    </div>

                    <div class="wallet-grid">
                        <div class="wallet-card">
                            <div class="eyebrow">RECENT ORDERS</div>
                            ${orders && orders.orders && orders.orders.length ? `
                            <table class="wallet-table">
                                <tr><th>Date</th><th>Email</th><th>Amount</th><th>Status</th></tr>
                                ${orders.orders.map(o => `
                                    <tr>
                                        <td>${escapeHtml((o.createdAt || "").slice(0, 10))}</td>
                                        <td>${escapeHtml(o.customerEmail)}</td>
                                        <td>${o.currency === "USD" ? "$" : ""}${Number(o.total).toFixed(2)}</td>
                                        <td>${escapeHtml(o.status)}</td>
                                    </tr>
                                `).join("")}
                            </table>` : `<div class="wallet-empty">No orders yet — be the first sale!</div>`}
                        </div>

                        <div class="wallet-card">
                            <div class="eyebrow">WEBHOOK EVENTS</div>
                            <div class="wallet-events">${events && events.length ? events.map(e => `
                                <div class="wallet-event">
                                    <span class="wallet-event-type">${escapeHtml(e.type)}</span>
                                    <span class="wallet-event-time">${escapeHtml((e.receivedAt || "").slice(0, 19).replace("T", " "))}</span>
                                    <span class="wallet-event-id">${escapeHtml(e.id ? e.id.slice(0, 8) : "")}</span>
                                </div>
                            `).join("") : `<div class="wallet-empty">No webhook events received yet. Configure a webhook URL in Lemon Squeezy.</div>`}</div>
                        </div>
                    </div>

                    <div class="wallet-card" style="text-align:center;color:#91a2b8;font-size:13px">
                        <strong>Store:</strong> ${storeUrl} ·
                        <strong>Products:</strong> ${products ? products.filter(p => !p.testMode).length + " published" : "—"} (${products ? products.filter(p => p.testMode).length + " test mode" : "—"}) ·
                        <strong>Webhook:</strong> ${status?.webhookConfigured ? "Configured" : "Not configured"} ·
                        <strong>Last refreshed:</strong> ${new Date().toLocaleTimeString()}
                    </div>
                </section>
            `;
        } catch (error) {
            workspace.innerHTML = `<section class="wallet-center"><article class="wallet-card">${escapeHtml(error.message)}</article></section>`;
        }
    }

    window.loadWallet = loadWallet;
}());
