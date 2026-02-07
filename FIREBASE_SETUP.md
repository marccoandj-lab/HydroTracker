# 🔐 Firebase Setup Guide for HydroTracker

To enable **Authentication (Google/Email login)** and **Cloud Sync**, you need to set up a Firebase project. Follow these steps:

---

## 📋 Prerequisites

1. Google account
2. 10-15 minutes of time

---

## 🚀 Step-by-Step Setup

### **Step 1: Create a Firebase Project**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"**
3. Enter a project name (e.g., "hydrotracker-app")
4. Disable Google Analytics (optional)
5. Click **"Create project"**
6. Wait for it to finish, then click **"Continue"**

---

### **Step 2: Register Your App**

1. On the project overview page, click the **web icon** (</>) to add a web app
2. Give your app a nickname (e.g., "hydrotracker-web")
3. Check the box for **"Also set up Firebase Hosting"** (optional)
4. Click **"Register app"**
5. You'll see a configuration object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyB...",
  authDomain: "hydrotracker-app.firebaseapp.com",
  projectId: "hydrotracker-app",
  storageBucket: "hydrotracker-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

**Copy these values!** You'll need them in the next step.

---

### **Step 3: Update Your App Configuration**

1. Open `app.js` in your project folder
2. Find the `initializeFirebase()` method (around line 52)
3. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

**⚠️ Important:** Keep your API key private! Don't share it publicly.

---

### **Step 4: Enable Authentication Methods**

1. In Firebase Console, click **"Authentication"** in the left sidebar
2. Click **"Get started"**
3. Enable **"Google"** sign-in:
   - Click **"Google"**
   - Toggle **"Enable"**
   - Add your support email
   - Click **"Save"**
4. Enable **"Email/Password"** sign-in:
   - Click **"Email/Password"**
   - Toggle **"Enable"** for Email/Password
   - Click **"Save"**

---

### **Step 5: Set Up Firestore Database**

1. In Firebase Console, click **"Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. Choose **"Start in test mode"** (allows reads/writes for 30 days)
4. Click **"Next"**
5. Select a location closest to your users (e.g., "us-central")
6. Click **"Enable"**

**⚠️ Important:** Before going to production, update the security rules!

---

### **Step 6: Configure Authorized Domains (Important!)**

1. In Firebase Console, go to **Authentication** → **Settings**
2. Scroll down to **"Authorized domains"**
3. Click **"Add domain"**
4. Add your deployed domain (e.g., `hydrotracker-123.netlify.app`)
5. If testing locally, `localhost` should already be there

---

## ✅ Testing Your Setup

1. Open your app in the browser
2. Click the **Profile** icon (person icon in header)
3. Try signing in with Google or Email
4. If successful, you'll see the profile view with your info!

---

## 🐛 Troubleshooting

### "Firebase SDK not loaded" error?
- Make sure you have an internet connection
- Check that the Firebase CDN links are in your HTML `<head>`

### "auth/unauthorized-domain" error?
- Add your domain to Authorized Domains in Firebase Console

### "auth/popup-closed-by-user" error?
- The user closed the popup before completing sign-in
- This is normal behavior

### Login not working on mobile?
- Make sure you're using HTTPS (not HTTP)
- Enable "Google" sign-in method in Firebase Console

---

## 🔒 Security Rules (For Production)

Once you're ready to launch, update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write only their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 📞 Getting Help

- [Firebase Documentation](https://firebase.google.com/docs/auth)
- [Firebase Auth Web Setup](https://firebase.google.com/docs/auth/web/start)
- Stack Overflow: Tag your question with `firebase-authentication`

---

## 🎉 You're Done!

Your HydroTracker app now has:
- ✅ Working authentication with Google and Email
- ✅ User profiles
- ✅ Cloud data sync
- ✅ Working notification reminders

**Enjoy your fully-featured water tracking app!** 💧
