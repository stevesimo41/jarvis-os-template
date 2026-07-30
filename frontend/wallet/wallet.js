function loadWallet() {
    const root = document.getElementById("dashboardRoot");
    root.innerHTML = `
        <div class="wallet-dashboard">
            <div class="wallet-header">
                <h2>Wallet & Sales</h2>
                <p class="wallet-subtitle">Revenue tracking, products, and license management via Lemon Squeezy</p>
            </div>
            <div class="wallet-metrics-row" id="walletMetrics">
                <div class="wallet-metric"><span class="metric-value" id="walletRevenue">—</span><span class="metric-label">Revenue</span></div>
                <div class="wallet-metric"><span class="metric-value" id="walletOrders">—</span><span class="metric-label">Orders</span></div>
                <div class="wallet-metric"><span class="metric-value" id="walletProducts">—</span><span class="metric-label">Products</span></div>
                <div class="wallet-metric"><span class="metric-value" id="walletSubs">—</span><span class="metric-label">Subscriptions</span></div>
            </div>
            <div class="wallet-section"><h3>Products</h3><div id="walletProductList"><p class="wallet-empty">Loading...</p></div></div>
            <div class="wallet-section"><h3>Recent Orders</h3><div id="walletOrderList"><p class="wallet-empty">Loading...</p></div></div>
            <div class="wallet-section"><h3>Validate License Key</h3>
                <div class="wallet-license-form">
                    <input type="text" id="licenseKeyInput" placeholder="Enter license key..." class="wallet-input">
                    <button onclick="validateLicense()" class="wallet-btn">Validate</button>
                    <div id="licenseResult"></div>
                </div>
            </div>
            <div class="wallet-section"><h3>Setup Instructions</h3>
                <div class="wallet-setup-box">
                    <p>To activate your Lemon Squeezy store, add these to your <code>.env</code>:</p>
                    <pre>LEMON_SQUEEZY_API_KEY=your-api-key
LEMON_SQUEEZY_STORE_ID=your-store-id
LEMON_SQUEEZY_WEBHOOK_SECRET=your-webhook-secret</pre>
                    <p>Get credentials from <a href="https://app.lemonsqueezy.com/settings/api" target="_blank">Lemon Squeezy API Settings</a></p>
                </div>
            </div>
        </div>
    `;

    fetchWalletData();
}

async function fetchWalletData() {
    try {
        const [statusRes, productsRes, ordersRes, subsRes] = await Promise.all([
            fetch("/api/lemon-squeezy/status").then(r => r.json()).catch(() => ({ ok: false })),
            fetch("/api/lemon-squeezy/products").then(r => r.json()).catch(() => ({ ok: false })),
            fetch("/api/lemon-squeezy/orders").then(r => r.json()).catch(() => ({ ok: false })),
            fetch("/api/lemon-squeezy/subscriptions").then(r => r.json()).catch(() => ({ ok: false }))
        ]);

        if (statusRes.ok) {
            document.getElementById("walletRevenue").textContent = statusRes.data?.revenue ? `$${statusRes.data.revenue}` : "$0";
        }

        if (productsRes.ok && productsRes.data) {
            const products = productsRes.data;
            document.getElementById("walletProducts").textContent = products.length || 0;
            renderProducts(products);
        } else {
            document.getElementById("walletProductList").innerHTML = '<p class="wallet-empty">No products found or API not configured</p>';
        }

        if (ordersRes.ok && ordersRes.data) {
            const orders = ordersRes.data;
            document.getElementById("walletOrders").textContent = orders.length || 0;
            renderOrders(orders.slice(0, 10));
        } else {
            document.getElementById("walletOrderList").innerHTML = '<p class="wallet-empty">No orders yet</p>';
        }

        if (subsRes.ok && subsRes.data) {
            document.getElementById("walletSubs").textContent = subsRes.data.length || 0;
        }
    } catch (e) {
        document.getElementById("walletProductList").innerHTML = `<p class="wallet-empty wallet-error">Failed to load: ${e.message}</p>`;
    }
}

function renderProducts(products) {
    const container = document.getElementById("walletProductList");
    if (!products.length) {
        container.innerHTML = '<p class="wallet-empty">No products configured</p>';
        return;
    }
    container.innerHTML = products.map(p => `
        <div class="wallet-product-card">
            <strong>${s(p.attributes?.name || "Unnamed")}</strong>
            <span class="wallet-price">${p.attributes?.price ? `$${(p.attributes.price / 100).toFixed(2)}` : "—"}</span>
            <span class="wallet-status ${p.attributes?.status || "draft"}">${p.attributes?.status || "draft"}</span>
        </div>
    `).join("");
}

function renderOrders(orders) {
    const container = document.getElementById("walletOrderList");
    if (!orders.length) {
        container.innerHTML = '<p class="wallet-empty">No orders yet — your first sale will appear here</p>';
        return;
    }
    container.innerHTML = orders.map(o => `
        <div class="wallet-order-row">
            <span>${s(o.attributes?.user_email || "—")}</span>
            <span>$${((o.attributes?.total || 0) / 100).toFixed(2)}</span>
            <span class="wallet-status ${o.attributes?.status || ""}">${o.attributes?.status || "unknown"}</span>
            <span class="wallet-date">${new Date(o.attributes?.created_at || o.attributes?.createdAt || Date.now()).toLocaleDateString()}</span>
        </div>
    `).join("");
}

async function validateLicense() {
    const key = document.getElementById("licenseKeyInput").value.trim();
    const resultDiv = document.getElementById("licenseResult");
    if (!key) { resultDiv.innerHTML = '<p class="wallet-error">Enter a license key</p>'; return; }

    resultDiv.innerHTML = '<p class="wallet-loading">Validating...</p>';
    try {
        const res = await fetch("/api/lemon-squeezy/validate-license", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ license_key: key })
        });
        const data = await res.json();
        if (data.valid) {
            resultDiv.innerHTML = `<p class="wallet-valid">✓ License valid — ${data.meta?.product_name || "product"} (${data.meta?.customer_name || "registered"})</p>`;
        } else {
            resultDiv.innerHTML = `<p class="wallet-error">✗ ${data.error || "Invalid license key"}</p>`;
        }
    } catch (e) {
        resultDiv.innerHTML = `<p class="wallet-error">Error: ${e.message}</p>`;
    }
}

window.loadWallet = loadWallet;
