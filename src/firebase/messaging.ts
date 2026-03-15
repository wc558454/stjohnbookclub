
'use client';

import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, updateDoc } from 'firebase/firestore';

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
  try {
    const messaging = initializeMessaging(app);
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied.');
      return null;
    }

    // Get the FCM token
    const token = await getToken(messaging, {
      // VAPID key is required. Replace with your actual VAPID key from the Firebase Console.
      vapidKey: 'BPE_YOUR_VAPID_KEY_HERE' 
    });

    if (token) {
      // Save the token to the user's profile in Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { fcmToken: token });
      return token;
    } else {
      console.warn('No FCM token generated.');
      return null;
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
}

/**
 * Sets up a listener for foreground messages.
 */
export function onForegroundMessage(messaging: Messaging, callback: (payload: any) => void) {
  return onMessage(messaging, callback);
}
