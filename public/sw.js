
// This is the service worker that handles background notifications.
// It must be placed in the public/ folder.

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// These configuration values should match your src/firebase/config.ts
firebase.initializeApp({
  apiKey: "AIzaSyAa_9qBmxDIy-qG3iMke8V6Ad--SYLRKtk",
  authDomain: "studio-411540902-b46d7.firebaseapp.com",
  projectId: "studio-411540902-b46d7",
  storageBucket: "studio-411540902-b46d7.appspot.com",
  messagingSenderId: "261448411893",
  appId: "1:261448411893:web:7636459105ce6ceec7b3bc"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
