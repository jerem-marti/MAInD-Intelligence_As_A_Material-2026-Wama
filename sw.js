/**
 * Service Worker for MAInD Wama PWA
 * Minimal SW to enable "Add to Home Screen" and standalone mode on iOS.
 */

const CACHE_NAME = 'wama-v1';

// Install - cache shell assets
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Activate - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Fetch - network first, no offline cache needed for this app
self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request));
});
