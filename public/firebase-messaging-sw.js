/*
 * Firebase Cloud Messaging Service Worker for St. John Chrysostom Bookclub
 * Handles background push notifications with FCM SDK.
 */

// Use compatibility SDKs for service worker environment
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Your Firebase project configuration
// Ensure 'messagingSenderId' is correctly set as this is critical for FCM
const firebaseConfig = {
  apiKey: "AIzaSyAa_9qBmxDIy-qG3iMke8V6Ad--SYLRKtk",
  authDomain: "studio-411540902-b46d7.firebaseapp.com",
  projectId: "studio-411540902-b46d7",
  storageBucket: "studio-411540902-b46d7.firebasestorage.app",
  messagingSenderId: "261448411893",
  appId: "1:261448411893:web:7636459105ce6ceec7b3bc",
  measurementId: "G-JT1HWHPKQM"
};

// Initialize the Firebase app in the service worker
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'St. John Chrysostom Bookclub';
  const notificationOptions = {
    body: payload.notification?.body || 'New message from the fellowship.',
    icon: payload.notification?.icon || '/icon-192.png',
    badge: payload.notification?.badge || '/icon-192.png',
    data: payload.data?.link || '/dashboard',
    vibrate: [100, 50, 100],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.');
  event.notification.close();
  
  const urlToOpen = event.notification.data || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
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
