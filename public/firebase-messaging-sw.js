
/*
 * Service worker for handling Firebase Cloud Messaging push events.
 * This file must be located in the public root directory.
 */

self.addEventListener('push', (event) => {
  if (event.data) {
    const payload = event.data.json();
    
    // Extract title and body from the FCM payload
    const title = payload.notification?.title || 'St. John Chrysostom Bookclub';
    const body = payload.notification?.body || 'You have a new fellowship update.';
    const icon = '/icon-192.png';
    const badge = '/icon-192.png';

    const options = {
      body,
      icon,
      badge,
      vibrate: [100, 50, 100],
      data: {
        url: payload.fcmOptions?.link || '/dashboard'
      }
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
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
