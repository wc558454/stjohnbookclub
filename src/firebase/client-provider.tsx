
'use client';

import React, { useMemo, useEffect, type ReactNode } from 'react';
import { FirebaseProvider, useFirebase } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { registerServiceWorker, requestNotificationPermission } from '@/firebase/messaging';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * Handles automatic notification permission prompting and token generation.
 * This runs for all members (old and new) when they are signed in.
 */
function NotificationHandler() {
  const { user, firestore, firebaseApp } = useFirebase();

  useEffect(() => {
    if (user?.uid && firestore && firebaseApp) {
      // Browsers may block requestPermission() without a user gesture.
      // However, we call this on app load/auth as requested.
      // If permission is already granted/denied, this returns instantly.
      // If default, it will attempt to prompt.
      requestNotificationPermission(firebaseApp, firestore, user.uid)
        .then(token => {
          if (token) {
            console.log('Push notifications automatically enabled for member.');
          }
        })
        .catch(err => {
          console.warn('Auto-notification permission prompt deferred or blocked by browser:', err);
        });
    }
  }, [user?.uid, firestore, firebaseApp]);

  return null;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []);

  useEffect(() => {
    // Register the service worker immediately when the app loads
    // This ensures background push is ready as soon as possible
    if (typeof window !== 'undefined') {
      registerServiceWorker().then(reg => {
        if (reg) console.log('Background Push infrastructure initialized.');
      });
    }
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      <NotificationHandler />
      {children}
    </FirebaseProvider>
  );
}
