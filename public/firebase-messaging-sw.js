// Native Service Worker for St. John Chrysostom Bookclub
// Handles immediate updates and background push notifications

self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Ensure the new service worker takes control of all open clients immediately
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    console.error('Failed to parse push payload:', e);
  }

  const title = payload.notification?.title || 'St. John Chrysostom Bookclub';
  const options = {
    body: payload.notification?.body || 'New spiritual update from the fellowship!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: payload.data || {},
    actions: [
      { action: 'open', title: 'Open Dashboard' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Handle notification click: focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/dashboard');
      }
    })
  );
});
