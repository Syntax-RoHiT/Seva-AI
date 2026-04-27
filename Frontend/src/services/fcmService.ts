/**
 * Seva AI — FCM (Firebase Cloud Messaging) Service
 *
 * Registers the browser for push notifications and stores the FCM token
 * in the volunteer's/admin's Firestore document.
 *
 * Requires: VITE_FIREBASE_VAPID_KEY env var (FCM Web Push certificate key)
 */

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { app as firebaseApp } from '../lib/firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

/**
 * Request notification permission and register FCM token.
 * Stores the token in Firestore users/{uid}.
 */
export async function registerFCMToken(uid: string): Promise<string | null> {
  if (!('Notification' in window)) return null;
  if (!VAPID_KEY) {
    console.warn('[FCM] VITE_FIREBASE_VAPID_KEY not set — skipping token registration');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const messaging = getMessaging(firebaseApp);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });

    if (token) {
      await updateDoc(doc(db, 'users', uid), { fcmToken: token });
      console.log('[FCM] Token registered for user', uid);
    }
    return token;
  } catch (err) {
    console.warn('[FCM] Token registration failed:', err);
    return null;
  }
}

/**
 * Set up foreground notification handler.
 * Shows a styled in-app notification when the app is open.
 */
export function setupForegroundNotifications(
  onCriticalAlert: (payload: { title: string; body: string; data: Record<string, string> }) => void
): () => void {
  if (!VAPID_KEY) return () => {};

  try {
    const messaging = getMessaging(firebaseApp);
    const unsubscribe = onMessage(messaging, (payload) => {
      onCriticalAlert({
        title: payload.notification?.title || 'Seva AI Alert',
        body:  payload.notification?.body  || 'New critical zone detected',
        data:  (payload.data as Record<string, string>) || {},
      });
    });
    return unsubscribe;
  } catch {
    return () => {};
  }
}
