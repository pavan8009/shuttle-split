// Shuttle Split service worker: lets the app open offline and install as a phone app.
// Bump VERSION whenever you upload a new index.html so phones pick up the update.
const VERSION = 'shuttle-split-v39';
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
