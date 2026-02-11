// HydroTracker - Modern Water Consumption Tracker with Auth & Notifications

// Configuration Constants
const CONFIG = {
    DEFAULT_DAILY_GOAL: 2000, // ml
    DEFAULT_REMINDER_TIMES: ['09:00', '13:00', '18:00'], // 3 times per day (9 AM, 1 PM, 6 PM)
    REMINDER_CHECK_INTERVAL: 60000, // ms (1 minute)
    MAX_UNDO_HISTORY: 10,
    CHART_DAYS: 7,
    HYDRATION_HERO_THRESHOLD: 3000, // ml
    WEEK_WARRIOR_DAYS: 7,
    DEBUG_MODE: false // Set to true to enable console logs
};

// Storage Keys
const STORAGE_KEYS = {
    TRACKER_DATA: 'waterTrackerData',
    REMINDERS: 'hydrotracker-reminders',
    THEME: 'hydrotracker-theme',
    GUEST: 'hydrotracker-guest'
};

class WaterTracker {
    constructor() {
        this.dailyGoal = CONFIG.DEFAULT_DAILY_GOAL;
        this.currentAmount = 0;
        this.history = [];
        this.activities = [];
        this.streak = 0;
        this.bestStreak = 0;
        this.goalsReached = 0;
        this.achievements = {
            'first-drop': false,
            'goal-master': false,
            'week-warrior': false,
            'hydration-hero': false
        };
        this.undoHistory = [];

        // Auth & Notification state
        this.currentUser = null;
        this.reminderInterval = null;
        this.reminderSettings = {
            enabled: false,
            scheduledTimes: [...CONFIG.DEFAULT_REMINDER_TIMES], // 3 times per day
            lastReminders: {}, // Track last sent time for each scheduled time
            fcmToken: null,
            userGrantedPermission: false // Track if user granted permission
        };
        this.messaging = null;

        // DOM Element Cache
        this.domCache = {};

        // Page Visibility API to pause animations/intervals when backgrounded
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopAnimations();
            } else {
                this.resumeAnimations();
            }
        });

        this.init();
    }

    stopAnimations() {
        if (this.bubbleInterval) {
            clearInterval(this.bubbleInterval);
            this.bubbleInterval = null;
        }
    }

    resumeAnimations() {
        if (this.currentAmount > 0) {
            this.startBubbleAnimation();
        }
    }

    // Helper method for debug logging
    log(...args) {
        if (CONFIG.DEBUG_MODE) {
            console.log(...args);
        }
    }

    // Cache DOM elements for better performance
    cacheDOM() {
        this.domCache = {
            currentAmountEl: document.getElementById('currentAmount'),
            progressFill: document.querySelector('.progress-fill'),
            progressText: document.querySelector('.progress-text'),
            streakEl: document.getElementById('streak'),
            bestStreakEl: document.getElementById('bestStreak'),
            totalWaterEl: document.getElementById('totalWater'),
            goalsMetEl: document.getElementById('goalsMet'),
            reminderToggle: document.getElementById('reminderToggle'),
            reminderRetry: document.getElementById('reminderRetry'),
            undoBtn: document.getElementById('undoBtn'),
            authModal: document.getElementById('authModal'),
            loginScreen: document.getElementById('loginScreen'),
            mainApp: document.getElementById('mainApp')
        };
    }

    init() {
        this.initializeFirebase();
        this.setupAuthListener();
        this.setupLoginScreenListeners();

        // Warn if running from file:// protocol
        if (window.location.protocol === 'file:') {
            console.warn('Running from file:// - some features may not work');
            this.showToast('Use Local Server', 'Run "npm start" for full functionality including notifications', 'error');
        }

        // Check if user is already logged in or using as guest
        const isGuest = localStorage.getItem(STORAGE_KEYS.GUEST) === 'true';
        const hasUser = localStorage.getItem(STORAGE_KEYS.TRACKER_DATA) !== null;

        if (isGuest || hasUser) {
            // User has accessed app before or is in guest mode
            this.showMainApp();
            this.loadData();
            this.cacheDOM(); // Cache DOM elements
            this.loadReminderSettings();
            this.setupEventListeners();
            this.createParticles();
            this.startBubbleAnimation();
            this.updateUI();
            this.renderChart();
            this.checkNewDay();
            this.checkAchievements();
            this.updateUndoButton();
        } else {
            // Show login screen for new users
            this.showLoginScreen();
        }

        this.hideLoadingScreen();
    }

    // Show Login Screen
    showLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        const mainApp = document.getElementById('mainApp');

        if (loginScreen) loginScreen.classList.remove('hidden');
        if (mainApp) mainApp.classList.add('hidden');
        document.body.style.overflow = 'hidden';

        // Show/hide Firebase notice based on configuration
        const firebaseNotice = document.getElementById('firebaseNotice');
        if (firebaseNotice) {
            if (this.auth) {
                // Firebase is configured, hide the notice
                firebaseNotice.classList.add('hidden');
            } else {
                // Firebase is not configured, show the notice
                firebaseNotice.classList.remove('hidden');
            }
        }
    }

    // Show Main App
    showMainApp() {
        const loginScreen = document.getElementById('loginScreen');
        const mainApp = document.getElementById('mainApp');

        if (loginScreen) loginScreen.classList.add('hidden');
        if (mainApp) {
            mainApp.classList.remove('hidden');
            // Re-trigger animations
            mainApp.style.animation = 'fadeIn 0.5s ease';
        }
        document.body.style.overflow = '';
    }

    // Setup Login Screen Event Listeners
    setupLoginScreenListeners() {
        // Auth tabs on login screen
        document.querySelectorAll('#loginScreen .auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;

                // Update active tab
                document.querySelectorAll('#loginScreen .auth-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Show corresponding form
                const loginForm = document.querySelector('#loginScreen #loginForm');
                const signupForm = document.querySelector('#loginScreen #signupForm');

                if (tabName === 'login') {
                    if (loginForm) loginForm.classList.remove('hidden');
                    if (signupForm) signupForm.classList.add('hidden');
                } else {
                    if (loginForm) loginForm.classList.add('hidden');
                    if (signupForm) signupForm.classList.remove('hidden');
                }
            });
        });

        // Google Sign In from login screen
        const googleBtn = document.getElementById('googleSignInBtnMain');
        if (googleBtn) {
            googleBtn.addEventListener('click', async () => {
                try {
                    await this.signInWithGoogle();
                    this.showMainApp();
                } catch (error) {
                    console.error('Login error:', error);
                }
            });
        }

        // Email Login from login screen
        const loginBtn = document.getElementById('loginBtnMain');
        if (loginBtn) {
            loginBtn.addEventListener('click', async () => {
                const email = document.getElementById('loginEmailMain').value;
                const password = document.getElementById('loginPasswordMain').value;

                if (!email || !password) {
                    this.showToast('Error', 'Please enter both email and password', 'error');
                    return;
                }

                try {
                    await this.loginWithEmail(email, password);
                    this.showMainApp();
                    this.setupEventListeners();
                    this.createParticles();
                    this.startBubbleAnimation();
                    this.updateUI();
                    this.renderChart();
                    this.checkNewDay();
                } catch (error) {
                    console.error('Login error:', error);
                }
            });
        }

        // Email Signup from login screen
        const signupBtn = document.getElementById('signupBtnMain');
        if (signupBtn) {
            signupBtn.addEventListener('click', async () => {
                const name = document.getElementById('signupNameMain').value;
                const email = document.getElementById('signupEmailMain').value;
                const password = document.getElementById('signupPasswordMain').value;

                if (!name || !email || !password) {
                    this.showToast('Error', 'Please fill in all fields', 'error');
                    return;
                }

                if (password.length < 6) {
                    this.showToast('Error', 'Password must be at least 6 characters', 'error');
                    return;
                }

                try {
                    await this.signupWithEmail(name, email, password);
                    this.showMainApp();
                    this.setupEventListeners();
                    this.createParticles();
                    this.startBubbleAnimation();
                    this.updateUI();
                    this.renderChart();
                    this.checkNewDay();
                } catch (error) {
                    console.error('Signup error:', error);
                }
            });
        }

        // Enter key support for login form
        const loginPasswordInput = document.getElementById('loginPasswordMain');
        if (loginPasswordInput) {
            loginPasswordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    document.getElementById('loginBtnMain').click();
                }
            });
        }

        // Enter key support for signup form
        const signupPasswordInput = document.getElementById('signupPasswordMain');
        if (signupPasswordInput) {
            signupPasswordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    document.getElementById('signupBtnMain').click();
                }
            });
        }

        // Continue as Guest
        const guestBtn = document.getElementById('continueAsGuest');
        if (guestBtn) {
            guestBtn.addEventListener('click', () => {
                localStorage.setItem('hydrotracker-guest', 'true');
                this.showMainApp();
                this.setupEventListeners();
                this.createParticles();
                this.startBubbleAnimation();
                this.updateUI();
                this.renderChart();
                this.checkNewDay();
                this.showToast('Welcome!', 'You are using HydroTracker as a guest', 'info');
            });
        }
    }

    // Firebase Initialization
    initializeFirebase() {
        // Firebase configuration is loaded from firebase-config.js
        // Check if firebaseConfig exists and has valid values

        if (typeof firebaseConfig === 'undefined') {
            console.log('ℹ️ Firebase config not found. Running in local-only mode.');
            console.log('ℹ️ To enable cloud sync and authentication, set up Firebase (see FIREBASE_SETUP.md)');
            this.auth = null;
            this.db = null;
            this.messaging = null;
            return;
        }

        // Check if config still has placeholder values
        if (!firebaseConfig.apiKey ||
            firebaseConfig.apiKey === 'YOUR_API_KEY_HERE' ||
            firebaseConfig.apiKey.includes('YOUR_') ||
            firebaseConfig.apiKey.length < 10) {
            console.log('ℹ️ Firebase config has placeholder values. Running in local-only mode.');
            console.log('ℹ️ To enable cloud sync and authentication, update firebase-config.js with your actual Firebase config.');
            console.log('ℹ️ See FIREBASE_SETUP.md for instructions.');
            this.auth = null;
            this.db = null;
            this.messaging = null;
            return;
        }

        // Initialize Firebase
        if (typeof firebase !== 'undefined') {
            try {
                // Check if Firebase is already initialized
                if (!firebase.apps.length) {
                    firebase.initializeApp(firebaseConfig);
                }
                this.auth = firebase.auth();
                this.db = firebase.firestore();

                // Initialize Firebase Cloud Messaging
                if (firebase.messaging) {
                    try {
                        this.messaging = firebase.messaging();
                        console.log('✅ Firebase Cloud Messaging initialized');

                        // Listen for foreground messages
                        this.messaging.onMessage((payload) => {
                            console.log('Foreground message received:', payload);
                            this.showToast(
                                payload.notification.title || '💧 Reminder',
                                payload.notification.body || 'Time to drink water!',
                                'info'
                            );
                        });
                    } catch (messagingError) {
                        console.warn('⚠️ FCM initialization failed (VAPID key may not be configured):', messagingError);
                        this.messaging = null;
                    }
                }

                console.log('✅ Firebase initialized successfully');
            } catch (error) {
                console.error('❌ Firebase initialization error:', error);
                console.log('ℹ️ Running in local-only mode due to Firebase error');
                this.auth = null;
                this.db = null;
                this.messaging = null;
            }
        } else {
            console.warn('⚠️ Firebase SDK not loaded');
            this.auth = null;
            this.db = null;
            this.messaging = null;
        }
    }

    // Auth State Listener
    setupAuthListener() {
        if (!this.auth) return;

        this.auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            this.updateAuthUI();

            if (user) {
                // User is signed in, load their data from cloud
                this.loadUserDataFromCloud();

                // Check if we're on login screen, if so show main app
                const loginScreen = document.getElementById('loginScreen');
                if (loginScreen && !loginScreen.classList.contains('hidden')) {
                    this.showMainApp();
                    this.setupEventListeners();
                    this.createParticles();
                    this.startBubbleAnimation();
                    this.updateUI();
                    this.renderChart();
                    this.checkNewDay();
                }

                this.showToast('Welcome back!', `Logged in as ${user.email}`, 'success');
            } else {
                // User is signed out
                this.log('User signed out');
            }
        });
    }

    // Update Auth UI based on login state
    updateAuthUI() {
        const profileBtn = document.getElementById('profileBtn');
        const authLoginSection = document.getElementById('authLoginSection');
        const profileSection = document.getElementById('profileSection');
        const authTitle = document.getElementById('authTitle');

        if (this.currentUser) {
            // User is logged in
            if (profileBtn) {
                profileBtn.classList.add('logged-in');
                profileBtn.innerHTML = `
                    <img src="${this.currentUser.photoURL || ''}" alt="Profile" class="profile-img" 
                         onerror="this.style.display='none'; this.parentElement.innerHTML='<svg viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><path d=\\'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\\'/><circle cx=\\'12\\' cy=\\'7\\' r=\\'4\\'/></svg>'">
                `;
            }

            if (authLoginSection) authLoginSection.classList.add('hidden');
            if (profileSection) profileSection.classList.remove('hidden');
            if (authTitle) authTitle.textContent = 'Your Profile';

            // Update profile info
            this.updateProfileInfo();
        } else {
            // User is logged out
            if (profileBtn) {
                profileBtn.classList.remove('logged-in');
                profileBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                `;
            }

            if (authLoginSection) authLoginSection.classList.remove('hidden');
            if (profileSection) profileSection.classList.add('hidden');
            if (authTitle) authTitle.textContent = 'Welcome to HydroTracker';
        }
    }

    // Update Profile Information
    updateProfileInfo() {
        if (!this.currentUser) return;

        const nameEl = document.getElementById('profileName');
        const emailEl = document.getElementById('profileEmail');
        const avatarEl = document.getElementById('profileAvatar');
        const initialsEl = document.getElementById('profileInitials');

        const displayName = this.currentUser.displayName || 'User';
        const email = this.currentUser.email || '';
        const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

        if (nameEl) nameEl.textContent = displayName;
        if (emailEl) emailEl.textContent = email;
        if (initialsEl) initialsEl.textContent = initials;

        // Update profile stats
        this.updateProfileStats();
    }

    // Update Profile Statistics
    updateProfileStats() {
        const totalDaysEl = document.getElementById('profileTotalDays');
        const totalWaterEl = document.getElementById('profileTotalWater');
        const goalsMetEl = document.getElementById('profileGoalsMet');

        if (totalDaysEl) totalDaysEl.textContent = this.history.length;

        const totalWater = this.history.reduce((sum, day) => sum + day.amount, 0);
        if (totalWaterEl) totalWaterEl.textContent = (totalWater / 1000).toFixed(1);

        if (goalsMetEl) goalsMetEl.textContent = this.goalsReached;
    }

    // Google Sign In
    async signInWithGoogle() {
        if (!this.auth) {
            this.showToast('Firebase Not Configured', 'Please set up Firebase to use authentication (see FIREBASE_SETUP.md) or continue as Guest', 'error');
            return;
        }

        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');

            const result = await this.auth.signInWithPopup(provider);
            this.log('Google sign in success:', result.user);
            this.closeAuthModal();
        } catch (error) {
            console.error('Google sign in error:', error);
            this.showToast('Login Failed', error.message, 'error');
        }
    }

    // Email Login
    async loginWithEmail(email, password) {
        if (!this.auth) {
            this.showToast('Firebase Not Configured', 'Please set up Firebase to use authentication (see FIREBASE_SETUP.md) or continue as Guest', 'error');
            return;
        }

        try {
            await this.auth.signInWithEmailAndPassword(email, password);
            this.closeAuthModal();
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Login Failed', this.getAuthErrorMessage(error.code), 'error');
        }
    }

    // Email Sign Up
    async signupWithEmail(name, email, password) {
        if (!this.auth) {
            this.showToast('Firebase Not Configured', 'Please set up Firebase to use authentication (see FIREBASE_SETUP.md) or continue as Guest', 'error');
            return;
        }

        try {
            const result = await this.auth.createUserWithEmailAndPassword(email, password);
            // Update profile with name
            await result.user.updateProfile({
                displayName: name
            });
            this.closeAuthModal();
            this.showToast('Success', 'Account created successfully!', 'success');
        } catch (error) {
            console.error('Signup error:', error);
            this.showToast('Signup Failed', this.getAuthErrorMessage(error.code), 'error');
        }
    }

    // Logout
    async logout() {
        if (!this.auth) return;

        try {
            await this.auth.signOut();
            this.closeAuthModal();
            this.showToast('Logged Out', 'You have been logged out successfully', 'info');
        } catch (error) {
            console.error('Logout error:', error);
            this.showToast('Error', 'Failed to logout', 'error');
        }
    }

    // Get Auth Error Message
    getAuthErrorMessage(code) {
        const messages = {
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/email-already-in-use': 'An account already exists with this email',
            'auth/weak-password': 'Password should be at least 6 characters',
            'auth/invalid-email': 'Invalid email address',
            'auth/popup-closed-by-user': 'Sign in was cancelled',
            'auth/cancelled-popup-request': 'Sign in was cancelled'
        };
        return messages[code] || 'An error occurred. Please try again.';
    }

    // Close Auth Modal
    closeAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) modal.classList.remove('active');
    }

    // Sync Data to Cloud
    async syncDataToCloud() {
        if (!this.currentUser || !this.db) {
            this.showToast('Error', 'Please login to sync data', 'error');
            return;
        }

        try {
            const userData = {
                dailyGoal: this.dailyGoal,
                history: this.history,
                streak: this.streak,
                bestStreak: this.bestStreak,
                goalsReached: this.goalsReached,
                achievements: this.achievements,
                lastSync: new Date().toISOString()
            };

            await this.db.collection('users').doc(this.currentUser.uid).set(userData);
            this.showToast('Sync Complete', 'Your data has been synced to the cloud', 'success');
        } catch (error) {
            console.error('Sync error:', error);
            this.showToast('Sync Failed', error.message, 'error');
        }
    }

    // Load User Data from Cloud
    async loadUserDataFromCloud() {
        if (!this.currentUser || !this.db) return;

        try {
            const doc = await this.db.collection('users').doc(this.currentUser.uid).get();
            if (doc.exists) {
                const cloudData = doc.data();
                // Merge cloud data with local data (keeping the most recent)
                if (cloudData.history && cloudData.history.length > 0) {
                    // Simple merge: use cloud data if it's newer
                    const cloudLastSync = new Date(cloudData.lastSync || 0);
                    const localLastEntry = this.history.length > 0 ?
                        new Date(this.history[this.history.length - 1].date) : new Date(0);

                    if (cloudLastSync > localLastEntry) {
                        this.dailyGoal = cloudData.dailyGoal || this.dailyGoal;
                        this.history = cloudData.history || this.history;
                        this.streak = cloudData.streak || this.streak;
                        this.bestStreak = cloudData.bestStreak || this.bestStreak;
                        this.goalsReached = cloudData.goalsReached || this.goalsReached;
                        this.achievements = cloudData.achievements || this.achievements;

                        // Update today's data
                        const today = this.getToday();
                        const todayData = this.history.find(d => d.date === today);
                        if (todayData) {
                            this.currentAmount = todayData.amount;
                            this.activities = todayData.activities || [];
                        }

                        this.saveData();
                        this.updateUI();
                        this.renderChart();
                        this.showToast('Data Loaded', 'Your cloud data has been loaded', 'success');
                    }
                }
            }
        } catch (error) {
            console.error('Load from cloud error:', error);
        }
    }

    // Notification System
    // Initialize FCM Token
    async initializeFCM() {
        if (!this.messaging) {
            this.log('FCM not available - using browser notifications only');
            return false;
        }

        try {
            // Request permission first
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                this.log('Notification permission not granted for FCM');
                return false;
            }

            // Get FCM token
            const token = await this.messaging.getToken({
                vapidKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
            });

            if (token) {
                this.reminderSettings.fcmToken = token;
                this.reminderSettings.userGrantedPermission = true;
                this.saveReminderSettings();
                this.log('FCM Token obtained:', token.substring(0, 20) + '...');
                return true;
            }
        } catch (error) {
            this.log('FCM initialization error:', error);
        }
        return false;
    }

    // Request Notification Permission
    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            this.showToast('Not Supported', 'Your browser does not support notifications', 'error');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.log('Notification permission granted');
                this.reminderSettings.userGrantedPermission = true;
                this.saveReminderSettings();
                return true;
            } else {
                this.showToast('Permission Denied', 'Please enable notifications in your browser settings', 'error');
                this.reminderSettings.userGrantedPermission = false;
                this.saveReminderSettings();
                return false;
            }
        } catch (error) {
            this.log('Notification permission error:', error);
            return false;
        }
    }

    // Send Notification
    sendNotification(title, body, icon = 'icon-192.png') {
        console.log('Sending notification:', title, body);

        // Show in-app toast notification (always works)
        this.showToast(title, body, 'info');

        // Try browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                const notification = new Notification(title, {
                    body: body,
                    icon: icon,
                    badge: icon,
                    tag: 'hydrotracker-reminder',
                    requireInteraction: false,
                    silent: false
                });

                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };

                console.log('Browser notification sent:', title);
                return;
            } catch (error) {
                console.error('Browser notification error:', error);
            }
        }
    }

    // Load Reminder Settings
    loadReminderSettings() {
        const saved = localStorage.getItem(STORAGE_KEYS.REMINDERS);
        this.log('DEBUG: Loading reminder settings from localStorage:', saved);

        if (saved) {
            const parsed = JSON.parse(saved);
            
            // Migration: Check if using old interval-based format and convert to new time-based format
            if (parsed.interval && !parsed.scheduledTimes) {
                this.log('DEBUG: Migrating from interval-based to time-based reminders');
                // Convert interval to approximate times (for backwards compatibility)
                const intervalHours = Math.min(Math.max(Math.round(parsed.interval / 60), 3), 8);
                parsed.scheduledTimes = ['09:00', '13:00', '18:00']; // Default 3 times
                delete parsed.interval;
            }
            
            // Migration: Convert lastReminder (single) to lastReminders (object)
            if (parsed.lastReminder && !parsed.lastReminders) {
                parsed.lastReminders = {};
                delete parsed.lastReminder;
            }
            
            // Ensure lastReminders exists
            if (!parsed.lastReminders) {
                parsed.lastReminders = {};
            }
            
            // Ensure scheduledTimes exists
            if (!parsed.scheduledTimes) {
                parsed.scheduledTimes = [...CONFIG.DEFAULT_REMINDER_TIMES];
            }
            
            this.reminderSettings = { ...this.reminderSettings, ...parsed };
            this.log('DEBUG: Loaded reminder settings:', this.reminderSettings);

            // Restore reminders if they were enabled before
            if (this.reminderSettings.enabled) {
                this.log('DEBUG: Reminders were previously enabled, restoring...');
                this.startReminders(true); // Auto-restore mode
            }
        } else {
            this.log('DEBUG: No saved reminder settings found');
        }
    }

    // Save Reminder Settings
    saveReminderSettings() {
        localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(this.reminderSettings));
        this.log('DEBUG: Saved reminder settings:', this.reminderSettings);
    }

    // Start Reminders
    async startReminders(isAutoRestore = false) {
        this.log('DEBUG: startReminders called, isAutoRestore:', isAutoRestore);
        this.log('DEBUG: Current browser permission:', Notification.permission);
        this.log('DEBUG: User previously granted permission:', this.reminderSettings.userGrantedPermission);
        this.log('DEBUG: FCM available:', !!this.messaging);
        this.log('DEBUG: Scheduled times:', this.reminderSettings.scheduledTimes);

        // Check if running from file:// protocol
        const isFileProtocol = window.location.protocol === 'file:';
        if (isFileProtocol) {
            this.log('DEBUG: Running from file:// protocol');
            this.showToast('Use Local Server', 'Run "npm start" for notifications to work', 'error');
            return;
        }

        // Initialize FCM if we have a token but no messaging instance
        if (this.messaging && !this.reminderSettings.fcmToken) {
            this.log('DEBUG: Initializing FCM...');
            await this.initializeFCM();
        }

        // Save enabled state
        this.reminderSettings.enabled = true;
        this.saveReminderSettings();

        // Update UI toggle
        const reminderToggle = document.getElementById('reminderToggle');
        if (reminderToggle) {
            reminderToggle.checked = true;
        }

        // Show retry button if user hasn't granted permission yet
        const reminderRetry = document.getElementById('reminderRetry');
        const reminderOptions = document.getElementById('reminderOptions');
        const quickNotifyBtn = document.getElementById('quickNotifyBtn');

        const timeDisplay = this.reminderSettings.scheduledTimes.join(', ');

        if (!this.reminderSettings.userGrantedPermission && Notification.permission !== 'granted') {
            this.log('DEBUG: Permission not granted, showing retry button');
            if (reminderRetry) reminderRetry.style.display = 'block';
            if (reminderOptions) reminderOptions.style.display = 'block';
            if (quickNotifyBtn) quickNotifyBtn.style.display = 'none';

            // If this is a fresh enable (not auto-restore), request permission
            if (!isAutoRestore) {
                const granted = await this.requestNotificationPermission();
                if (granted) {
                    if (reminderRetry) reminderRetry.style.display = 'none';
                    if (quickNotifyBtn) quickNotifyBtn.style.display = 'flex';
                    this.showToast('Reminders Enabled', `We'll notify you at ${timeDisplay}`, 'success');
                }
            }
        } else {
            this.log('DEBUG: Permission was previously granted');
            if (reminderRetry) reminderRetry.style.display = 'none';
            if (reminderOptions) reminderOptions.style.display = 'block';
            if (quickNotifyBtn) quickNotifyBtn.style.display = 'flex';

            // Show success toast only on fresh enable
            if (!isAutoRestore) {
                this.showToast('Reminders Enabled', `We'll notify you at ${timeDisplay}`, 'success');
            }
        }

        // Clear existing interval
        if (this.reminderInterval) {
            clearInterval(this.reminderInterval);
        }

        // Check for overdue reminders when restoring (for each scheduled time)
        if (isAutoRestore) {
            this.checkOverdueReminders();
        }

        // Set up reminder interval (check every minute)
        this.reminderInterval = setInterval(() => {
            this.checkAndSendReminder();
        }, CONFIG.REMINDER_CHECK_INTERVAL);

        this.log('DEBUG: Reminder interval started successfully');
    }

    // Check for overdue reminders on restore
    checkOverdueReminders() {
        const now = new Date();
        const today = this.getToday();
        let overdueCount = 0;

        this.reminderSettings.scheduledTimes.forEach(time => {
            const lastSent = this.reminderSettings.lastReminders[time];
            const scheduledToday = new Date(`${today}T${time}:00`);
            
            // Check if this time has passed today and hasn't been sent today
            if (now > scheduledToday) {
                const lastSentDate = lastSent ? new Date(lastSent).toLocaleDateString('en-CA') : null;
                if (lastSentDate !== today) {
                    this.log('DEBUG: Overdue reminder found for time:', time);
                    overdueCount++;
                    // Send notification after a delay
                    setTimeout(() => {
                        this.sendScheduledReminder(time);
                    }, 3000 * overdueCount); // Stagger multiple overdue notifications
                }
            }
        });
    }

    // Stop Reminders
    stopReminders() {
        this.reminderSettings.enabled = false;
        this.saveReminderSettings();

        if (this.reminderInterval) {
            clearInterval(this.reminderInterval);
            this.reminderInterval = null;
        }

        // Update UI
        const reminderToggle = document.getElementById('reminderToggle');
        if (reminderToggle) {
            reminderToggle.checked = false;
        }

        const reminderOptions = document.getElementById('reminderOptions');
        if (reminderOptions) {
            reminderOptions.style.display = 'none';
        }

        const reminderRetry = document.getElementById('reminderRetry');
        if (reminderRetry) {
            reminderRetry.style.display = 'none';
        }

        const manualNotificationSection = document.getElementById('manualNotificationSection');
        if (manualNotificationSection) {
            manualNotificationSection.style.display = 'none';
        }

        const quickNotifyBtn = document.getElementById('quickNotifyBtn');
        if (quickNotifyBtn) {
            quickNotifyBtn.style.display = 'none';
        }

        this.log('DEBUG: Reminders stopped');
        this.showToast('Reminders Disabled', 'You will no longer receive notifications', 'info');
    }

    // Check and Send Reminder
    checkAndSendReminder() {
        if (!this.reminderSettings.enabled) return;

        const now = new Date();
        const today = this.getToday();
        const currentTime = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

        this.log('DEBUG: Checking reminders at', currentTime);

        // Check each scheduled time
        this.reminderSettings.scheduledTimes.forEach(scheduledTime => {
            // Check if we're within 1 minute of the scheduled time
            if (this.isTimeWithinWindow(currentTime, scheduledTime, 1)) {
                const lastSent = this.reminderSettings.lastReminders[scheduledTime];
                const lastSentDate = lastSent ? new Date(lastSent).toLocaleDateString('en-CA') : null;
                
                // Only send if not already sent today for this time
                if (lastSentDate !== today) {
                    this.log('DEBUG: Time to send reminder for', scheduledTime);
                    this.sendScheduledReminder(scheduledTime);
                } else {
                    this.log('DEBUG: Already sent reminder for', scheduledTime, 'today');
                }
            }
        });
    }

    // Check if current time is within a window of scheduled time (in minutes)
    isTimeWithinWindow(currentTime, scheduledTime, windowMinutes) {
        const current = new Date(`2000-01-01T${currentTime}:00`);
        const scheduled = new Date(`2000-01-01T${scheduledTime}:00`);
        const diffMinutes = Math.abs((current.getTime() - scheduled.getTime()) / (1000 * 60));
        return diffMinutes <= windowMinutes;
    }

    // Send a scheduled reminder
    sendScheduledReminder(scheduledTime) {
        // Check if user has reached daily goal
        const percentage = (this.currentAmount / this.dailyGoal) * 100;
        if (percentage >= 100) {
            this.log('DEBUG: Goal reached, skipping reminder for', scheduledTime);
            return; // Goal reached, no need to remind
        }

        // Send reminder notification with varied messages
        const messages = [
            'Time to hydrate! 💧',
            'Your body needs water! 💧',
            'Stay hydrated, stay healthy! 💧',
            'Water break! 💧',
            'Drink up for better health! 💧',
            'Keep that water flowing! 💧',
            'Your hydration check-in! 💧',
            'Don\'t forget to drink water! 💧',
            'Sip some water now! 💧',
            'Hydration reminder! 💧',
            'Water is life, drink up! 💧',
            'Feeling thirsty? Here\'s your reminder! 💧',
            'Cheers to your health - drink water! 💧',
            'Your body says thank you! 💧',
            'Every glass counts! 💧'
        ];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];

        const remaining = this.dailyGoal - this.currentAmount;
        const timeLabel = this.formatTime12Hour(scheduledTime);
        const body = `${randomMessage} (${timeLabel}) You still need ${remaining}ml to reach your daily goal.`;

        this.sendNotification('💧 HydroTracker Reminder', body, 'icon-192.png');

        // Update last reminder time for this scheduled time
        this.reminderSettings.lastReminders[scheduledTime] = new Date().toISOString();
        this.saveReminderSettings();

        this.log('Reminder sent for scheduled time:', scheduledTime);
    }

    // Format time to 12-hour format
    formatTime12Hour(time24) {
        const [hours, minutes] = time24.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
    }

    // Test method - Generate a random reminder for testing
    testRandomReminder() {
        if (!this.reminderSettings.enabled) {
            this.showToast('Reminders Disabled', 'Enable reminders first to test', 'error');
            return;
        }

        const messages = [
            '🔔 TEST: Time to hydrate! 💧',
            '🔔 TEST: Your body needs water! 💧',
            '🔔 TEST: Stay hydrated, stay healthy! 💧',
            '🔔 TEST: Water break! 💧',
            '🔔 TEST: Drink up for better health! 💧',
            '🔔 TEST: Keep that water flowing! 💧',
            '🔔 TEST: Your hydration check-in! 💧',
            '🔔 TEST: Don\'t forget to drink water! 💧',
            '🔔 TEST: Sip some water now! 💧',
            '🔔 TEST: Hydration reminder! 💧'
        ];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];

        const remaining = this.dailyGoal - this.currentAmount;
        const body = `${randomMessage} You still need ${remaining}ml to reach your daily goal.`;

        this.sendNotification('🧪 TEST Reminder', body, 'icon-192.png');
        this.log('Test reminder sent:', randomMessage);
        this.showToast('Test Sent', 'Check your notification!', 'success');
    }

    // Diagnostic method - Run this in console to debug notifications
    diagnoseNotifications() {
        this.log('=== NOTIFICATION DIAGNOSTIC ===');
        this.log('URL:', window.location.href);
        this.log('Protocol:', window.location.protocol);
        this.log('Browser permission:', Notification.permission);
        this.log('User granted before:', this.reminderSettings.userGrantedPermission);
        this.log('Reminders enabled:', this.reminderSettings.enabled);
        this.log('Scheduled times:', this.reminderSettings.scheduledTimes?.join(', ') || 'not set');
        this.log('Last reminders:', this.reminderSettings.lastReminders);
        this.log('Interval running:', !!this.reminderInterval);
        this.log('FCM available:', !!this.messaging);
        this.log('FCM Token:', this.reminderSettings.fcmToken ? this.reminderSettings.fcmToken.substring(0, 20) + '...' : 'none');
        this.log('LocalStorage:', localStorage.getItem(STORAGE_KEYS.REMINDERS));
        this.log('===============================');
        this.log('Available commands:');
        this.log('- waterTracker.sendManualNotification("Your message")');
        this.log('- waterTracker.testRandomReminder()');
        this.log('- waterTracker.diagnoseNotifications()');
        this.log('===============================');
        this.showToast('Diagnostic', 'Check console for details', 'info');
    }

    // Force re-check permissions and start reminders
    retryNotifications() {
        this.log('DEBUG: Retrying notification setup...');
        this.reminderSettings.enabled = true;
        this.saveReminderSettings();
        this.startReminders(false); // false = not auto-restore
    }

    // Force check reminder immediately (for testing)
    forceCheckReminder() {
        this.log('DEBUG: Forcing reminder check...');
        this.checkAndSendReminder();
    }

    // Update Scheduled Times
    updateScheduledTimes(times) {
        this.reminderSettings.scheduledTimes = times;
        this.saveReminderSettings();

        if (this.reminderSettings.enabled) {
            // Restart with new times
            this.startReminders(false);
            this.showToast('Times Updated', `Reminders set for ${times.join(', ')}`, 'info');
        }
    }

    // Send manual notification
    sendManualNotification(customMessage = null) {
        const messages = [
            'Time to hydrate! 💧',
            'Your body needs water! 💧',
            'Stay hydrated, stay healthy! 💧',
            'Water break! 💧',
            'Drink up for better health! 💧',
            'Keep that water flowing! 💧'
        ];
        
        const message = customMessage || messages[Math.floor(Math.random() * messages.length)];
        const remaining = Math.max(0, this.dailyGoal - this.currentAmount);
        const body = remaining > 0 
            ? `${message} You still need ${remaining}ml to reach your daily goal.`
            : `${message} You've reached your daily goal! Great job! 🎉`;

        this.sendNotification('💧 Manual Reminder', body, 'icon-192.png');
        this.log('Manual notification sent:', message);
        this.showToast('Notification Sent', 'Check your notification!', 'success');
    }

    loadData() {
        const data = localStorage.getItem(STORAGE_KEYS.TRACKER_DATA);
        if (data) {
            const parsed = JSON.parse(data);
            this.dailyGoal = parsed.dailyGoal || 2000;
            this.history = parsed.history || [];
            this.streak = parsed.streak || 0;
            this.bestStreak = parsed.bestStreak || 0;
            this.goalsReached = parsed.goalsReached || 0;
            this.achievements = parsed.achievements || this.achievements;

            // Load today's data
            const today = this.getToday();
            const todayData = this.history.find(d => d.date === today);
            if (todayData) {
                this.currentAmount = todayData.amount;
                this.activities = todayData.activities || [];
            }
        }

        // Load saved theme
        this.loadTheme();
    }

    loadTheme() {
        const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else {
            // Default to dark theme
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem(STORAGE_KEYS.THEME, newTheme);

        // Update meta theme-color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.content = newTheme === 'light' ? '#f5f7fa' : '#0a0a0f';
        }

        this.showToast('Theme Changed', `Switched to ${newTheme} mode`, 'info');
    }

    saveData() {
        const data = {
            dailyGoal: this.dailyGoal,
            history: this.history,
            streak: this.streak,
            bestStreak: this.bestStreak,
            goalsReached: this.goalsReached,
            achievements: this.achievements
        };
        localStorage.setItem(STORAGE_KEYS.TRACKER_DATA, JSON.stringify(data));
    }

    getToday() {
        // Fix: Use local date instead of UTC to avoid timezone issues
        // Returns YYYY-MM-DD format in local timezone
        const now = new Date();
        return now.toLocaleDateString('en-CA');
    }

    checkNewDay() {
        const today = this.getToday();
        const todayData = this.history.find(d => d.date === today);

        if (!todayData) {
            // New day - check if we need to update streak
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayDate = yesterday.toLocaleDateString('en-CA');
            const yesterdayData = this.history.find(d => d.date === yesterdayDate);

            if (yesterdayData && yesterdayData.amount >= this.dailyGoal) {
                this.streak++;
                if (this.streak > this.bestStreak) {
                    this.bestStreak = this.streak;
                }
            } else if (yesterdayData) {
                this.streak = 0;
            }

            // Reset for today
            this.currentAmount = 0;
            this.activities = [];
            this.history.push({
                date: today,
                amount: 0,
                activities: []
            });
            this.saveData();
        }
    }

    addWater(amount) {
        const today = this.getToday();
        const previousAmount = this.currentAmount;
        this.currentAmount += amount;

        const activity = {
            amount: amount,
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
        this.activities.unshift(activity);

        // Update history
        const todayIndex = this.history.findIndex(d => d.date === today);
        if (todayIndex >= 0) {
            this.history[todayIndex].amount = this.currentAmount;
            this.history[todayIndex].activities = this.activities;
        } else {
            this.history.push({
                date: today,
                amount: this.currentAmount,
                activities: this.activities
            });
        }

        // Check if goal reached for the first time today
        const wasGoalReached = previousAmount >= this.dailyGoal;
        const isGoalReached = this.currentAmount >= this.dailyGoal;

        if (!wasGoalReached && isGoalReached) {
            this.goalsReached++;
            this.showCelebration();
            this.showToast('Goal Reached! 🎉', `You've reached your daily goal of ${this.dailyGoal}ml!`, 'success');
        } else {
            this.showToast('Water Added 💧', `Added ${amount}ml of water`, 'info');
        }

        // Check for first drop achievement
        if (!this.achievements['first-drop'] && this.currentAmount > 0) {
            this.achievements['first-drop'] = true;
            this.showToast('Achievement Unlocked! 🏆', 'First Drop - Start your hydration journey!', 'success');
        }

        // Check for goal master achievement
        if (!this.achievements['goal-master'] && this.goalsReached >= 1) {
            this.achievements['goal-master'] = true;
            this.showToast('Achievement Unlocked! 🎯', 'Goal Master - Reach your daily goal!', 'success');
        }

        // Check for week warrior achievement
        if (!this.achievements['week-warrior'] && this.streak >= CONFIG.WEEK_WARRIOR_DAYS) {
            this.achievements['week-warrior'] = true;
            this.showToast('Achievement Unlocked! ⚡', 'Week Warrior - 7 day streak!', 'success');
        }

        // Check for hydration hero achievement
        if (!this.achievements['hydration-hero'] && this.currentAmount >= CONFIG.HYDRATION_HERO_THRESHOLD) {
            this.achievements['hydration-hero'] = true;
            this.showToast('Achievement Unlocked! 👑', 'Hydration Hero - Drink 3000ml in a day!', 'success');
        }

        // Save to undo history (max entries defined in CONFIG)
        this.undoHistory.push({
            amount: amount,
            wasGoalReached: !wasGoalReached && isGoalReached
        });
        if (this.undoHistory.length > CONFIG.MAX_UNDO_HISTORY) {
            this.undoHistory.shift();
        }
        this.updateUndoButton();

        this.saveData();
        this.updateUI();
        this.renderChart();
        this.animateWaterAdd();
        this.checkAchievements();
    }

    undoLastEntry() {
        if (this.undoHistory.length === 0) return;

        const lastEntry = this.undoHistory.pop();
        const today = this.getToday();

        // Subtract the amount
        this.currentAmount = Math.max(0, this.currentAmount - lastEntry.amount);

        // Remove the last activity
        if (this.activities.length > 0) {
            this.activities.shift();
        }

        // Update history
        const todayIndex = this.history.findIndex(d => d.date === today);
        if (todayIndex >= 0) {
            this.history[todayIndex].amount = this.currentAmount;
            this.history[todayIndex].activities = this.activities;
        }

        // If goal was reached by this entry, decrement goalsReached
        if (lastEntry.wasGoalReached && this.goalsReached > 0) {
            this.goalsReached--;
        }

        this.saveData();
        this.updateUI();
        this.renderChart();
        this.updateUndoButton();
        this.showToast('Undo Successful ↩️', `Removed ${lastEntry.amount}ml entry`, 'info');
    }

    updateUndoButton() {
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) {
            undoBtn.disabled = this.undoHistory.length === 0;
        }
    }

    updateUI() {
        // Update progress
        document.getElementById('currentAmount').textContent = this.currentAmount;
        document.getElementById('goalAmount').textContent = this.dailyGoal;

        // Calculate actual percentage (can exceed 100%)
        let actualPercentage = 0;
        if (this.dailyGoal > 0) {
            actualPercentage = (this.currentAmount / this.dailyGoal) * 100;
        }
        const percentageEl = document.getElementById('percentage');
        percentageEl.textContent = Math.round(actualPercentage) + '%';

        // Add visual indicator for over 100%
        if (actualPercentage > 100) {
            percentageEl.classList.add('over-100');
        } else {
            percentageEl.classList.remove('over-100');
        }

        // Update water fill (cap at 100% for visual, but mark as overfilled)
        const waterFill = document.getElementById('waterFill');
        const waterGlass = document.querySelector('.water-glass');
        const displayPercentage = Math.min(actualPercentage, 100);
        waterFill.style.height = displayPercentage + '%';

        // Add overfill effect when exceeding 100%
        if (actualPercentage > 100) {
            waterGlass.classList.add('overfilled');
            waterFill.classList.add('overflow');
        } else {
            waterGlass.classList.remove('overfilled');
            waterFill.classList.remove('overflow');
        }

        // Update stats
        document.getElementById('currentStreak').textContent = this.streak;
        document.getElementById('bestStreak').textContent = this.bestStreak + ' days';
        document.getElementById('goalsReached').textContent = this.goalsReached + ' days';

        // Calculate average
        const totalDays = this.history.length;
        const totalAmount = this.history.reduce((sum, day) => sum + day.amount, 0);
        const average = totalDays > 0 ? Math.round(totalAmount / totalDays) : 0;
        document.getElementById('avgDaily').textContent = average + ' ml';

        // Update activities
        this.renderActivities();

        // Update goal input
        document.getElementById('dailyGoal').value = this.dailyGoal;
    }

    renderActivities() {
        const activityList = document.getElementById('activityList');

        if (this.activities.length === 0) {
            activityList.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
                    </svg>
                    <p>No water logged yet today. Start tracking!</p>
                </div>
            `;
            return;
        }

        activityList.innerHTML = this.activities.map((activity, index) => `
            <div class="activity-item" style="animation-delay: ${index * 0.05}s">
                <div class="activity-info">
                    <div class="activity-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
                        </svg>
                    </div>
                    <div class="activity-details">
                        <h4>Water Added</h4>
                        <div class="activity-time">${activity.time}</div>
                    </div>
                </div>
                <div class="activity-amount">${activity.amount} ml</div>
            </div>
        `).join('');
    }

    renderChart() {
        const canvas = document.getElementById('historyChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Get last 7 days
        const last7Days = this.getLast7Days();
        const chartData = last7Days.map(date => {
            const dayData = this.history.find(d => d.date === date);
            return dayData ? dayData.amount : 0;
        });

        // Clear canvas
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const padding = 40;
        const chartWidth = canvas.width - padding * 2;
        const chartHeight = canvas.height - padding * 2;
        const barWidth = chartWidth / 7 - 15;
        const maxValue = Math.max(this.dailyGoal, ...chartData, 100);

        // Draw bars with gradient
        chartData.forEach((value, index) => {
            const barHeight = (value / maxValue) * chartHeight;
            const x = padding + (chartWidth / 7) * index + 7.5;
            const y = padding + chartHeight - barHeight;

            // Create gradient for bar
            const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
            gradient.addColorStop(0, '#00f2ff');
            gradient.addColorStop(0.5, '#7b2fff');
            gradient.addColorStop(1, '#ff2d95');

            // Draw bar with glow effect
            ctx.save();
            ctx.shadowColor = 'rgba(0, 242, 255, 0.5)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            ctx.fillStyle = gradient;
            ctx.roundRect(x, y, barWidth, barHeight, 8);
            ctx.fill();
            ctx.restore();

            // Draw day label
            const date = new Date(last7Days[index]);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '12px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText(dayName, x + barWidth / 2, canvas.height - 15);

            // Draw value
            if (value > 0) {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px Poppins';
                ctx.fillText(value + 'ml', x + barWidth / 2, y - 10);
            }
        });

        // Draw goal line
        const goalY = padding + chartHeight - (this.dailyGoal / maxValue) * chartHeight;
        ctx.save();
        ctx.strokeStyle = '#ff2d95';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.shadowColor = 'rgba(255, 45, 149, 0.8)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(padding, goalY);
        ctx.lineTo(canvas.width - padding, goalY);
        ctx.stroke();
        ctx.restore();

        // Goal label
        ctx.fillStyle = '#ff2d95';
        ctx.font = 'bold 12px Poppins';
        ctx.textAlign = 'right';
        ctx.fillText('Goal', canvas.width - padding - 5, goalY - 8);
    }

    getLast7Days() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toLocaleDateString('en-CA'));
        }
        return days;
    }

    createParticles() {
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return;

        particlesContainer.innerHTML = '';

        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 15 + 's';
            particle.style.animationDuration = (15 + Math.random() * 10) + 's';
            particlesContainer.appendChild(particle);
        }
    }

    startBubbleAnimation() {
        const bubblesContainer = document.getElementById('bubbles');
        if (!bubblesContainer) return;

        // Clear existing interval if any
        if (this.bubbleInterval) clearInterval(this.bubbleInterval);

        this.bubbleInterval = setInterval(() => {
            if (this.currentAmount > 0) {
                const bubble = document.createElement('div');
                bubble.className = 'bubble';
                bubble.style.left = Math.random() * 100 + '%';
                bubble.style.width = (5 + Math.random() * 10) + 'px';
                bubble.style.height = bubble.style.width;
                bubble.style.animationDuration = (2 + Math.random() * 2) + 's';
                bubblesContainer.appendChild(bubble);

                setTimeout(() => bubble.remove(), 4000);
            }
        }, 1000);
    }

    animateWaterAdd() {
        const waterFill = document.getElementById('waterFill');
        if (waterFill) {
            waterFill.style.animation = 'none';
            setTimeout(() => {
                waterFill.style.animation = '';
            }, 10);
        }
    }

    checkAchievements() {
        const badges = document.querySelectorAll('.badge');
        badges.forEach(badge => {
            const achievement = badge.dataset.achievement;
            if (this.achievements[achievement]) {
                badge.classList.add('unlocked');
            }
        });
    }

    showCelebration() {
        const celebration = document.getElementById('celebration');
        celebration.classList.add('active');

        // Create confetti
        this.createConfetti();

        setTimeout(() => {
            celebration.classList.remove('active');
        }, 4000);
    }

    createConfetti() {
        const confettiContainer = document.querySelector('.confetti');
        confettiContainer.innerHTML = '';

        const colors = ['#00f2ff', '#7b2fff', '#ff2d95', '#00e676', '#ff6b9d'];

        for (let i = 0; i < 80; i++) {
            const confetti = document.createElement('div');
            confetti.style.position = 'absolute';
            confetti.style.width = (8 + Math.random() * 8) + 'px';
            confetti.style.height = confetti.style.width;
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = '-20px';
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
            confetti.style.animation = `confettiFall ${3 + Math.random() * 2}s linear forwards`;
            confetti.style.animationDelay = Math.random() * 2 + 's';
            confettiContainer.appendChild(confetti);
        }

        // Add dynamic animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes confettiFall {
                0% {
                    transform: translateY(0) rotate(0deg);
                    opacity: 1;
                }
                100% {
                    transform: translateY(100vh) rotate(${Math.random() * 720 + 360}deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    showToast(title, message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let iconSvg = '';
        if (type === 'success') {
            iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
        } else if (type === 'error') {
            iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
        } else {
            iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>';
        }

        toast.innerHTML = `
            <div class="toast-icon">${iconSvg}</div>
            <div class="toast-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
            }, 1500);
        }
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Undo button
        document.getElementById('undoBtn').addEventListener('click', () => {
            this.undoLastEntry();
        });

        // Quick add buttons
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = parseInt(btn.dataset.amount);
                this.addWater(amount);
            });
        });

        // Custom add button
        document.getElementById('addCustomBtn').addEventListener('click', () => {
            const input = document.getElementById('customAmount');
            const amount = parseInt(input.value);
            if (amount && amount > 0 && amount <= 5000) {
                this.addWater(amount);
                input.value = '';
            } else {
                this.showToast('Invalid Amount', 'Please enter a valid amount between 1 and 5000ml', 'error');
            }
        });

        // Custom amount enter key
        document.getElementById('customAmount').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('addCustomBtn').click();
            }
        });

        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', () => {
            document.getElementById('settingsModal').classList.add('active');
        });

        // Close modal
        document.getElementById('closeModal').addEventListener('click', () => {
            document.getElementById('settingsModal').classList.remove('active');
        });

        // Close modal on outside click
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                document.getElementById('settingsModal').classList.remove('active');
            }
        });

        // Save settings
        document.getElementById('saveSettings').addEventListener('click', () => {
            const newGoal = parseInt(document.getElementById('dailyGoal').value);
            if (newGoal && newGoal >= 500 && newGoal <= 10000) {
                this.dailyGoal = newGoal;
                this.saveData();
                this.updateUI();
                this.renderChart();
                document.getElementById('settingsModal').classList.remove('active');
                this.showToast('Settings Saved', `Daily goal updated to ${newGoal}ml`, 'success');
            } else {
                this.showToast('Invalid Goal', 'Please enter a goal between 500 and 10000ml', 'error');
            }
        });

        // Reset data
        document.getElementById('resetData').addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
                localStorage.removeItem('waterTrackerData');
                this.showToast('Data Reset', 'All data has been cleared', 'info');
                setTimeout(() => location.reload(), 1500);
            }
        });

        // Reminder toggle - WORKING VERSION
        const reminderToggle = document.getElementById('reminderToggle');
        const reminderOptions = document.getElementById('reminderOptions');
        const reminderTime1 = document.getElementById('reminderTime1');
        const reminderTime2 = document.getElementById('reminderTime2');
        const reminderTime3 = document.getElementById('reminderTime3');
        const reminderRetry = document.getElementById('reminderRetry');
        const manualNotificationSection = document.getElementById('manualNotificationSection');
        const quickNotifyBtn = document.getElementById('quickNotifyBtn');

        if (reminderToggle) {
            // Set initial state from saved settings
            reminderToggle.checked = this.reminderSettings.enabled;
            if (reminderOptions) {
                reminderOptions.style.display = this.reminderSettings.enabled ? 'block' : 'none';
            }
            if (manualNotificationSection) {
                manualNotificationSection.style.display = this.reminderSettings.enabled ? 'block' : 'none';
            }
            
            // Show quick notify button if enabled and permission granted
            const hasPermission = this.reminderSettings.userGrantedPermission || Notification.permission === 'granted';
            if (quickNotifyBtn) {
                quickNotifyBtn.style.display = (this.reminderSettings.enabled && hasPermission) ? 'flex' : 'none';
            }
            
            // Set time inputs from saved settings
            const times = this.reminderSettings.scheduledTimes || CONFIG.DEFAULT_REMINDER_TIMES;
            if (reminderTime1) reminderTime1.value = times[0] || '09:00';
            if (reminderTime2) reminderTime2.value = times[1] || '13:00';
            if (reminderTime3) reminderTime3.value = times[2] || '18:00';

            // Show retry button if enabled but no permission granted
            if (reminderRetry && this.reminderSettings.enabled &&
                !this.reminderSettings.userGrantedPermission &&
                Notification.permission !== 'granted') {
                reminderRetry.style.display = 'block';
            } else if (reminderRetry) {
                reminderRetry.style.display = 'none';
            }

            reminderToggle.addEventListener('change', async () => {
                const isEnabled = reminderToggle.checked;
                if (reminderOptions) {
                    reminderOptions.style.display = isEnabled ? 'block' : 'none';
                }
                if (manualNotificationSection) {
                    manualNotificationSection.style.display = isEnabled ? 'block' : 'none';
                }

                if (isEnabled) {
                    await this.startReminders(false); // Fresh enable - will request permission
                } else {
                    this.stopReminders();
                }
            });
        }

        // Reminder times change
        const updateTimes = () => {
            const time1 = reminderTime1 ? reminderTime1.value : '09:00';
            const time2 = reminderTime2 ? reminderTime2.value : '13:00';
            const time3 = reminderTime3 ? reminderTime3.value : '18:00';
            this.updateScheduledTimes([time1, time2, time3]);
        };

        if (reminderTime1) reminderTime1.addEventListener('change', updateTimes);
        if (reminderTime2) reminderTime2.addEventListener('change', updateTimes);
        if (reminderTime3) reminderTime3.addEventListener('change', updateTimes);

        // Send manual notification button
        const sendManualNotificationBtn = document.getElementById('sendManualNotificationBtn');
        if (sendManualNotificationBtn) {
            sendManualNotificationBtn.addEventListener('click', () => {
                this.sendManualNotification();
            });
        }

        // Quick notify button (header) - uses the same quickNotifyBtn declared earlier
        if (quickNotifyBtn) {
            quickNotifyBtn.addEventListener('click', () => {
                this.sendManualNotification();
            });
        }

        // Retry notifications button
        const retryNotificationsBtn = document.getElementById('retryNotificationsBtn');
        if (retryNotificationsBtn) {
            retryNotificationsBtn.addEventListener('click', () => {
                this.retryNotifications();
            });
        }

        // Window resize for chart (Debounced)
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.renderChart();
            }, 250);
        });

        // Install prompt close
        const closeInstall = document.getElementById('closeInstallPrompt');
        if (closeInstall) {
            closeInstall.addEventListener('click', () => {
                document.getElementById('installPrompt').classList.remove('active');
            });
        }

        // Server warning banner (for file:// protocol)
        const serverWarning = document.getElementById('serverWarning');
        if (serverWarning && window.location.protocol === 'file:') {
            serverWarning.style.display = 'flex';
        }

        const closeServerWarning = document.getElementById('closeServerWarning');
        if (closeServerWarning) {
            closeServerWarning.addEventListener('click', () => {
                document.getElementById('serverWarning').classList.remove('active');
            });
        }

        const startServerBtn = document.getElementById('startServerBtn');
        if (startServerBtn) {
            startServerBtn.addEventListener('click', () => {
                alert('To enable notifications:\n\n1. Open terminal in this folder\n2. Run: npm start\n3. Open http://localhost:3000\n\nOr deploy to Netlify/Vercel for production!');
            });
        }

        // Profile button - open auth modal
        document.getElementById('profileBtn').addEventListener('click', () => {
            document.getElementById('authModal').classList.add('active');
        });

        // Close auth modal
        document.getElementById('closeAuthModal').addEventListener('click', () => {
            this.closeAuthModal();
        });

        // Close auth modal on outside click
        document.getElementById('authModal').addEventListener('click', (e) => {
            if (e.target.id === 'authModal') {
                this.closeAuthModal();
            }
        });

        // Auth tabs (Login/Signup)
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;

                // Update active tab
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Show corresponding form
                if (tabName === 'login') {
                    document.getElementById('loginForm').classList.remove('hidden');
                    document.getElementById('signupForm').classList.add('hidden');
                } else {
                    document.getElementById('loginForm').classList.add('hidden');
                    document.getElementById('signupForm').classList.remove('hidden');
                }
            });
        });

        // Google Sign In
        document.getElementById('googleSignInBtn').addEventListener('click', () => {
            this.signInWithGoogle();
        });

        // Email Login
        document.getElementById('loginBtn').addEventListener('click', () => {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            if (email && password) {
                this.loginWithEmail(email, password);
            } else {
                this.showToast('Error', 'Please enter both email and password', 'error');
            }
        });

        // Email Signup
        document.getElementById('signupBtn').addEventListener('click', () => {
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            if (name && email && password) {
                this.signupWithEmail(name, email, password);
            } else {
                this.showToast('Error', 'Please fill in all fields', 'error');
            }
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Sync Data to Cloud
        document.getElementById('syncDataBtn').addEventListener('click', () => {
            this.syncDataToCloud();
        });
    }
}

// Add roundRect support for older browsers
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius) {
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.arcTo(x + width, y, x + width, y + radius, radius);
        this.lineTo(x + width, y + height - radius);
        this.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        this.lineTo(x + radius, y + height);
        this.arcTo(x, y + height, x, y + height - radius, radius);
        this.lineTo(x, y + radius);
        this.arcTo(x, y, x + radius, y, radius);
        this.closePath();
    };
}

// Initialize app
let waterTracker;
document.addEventListener('DOMContentLoaded', () => {
    waterTracker = new WaterTracker();
    // Expose to global scope for debugging
    window.waterTracker = waterTracker;
});