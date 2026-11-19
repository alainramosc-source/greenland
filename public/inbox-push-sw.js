/* Inbox notifications only: no fetch handler or offline conversation cache. */
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { /* Use generic text. */ }
  const url = typeof data.url === 'string' && /^\/dashboard\/inbox\?conv=[0-9a-f-]{36}$/i.test(data.url)
    ? data.url : '/dashboard/inbox';
  event.waitUntil(self.registration.showNotification(data.title || 'Mensaje nuevo · Greenland', {
    body: data.body || 'Tienes un mensaje nuevo en el Inbox de Greenland.',
    icon: '/inbox-icon?size=192',
    badge: '/inbox-icon?size=192',
    tag: data.tag || 'inbox-message',
    renotify: false,
    data: { url },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const path = event.notification.data?.url || '/dashboard/inbox';
  const target = new URL(path, self.location.origin);
  if (target.origin !== self.location.origin || !target.pathname.startsWith('/dashboard/inbox')) return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin
      && new URL(client.url).pathname.startsWith('/dashboard/inbox'));
    if (existing) {
      await existing.navigate(target.href);
      return existing.focus();
    }
    return self.clients.openWindow(target.href);
  })());
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
