// BrickTally Service Worker
// Version: 1
const CACHE_VERSION = 'v20260222-000938';
const STATIC_CACHE = `bricktally-static-${CACHE_VERSION}`;
const API_CACHE = `bricktally-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `bricktally-images-${CACHE_VERSION}`;

// Static assets to precache
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/verify.html',
    '/styles.css',
    // Note: manifest.json excluded to allow Vercel rewrites for preview/prod
    '/assets/favicon.svg',
    '/assets/bricktally-icon.png',
    '/assets/bricktally-icon-192.png',
    '/assets/bricktally-icon-512.png',
    '/assets/bricktally-icon-maskable-192.png',
    '/assets/bricktally-icon-maskable-512.png',
    '/assets/og-image.png',
    '/assets/fireworks.json',
    '/js/lottie.min.js',
    '/js/pako.min.js',
    '/changelog.html',
    '/changelog.json'
];

// Install event - precache static assets
self.addEventListener('install', (event) => {
    console.log('[BrickTally:ServiceWorker] Installing...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[BrickTally:ServiceWorker] Precaching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .catch((error) => {
                console.error('[BrickTally:ServiceWorker] Precaching failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[BrickTally:ServiceWorker] Activating...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // Delete old cache versions
                        if (cacheName.startsWith('bricktally-') &&
                            cacheName !== STATIC_CACHE &&
                            cacheName !== API_CACHE &&
                            cacheName !== IMAGE_CACHE) {
                            console.log('[BrickTally:ServiceWorker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[BrickTally:ServiceWorker] Claiming clients');
                return self.clients.claim();
            })
    );
});

// Message event - controlled skipWaiting from page
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Fetch event - route requests to appropriate caching strategy
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle HTTP/HTTPS requests, ignore chrome-extension:// and others
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Handle API requests (Network First with timeout)
    if (url.pathname.startsWith('/api/rebrickable')) {
        event.respondWith(networkFirstWithTimeout(request, API_CACHE, 5000));
        return;
    }

    // Handle Rebrickable CDN images (Cache First)
    if (url.hostname === 'cdn.rebrickable.com') {
        event.respondWith(cacheFirst(request, IMAGE_CACHE));
        return;
    }

    // Handle proxied Rebrickable images (Cache First) — fallback for blocked CDN
    if (url.pathname === '/api/image-proxy') {
        event.respondWith(cacheFirst(request, IMAGE_CACHE));
        return;
    }

    // Handle static assets (Cache First)
    if (isStaticAsset(url)) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }

    // Default: Network only for everything else (with fallback to avoid loops)
    event.respondWith(
        fetch(request).catch(function() {
            return new Response('Network unavailable', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'text/plain' }
            });
        })
    );
});

// Helper: Check if request is for a static asset
function isStaticAsset(url) {
    // Local HTML files
    if (url.origin === self.location.origin &&
        (url.pathname === '/' || url.pathname.endsWith('.html'))) {
        return true;
    }

    // CSS files
    if (url.pathname.endsWith('.css')) {
        return true;
    }

    // Assets folder (images, icons, animations)
    if (url.pathname.startsWith('/assets/')) {
        return true;
    }

    // JavaScript files
    if (url.pathname.startsWith('/js/')) {
        return true;
    }

    // JSON data files
    if (url.pathname === '/changelog.json') {
        return true;
    }

    return false;
}

// Strategy: Cache First
async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        console.log('[BrickTally:Cache] Cache hit:', request.url);
        return cachedResponse;
    }

    console.log('[BrickTally:Cache] Cache miss, fetching:', request.url);

    try {
        const networkResponse = await fetch(request);

        // Cache the new response if successful (only GET can be cached)
        if (networkResponse.ok && request.method === 'GET') {
            cache.put(request, networkResponse.clone());
            console.log('[BrickTally:Cache] Cached new resource:', request.url);
        }

        return networkResponse;
    } catch (error) {
        console.log('[BrickTally:Cache] Network failed and no cache available:', request.url);

        // For images, return a network error so onerror handler fires
        // The client-side will then show the placeholder and fallback info
        if (request.url.includes('cdn.rebrickable.com') ||
            request.url.includes('/api/image-proxy') ||
            request.destination === 'image' ||
            request.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
            // Return error response to trigger onerror
            return new Response(null, {
                status: 404,
                statusText: 'Not Found'
            });
        }

        // For non-images, throw the error
        throw error;
    }
}

// Strategy: Network First with Timeout
async function networkFirstWithTimeout(request, cacheName, timeout) {
    try {
        const cache = await caches.open(cacheName);

        // Try network with timeout
        const networkPromise = fetch(request).then((response) => {
            if (response.ok) {
                // Cache the successful response
                cache.put(request, response.clone());
            }
            return response;
        });

        // Race between network and timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Network timeout')), timeout);
        });

        try {
            const response = await Promise.race([networkPromise, timeoutPromise]);
            console.log('[BrickTally:Network] Network success:', request.url);
            return response;
        } catch (networkError) {
            // Network failed or timed out, try cache
            console.log('[BrickTally:Network] Network failed, trying cache:', request.url);
            const cachedResponse = await cache.match(request);

            if (cachedResponse) {
                console.log('[BrickTally:Cache] Serving from cache (offline):', request.url);
                return cachedResponse;
            }

            // No cache available, throw error
            throw new Error('No cached response available');
        }
    } catch (error) {
        console.error('[BrickTally:Network] Network First failed:', error);

        // Return a custom offline response for API requests
        return new Response(
            JSON.stringify({
                error: 'Offline',
                message: 'Unable to fetch data. Please check your connection.'
            }),
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}
