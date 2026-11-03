// Service worker Portal A9: menerima notifikasi jadwal walau portal sedang tertutup.
// Letakkan di folder yang sama dengan index.html (satu folder dengan script.js).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

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
