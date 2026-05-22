
'use server';

import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  initializeApp();
}

const adminDb = getFirestore();
const messaging = getMessaging();

/**
 * Sends an in-app notification and an FCM push notification to a specific user.
 */
export async function sendNotificationAction(userId: string, type: string, messageText: string) {
  try {
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) return { success: false, error: 'User not found' };
    const userData = userDoc.data();

    const notifId = Math.random().toString(36).substring(7);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
    
    // 1. Create In-App Notification in Firestore
    await userRef.collection('notifications').doc(notifId).set({
      id: notifId,
      userId,
      type,
      message: messageText,
      isRead: false,
      createdAt: now.toISOString(),
      expiresAt
    });

    // 2. Send Push Notification if FCM token exists
    if (userData?.fcmToken) {
      try {
        await messaging.send({
          token: userData.fcmToken,
          notification: {
            title: type,
            body: messageText,
          },
          webpush: {
            notification: {
              icon: '/icon-192.png',
              badge: '/icon-192.png',
            },
            fcmOptions: {
              link: '/dashboard'
            }
          }
        });
      } catch (pushError) {
        console.error(`Push notification failed for user ${userId}:`, pushError);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in sendNotificationAction:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Broadcasts a notification to all registered members.
 */
export async function broadcastNotificationAction(type: string, messageText: string) {
  try {
    const usersSnap = await adminDb.collection('users').get();
    const promises = usersSnap.docs.map(doc => sendNotificationAction(doc.id, type, messageText));
    await Promise.all(promises);
    return { success: true };
  } catch (error) {
    console.error('Error in broadcastNotificationAction:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sends ONLY a push notification. 
 * Useful for events where the in-app notification is already handled (e.g., in a transaction).
 */
export async function sendPushOnlyAction(userId: string, title: string, body: string) {
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const fcmToken = userDoc.data()?.fcmToken;
    
    if (fcmToken) {
      await messaging.send({
        token: fcmToken,
        notification: { title, body },
        webpush: {
          notification: {
            icon: '/icon-192.png',
          },
          fcmOptions: { link: '/dashboard' } 
        }
      });
    }
  } catch (e) {
    console.error('Push only notification failed:', e);
  }
}
