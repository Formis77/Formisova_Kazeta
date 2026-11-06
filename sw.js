// Kazeta service worker: keeps the app itself available offline.
// Your songs live in the app's own storage (IndexedDB), not here.
const CACHE = 'kazeta-v10';
const CORE = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(CORE.map(u => fetch(u, { cache: 'no-store' }).then(r => r.ok && c.put(u, r)).catch(() => {}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.protocol === 'blob:' || url.protocol === 'data:') return;
  // The app page: always ask GitHub for the newest version (skipping the phone's 10-minute cache),
  // and fall back to the saved copy when offline.
  if (req.mode === 'navigate' || (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname))) {
    e.respondWith(fetch(url.href, { cache: 'no-store', credentials: 'same-origin' })
      .then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); } return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // Everything else (icons, fonts): cache first, then network.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});
