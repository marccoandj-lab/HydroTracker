# HydroTracker - Native Android App Build Guide

This guide explains how to build a native Android app from your HydroTracker web app using Capacitor.

## ✅ What's Already Done

- ✅ Capacitor project initialized
- ✅ Android platform added
- ✅ Firebase Cloud Messaging configured
- ✅ Notification channels set up
- ✅ All web files copied to Android assets

## 📱 Building the Android App (APK File)

### Prerequisites

1. **Java Development Kit (JDK) 17** or higher
2. **Android Studio** (free from developer.android.com)
3. **Node.js** (for npm commands)

### Step 1: Install Android Studio

1. Download Android Studio from: https://developer.android.com/studio
2. Install with default settings
3. Open Android Studio and let it download SDK components

### Step 2: Build the APK

Run this command in your project folder:

```bash
npm run build:android
```

This will:
1. Copy all web files to Android assets
2. Build the debug APK
3. Output to: `android/app/build/outputs/apk/debug/app-debug.apk`

### Step 3: Install on Your Phone

1. Transfer the APK file to your phone
2. Open the APK on your phone
3. Android will ask permission to install (tap "Install anyway")
4. Once installed, open the HydroTracker app

## 🔔 How Notifications Work

### For Native Android App:

1. **First Launch**: App will ask for notification permission
2. **Grant Permission**: Tap "Allow"
3. **Enable Reminders**: Go to Settings → Enable Reminders
4. **Scheduled Times**: Set your reminder times (09:00, 13:00, 18:00)
5. **Notifications**: Even when app is closed, you'll receive reminders like SMS!

### For Web Version (Vercel):

Notifications only work when the browser tab is open. For background notifications, use the native Android app.

## 📁 File Structure

```
HydroTracker/
├── android/                 # Native Android app
│   ├── app/
│   │   ├── src/
│   │   │   └── main/
│   │   │       ├── java/com/hydrotracker/app/
│   │   │       │   └── MainActivity.java
│   │   │       └── assets/public/  # Your web files
│   │   └── google-services.json
│   └── build.gradle
├── www/                     # Web build output
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   └── ...
└── package.json
```

## 🛠️ Making Changes

### If you change web files:

1. Edit files in project root
2. Run: `npm run build`
3. This copies to `android/app/src/main/assets/public`

### To rebuild APK:

```bash
npm run build:android
```

## 🔧 Troubleshooting

### "JAVA_HOME not set"

Add Java to PATH:
```bash
# Windows
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set PATH=%JAVA_HOME%\bin;%PATH%

# macOS
export JAVA_HOME=/Applications/Android\ Studio.app/Contents/jbr
export PATH=$JAVA_HOME/bin:$PATH
```

### "ANDROID_HOME not set"

Set ANDROID_HOME:
```bash
# Windows
set ANDROID_HOME=C:\Users\[YOUR_USER]\AppData\Local\Android\Sdk

# macOS
export ANDROID_HOME=$HOME/Library/Android/sdk
```

### Build fails

1. Open Android Studio
2. Go to **SDK Manager**
3. Install:
   - Android SDK Platform 34
   - Android SDK Build-Tools
   - Google Play services
   - Google Repository

## 📱 Installing on Multiple Devices

The APK file (`android/app/build/outputs/apk/debug/app-debug.apk`) can be:
- Sent via WhatsApp/Telegram
- Uploaded to Google Drive
- Emailed to yourself
- Transferred via USB cable

## 🔐 App Signing (For Play Store)

For release to Google Play Store:

1. Create a keystore:
```bash
keytool -genkeypair -v -keystore my-release-key.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias hydrotracker
```

2. Configure signing in `android/app/build.gradle`

3. Build release APK:
```bash
cd android
./gradlew assembleRelease
```

## 📞 Support

If you have issues:
1. Check Android Studio SDK Manager is installed
2. Ensure JDK 17+ is installed
3. Run `npm run build:android` from project root
4. Open Android project in Android Studio for detailed errors

---

**Quick Start**: Run `npm run build:android` to build your APK!
