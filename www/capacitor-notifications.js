// Capacitor Native Push Notifications Plugin
// This file integrates Capacitor Push Notifications with the HydroTracker app

// Register for push notifications
export async function registerPushNotifications() {
    const { PushNotifications } = import('@capacitor/push-notifications');
    
    try {
        // Request permission
        const result = await PushNotifications.requestPermissions();
        if (result.receive === 'granted') {
            // Register
            await PushNotifications.register();
            
            // Add listener for push events
            PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
                console.log('Push action performed:', notification);
                // Handle notification tap
                handleNotificationTap(notification);
            });
            
            console.log('✅ Push notifications registered');
            return true;
        } else {
            console.log('❌ Push notification permission denied');
            return false;
        }
    } catch (error) {
        console.error('❌ Error registering push notifications:', error);
        return false;
    }
}

// Get FCM token for remote notifications
export async function getFCMToken() {
    const { PushNotifications } = import('@capacitor/push-notifications');
    
    try {
        const token = await PushNotifications.getDeliveredNotifications();
        console.log('Delivered notifications:', token);
        return token;
    } catch (error) {
        console.error('Error getting FCM token:', error);
        return null;
    }
}

// Schedule local notification (for scheduled reminders)
export async function scheduleReminder(title, body, triggerTime) {
    const { LocalNotifications } = import('@capacitor/local-notifications');
    
    try {
        await LocalNotifications.schedule({
            notifications: [{
                title: title,
                body: body,
                id: Math.floor(Math.random() * 1000),
                schedule: {
                    at: new Date(triggerTime),
                    allowWhileIdle: true
                },
                actionTypeId: 'OPEN_APP',
                extra: {
                    route: 'home'
                }
            }]
        });
        console.log('✅ Reminder scheduled:', triggerTime);
        return true;
    } catch (error) {
        console.error('❌ Error scheduling reminder:', error);
        return false;
    }
}

// Cancel all scheduled reminders
export async function cancelAllReminders() {
    const { LocalNotifications } = import('@capacitor/local-notifications');
    
    try {
        await LocalNotifications.cancelAll();
        console.log('✅ All reminders cancelled');
        return true;
    } catch (error) {
        console.error('❌ Error cancelling reminders:', error);
        return false;
    }
}

// Handle when user taps on notification
function handleNotificationTap(notification) {
    // Navigate to app home screen
    window.location.href = '/';
}

// Initialize notifications on app start
export async function initNotifications() {
    const { PushNotifications, LocalNotifications } = import('@capacitor/push-notifications');
    
    // Add listeners
    PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success:', token.value);
    });
    
    PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
    });
    
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received:', notification);
    });
    
    // Register for push
    await registerPushNotifications();
}
