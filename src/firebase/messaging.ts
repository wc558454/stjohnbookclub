
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
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    try {
      // Register the native service worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      
      console.log('Service Worker registered with scope:', registration.scope);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New service worker version detected.');
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
    // 1. Request permission
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      console.warn('Notification permission was denied.');
      return null;
    }

    const messaging = initializeMessaging(app);
    if (!messaging) return null;

    // 2. Ensure Service Worker is registered and ready
    const registration = await registerServiceWorker();
    if (!registration) {
      console.error('Could not obtain Service Worker registration.');
      return null;
    }

    // 3. Get the FCM token using VAPID key
    // NOTE: Replace this with your actual VAPID key from Firebase Console
    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: 'BHVGtvLto6RBbItlcBuZA7vJWJGpe15fr9N5tWSTZfKmMq-NG8mChl5S0Zh0lpbdXcOk6Wf1PrPaTVv9YEE_dEo' 
    });

    if (token) {
      console.log('FCM Token generated successfully:', token);
      // 4. Save the token to the user's profile in Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { fcmToken: token });
      return token;
    } else {
      console.warn('No FCM token generated. Check your VAPID key and Firebase project configuration.');
      return null;
    }
  } catch (error) {
    console.error('Error in requestNotificationPermission:', error);
    return null;
  }
}
