/* =============================================
   JARVIS OS — PWA Service Worker v1.0
   
   Handles:
   - Offline caching for marketing pages
   - Cache-first for static assets (CSS, JS, images)
   - Network-first for API calls
   - Background sync for form submissions
   - Push notification support (when ready)
   ============================================= */

const CACHE_NAME = "jarvis-pwa-v1";
const STATIC_CACHE = "jarvis-static-v1";
const API_CACHE = "jarvis-api-v1";

const STATIC_ASSETS = [
    "/",
    "/index.html",
    "/pricing.html",
    "/css/landing.css",
    "/js/checkout.js",
    "/manifest.webmanifest",
    "/assets/icon-192.png",
    "/assets/icon-512.png"
];

// Install — pre-cache static assets
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate — clean up old caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
                    .map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch — cache strategy based on request type
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // API calls — network first, cache fallback
    if (url.pathname.startsWith("/api/")) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(API_CACHE).then((cache) => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // Static assets — cache first, network fallback
    if (
        url.pathname.endsWith(".css") ||
        url.pathname.endsWith(".js") ||
        url.pathname.endsWith(".png") ||
        url.pathname.endsWith(".svg") ||
        url.pathname.endsWith(".ico") ||
        url.pathname.endsWith(".woff2")
    ) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // HTML pages — network first, cache fallback
    if (request.headers.get("accept")?.includes("text/html")) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
        );
        return;
    }

    // Everything else — network first
    event.respondWith(fetch(request).catch(() => caches.match(request)));
});

// Push notifications (when ready)
self.addEventListener("push", (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || "New update from JARVIS OS",
        icon: "/assets/icon-192.png",
        badge: "/assets/icon-192.png",
        vibrate: [200, 100, 200],
        data: data.url || "/",
        actions: [
            { action: "open", title: "View" },
            { action: "dismiss", title: "Dismiss" }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || "JARVIS OS", options)
    );
});

// Notification click — open the app
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    if (event.action === "dismiss") return;

    event.waitUntil(
        clients.matchAll({ type: "window" }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin) && "focus" in client) {
                    return client.focus();
                }
            }
            return clients.openWindow(event.notification.data || "/");
        })
    );
});

// Background sync (for offline form submissions)
self.addEventListener("sync", (event) => {
    if (event.tag === "waitlist-sync") {
        event.waitUntil(syncWaitlist());
    }
});

async function syncWaitlist() {
    const cache = await caches.open("jarvis-sync-v1");
    const requests = await cache.keys();
    for (const request of requests) {
        const body = await cache.match(request).then((r) => r?.json());
        if (body) {
            try {
                await fetch(request, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });
                await cache.delete(request);
            } catch (e) {
                // Will retry on next sync
            }
        }
    }
}
