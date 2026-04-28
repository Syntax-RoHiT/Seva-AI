// Firebase Cloud Messaging Service Worker
// Required for background push notifications when the app is closed

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Parse config from URL parameters passed during registration
const urlParams = new URLSearchParams(location.search);

firebase.initializeApp({
  apiKey:            urlParams.get('apiKey')            || self.__FIREBASE_API_KEY__            || '',
  authDomain:        urlParams.get('authDomain')        || self.__FIREBASE_AUTH_DOMAIN__         || '',
  projectId:         urlParams.get('projectId')         || self.__FIREBASE_PROJECT_ID__          || '',
  storageBucket:     urlParams.get('storageBucket')     || self.__FIREBASE_STORAGE_BUCKET__      || '',
  messagingSenderId: urlParams.get('messagingSenderId') || self.__FIREBASE_MESSAGING_SENDER_ID__ || '',
  appId:             urlParams.get('appId')             || self.__FIREBASE_APP_ID__             || '',
});

const messaging = firebase.messaging();

// Handle background push notifications
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Background message:', payload);

  const { title, body } = payload.notification || {};
  const data = payload.data || {};

  // Show system notification with critical alert styling
  self.registration.showNotification(title || '🚨 Seva AI Alert', {
    body:    body   || 'A critical zone has been identified. Check the dashboard.',
    icon:    '/icons/icon-192x192.png',
    badge:   '/icons/badge-72x72.png',
    tag:     data.reportId || 'seva-alert',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 400],
    actions: [
      { action: 'view',    title: 'View Dashboard' },
      { action: 'dismiss', title: 'Dismiss'        },
    ],
    data: {
      url:         '/',
      reportId:    data.reportId,
      urgencyScore: data.urgencyScore,
    },
  });
});

// Handle notification click — open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find(c => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.navigate(urlToOpen);
      } else {
        clients.openWindow(urlToOpen);
      }
    })
  );
});
