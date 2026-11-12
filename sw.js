// Service worker Portal A9: notifikasi jadwal walau portal tertutup + cadangan offline.
// Letakkan di folder yang sama dengan index.html (satu folder dengan script.js).
// Bagian push dan notificationclick sama dengan sw.js sebelumnya; yang ditambah hanya cache dan fetch.
const V = 'a9-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())
));

// Selalu ambil versi terbaru dari server (tetap terintegrasi); cache hanya dipakai saat offline.
// Supabase, Google Drive, dan situs lain tidak pernah di-cache.
self.addEventListener('fetch', e => {
    const r = e.request;
    if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
    e.respondWith((async () => {
        try {
            const res = await fetch(r);
            if (res && res.ok) { const c = res.clone(); caches.open(V).then(ca => ca.put(r, c)); }
            return res;
        } catch (err) {
            const hit = await caches.match(r);
            if (hit) return hit;
            if (r.mode === 'navigate') { const home = (await caches.match('./')) || (await caches.match('index.html')); if (home) return home; }
            return Response.error();
        }
    })());
});

self.addEventListener('push', e => {
    let d = {};
    try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
    e.waitUntil(self.registration.showNotification(d.title || 'Portal A9', {
        body: d.body || '',
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        tag: d.tag || 'a9-jadwal',
        renotify: true,
        data: { url: d.url || './' }
    }));
});

self.addEventListener('notificationclick', e => {
    e.notification.close();
    const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
    e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        for (const c of list) if ('focus' in c) return c.focus();
        return self.clients.openWindow(url);
    }));
});
