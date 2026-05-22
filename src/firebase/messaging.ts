'use client';

import { getMessaging, getToken, Messaging } from 'firebase/messaging';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, updateDoc } from 'firebase/firestore';

/**
 * Registers the service worker for messaging and sets up an immediate update strategy.
 */
export async function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    // Force a page reload when a new service worker takes control.
    // This works in tandem with self.skipWaiting() in the service worker.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    try {
      // Register the native service worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      
      // Check for updates periodically or on registration
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // A new service worker is available and skipWaiting() will trigger controllerchange
              console.log('New service worker version detected. Update is imminent.');
            }
          });
        }
      });

      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
}

/**
 * Initializes messaging and returns the instance.
 */
export function initializeMessaging(app: FirebaseApp): Messaging | null {
  try {
    return getMessaging(app);
  } catch (error) {
    console.error('Failed to initialize Firebase Messaging:', error);
    return null;
  }
}

/**
 * Requests notification permission and retrieves the FCM token.
 * If successful, updates the user's profile in Firestore.
 */
export async function requestNotificationPermission(
  app: FirebaseApp,
  db: Firestore,
  userId: string
): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Notifications not supported in this environment.');
    return null;
  }

  try {
    // 1. Check existing permission status
    let permission = Notification.permission;
    
    // 2. Only request if status is 'default' to avoid redundant pop-ups
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.warn('Notification permission was denied or not granted.');
      return null;
    }

    const messaging = initializeMessaging(app);
    if (!messaging) return null;

    // 3. Ensure Service Worker is registered before getting token
    await registerServiceWorker();

    // 4. Get the FCM token using VAPID key
    // NOTE: Ensure your VAPID key is configured in the Firebase Console
    const token = await getToken(messaging, {
      vapidKey: 'BHVGtvLto6RBbItlcBuZA7vJWJGpe15fr9N5tWSTZfKmMq-NG8mChl5S0Zh0lpbdXcOk6Wf1PrPaTVv9YEE_dEo' 
    });

    if (token) {
      // 5. Automatically save the token to the user's profile in Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { fcmToken: token });
      return token;
    } else {
      console.warn('No FCM token generated.');
      return null;
    }
  } catch (error) {
    console.error('Error in requestNotificationPermission:', error);
    return null;
  }
}
