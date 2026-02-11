# Firebase Cloud Messaging Setup Guide

## For Background Notifications (Like SMS/Instagram)

To get notifications that appear even when the app is closed (background notifications), you need to set up Firebase Cloud Messaging properly.

## Step 1: Get Your VAPID Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `hydrotracker-app`
3. Click the gear icon (⚙️) next to "Project Overview" → **Project Settings**
4. Go to the **Cloud Messaging** tab
5. Scroll down to **Web Push certificates**
6. If you don't have a key pair, click **Generate Key Pair**
7. Copy the **Public Key** (starts with "B")

## Step 2: Update the Code

Replace the VAPID key in `app.js`:

```javascript
// In app.js, find this line:
const vapidKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

// Replace with your actual VAPID key from Firebase Console:
const vapidKey = 'YOUR_ACTUAL_VAPID_KEY_HERE';
```

## Step 3: Deploy

After updating the VAPID key:
```bash
vercel --prod
```

## Step 4: Install as PWA (IMPORTANT for Mobile)

**On iPhone/iPad:**
1. Open Safari and go to your Vercel URL
2. Tap the Share button (⬆️)
3. Tap "Add to Home Screen"
4. Open the app from the home screen icon
5. Enable notifications in app settings

**On Android:**
1. Open Chrome and go to your Vercel URL
2. Tap the menu (⋮) → "Add to Home Screen" or "Install App"
3. Open the app from the home screen icon
4. Enable notifications in app settings

## How It Works

- **Foreground notifications**: Show when you're using the app (in-app toast)
- **Background notifications**: Show like SMS even when app is closed (requires PWA install)

## Troubleshooting

**Notifications not working?**
1. Check browser console for errors
2. Make sure you replaced the VAPID key with your actual key
3. On mobile, make sure you installed the PWA (not just bookmarked)
4. Check that notifications are enabled in browser settings

**Still not working?**
Run this in browser console:
```javascript
waterTracker.diagnoseNotifications()
```

## Important Note

The current VAPID key in the code is a placeholder/example and won't work. You MUST replace it with your own key from Firebase Console.
