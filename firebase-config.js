// Firebase Configuration
// Get these values from your Firebase Console: Project Settings > General > Your Apps
const firebaseConfig = {
  apiKey: "AIzaSyDEwu36dO2dSGdAMDH-w6Z6kHUNldJ7S1E",
  authDomain: "hydrotracker-app.firebaseapp.com",
  projectId: "hydrotracker-app",
  storageBucket: "hydrotracker-app.firebasestorage.app",
  messagingSenderId: "208259706103",
  appId: "1:208259706103:web:454b02875ae18ffd9f77f2"
};

// Make it available globally for non-module scripts
if (typeof window !== 'undefined') {
  window.firebaseConfig = firebaseConfig;
}