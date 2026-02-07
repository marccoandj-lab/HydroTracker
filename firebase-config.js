/**
 * Firebase Configuration File
 * 
 * ⚠️  IMPORTANT: To use Firebase authentication and cloud sync features,
 *     you MUST replace the placeholder values below with your actual Firebase config.
 * 
 * ============================================================
 * 🚀 QUICK SETUP (5 minutes):
 * ============================================================
 * 
 * 1. Go to https://console.firebase.google.com/
 * 2. Click "Create a project" 
 * 3. Enter project name: "hydrotracker-app"
 * 4. Click "Create" and wait
 * 5. Click the "</>" (web) icon 
 * 6. Register app with nickname: "hydrotracker-web"
 * 7. COPY the firebaseConfig object shown
 * 8. PASTE IT BELOW, replacing the entire placeholder config
 * 9. Save this file and refresh your app
 * 
 * ============================================================
 * EXAMPLE OF REAL CONFIG:
 * ============================================================
 * 
 * const firebaseConfig = {
 *     apiKey: "AIzaSyABC123DEF456GHI789JKL012MNO345PQR678",
 *     authDomain: "hydrotracker-app.firebaseapp.com",
 *     projectId: "hydrotracker-app",
 *     storageBucket: "hydrotracker-app.appspot.com",
 *     messagingSenderId: "123456789012",
 *     appId: "1:123456789012:web:abc123def456ghi789"
 * };
 * 
 * ============================================================
 * 🔧 ENABLE AUTHENTICATION (Required):
 * ============================================================
 * 
 * 1. In Firebase Console → "Authentication" → "Get started"
 * 2. Enable "Google": Click Google → Toggle Enable → Save
 * 3. Enable "Email/Password": Click Email/Password → Toggle Enable → Save
 * 
 * ============================================================
 * 📖 Full instructions: See FIREBASE_SETUP.md
 * ============================================================
 */

const firebaseConfig = {
    apiKey: "AIzaSyDEwu36dO2dSGdAMDH-w6Z6kHUNldJ7S1E",
    authDomain: "hydrotracker-app.firebaseapp.com",
    projectId: "hydrotracker-app",
    storageBucket: "hydrotracker-app.firebasestorage.app",
    messagingSenderId: "208259706103",
    appId: "1:208259706103:web:454b02875ae18ffd9f77f2"
};

// DO NOT EDIT BELOW THIS LINE
if (typeof module !== 'undefined' && module.exports) {
    module.exports = firebaseConfig;
}
