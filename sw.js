// Shuttle Split service worker: lets the app open offline and install as a phone app.
// Bump VERSION whenever you upload a new index.html so phones pick up the update.
const VERSION = 'shuttle-split-v72';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const u0 = new URL(req.url);
  // Photos shared into the app from Instagram, Gallery, WhatsApp… (Android): keep them, then open the Club composer.
  if (req.method === 'POST' && u0.origin === self.location.origin && u0.pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      try {
        const form = await req.formData(), c = await caches.open('share-inbox');
        const f = form.getAll('media').find(x => x && x.size);
        if (f) await c.put('shared-image', new Response(f, { headers: { 'Content-Type': f.type || 'image/jpeg' } }));
        const txt = [form.get('title'), form.get('text'), form.get('url')].filter(Boolean).join(' ').trim();
        if (txt) await c.put('shared-text', new Response(txt));
      } catch (err) {}
      const g = u0.searchParams.get('g');
      return Response.redirect('./?' + (g ? 'g=' + encodeURIComponent(g) + '&' : '') + 'shared=1#club', 303);
    })());
    return;
  }
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only handle this site's own files; Firebase and fonts manage their own caching.
  if (url.origin !== self.location.origin) return;
  // Network first so new versions show up, falling back to the cached copy offline.
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});

// Phone notifications (sent by the Firebase Cloud Function through FCM).
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { data: { title: 'Shuttle Split', body: e.data ? e.data.text() : '' } }; }
  const n = d.notification || {}, x = d.data || {};
  const title = n.title || x.title || 'Shuttle Split';
  const body = n.body || x.body || '';
  const link = x.link || (d.fcmOptions && d.fcmOptions.link) || './';
  e.waitUntil(self.registration.showNotification(title, { body, icon: 'icon-192.png', badge: 'icon-192.png', data: { link }, tag: x.tag || undefined }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const link = (e.notification.data && e.notification.data.link) || './';
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    // app already open: tell it where to go (works on iPhone, where navigate() doesn't), then bring it to the front
    for (const c of list) { if ('focus' in c) { try { c.postMessage({ type: 'open', link }); } catch (err) {} return c.focus(); } }
    return clients.openWindow(link);
  }));
});
