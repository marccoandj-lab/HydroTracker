// Firebase Cloud Messaging Service Worker
// This file enables push notifications even when the app is closed

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase with the same config as the main app
// Note: VAPID key must be configured in Firebase Console
firebase.initializeApp({
    apiKey: "AIzaSyDEwu36dO2dSGdAMDH-w6Z6kHUNldJ7S1E",
    authDomain: "hydrotracker-app.firebaseapp.com",
    projectId: "hydrotracker-app",
    storageBucket: "hydrotracker-app.firebasestorage.app",
    messagingSenderId: "208259706103",
    appId: "1:208259706103:web:454b02875ae18ffd9f77f2"
});

// Retrieve FCM singleton
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
    console.log('Received background message:', payload);

    const notificationTitle = payload.notification.title || '💧 HydroTracker Reminder';
    const notificationOptions = {
        body: payload.notification.body || 'Time to drink water!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'hydrotracker-reminder',
        requireInteraction: true,
        actions: [
            { action: 'drink', title: '💧 Log Water' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
    console.log('Notification click received:', event);
    
    if (event.action === 'drink') {
        // Open the app and focus it
        event.notification.close();
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
        );
    } else if (event.action === 'dismiss') {
        event.notification.close();
    } else {
        // Default click behavior
        event.notification.close();
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
        );
    }
});

console.log('Firebase Cloud Messaging service worker loaded');
