// Simple Service Worker for PWA compatibility
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Pass-through fetch for real-time online synchronization
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
