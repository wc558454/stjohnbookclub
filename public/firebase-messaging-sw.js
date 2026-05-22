
/*
 * Native Service Worker for St. John Chrysostom Bookclub
 * Handles background push notifications.
 */

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');
  let data = {};
  
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    console.warn('[Service Worker] Push event data was not JSON:', event.data.text());
    data = { notification: { title: 'Bookclub Update', body: event.data.text() } };
  }

  const title = data.notification?.title || 'St. John Chrysostom Bookclub';
  const options = {
    body: data.notification?.body || 'New message from the fellowship.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.fcmOptions?.link || data.data?.link || '/dashboard',
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Open App' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.');
  event.notification.close();

  const urlToOpen = event.notification.data || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(clients.claim());
});
