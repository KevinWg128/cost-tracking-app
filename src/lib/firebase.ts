// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { GoogleAuthProvider, getAuth } from "firebase/auth";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: "G-D80PGS6F0R"
};

// Initialize Firebase
// Check if an app has already been initialized to avoid errors during hot reloading in development
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app); // Export the Firestore service

let analytics: Analytics | undefined;

// Analytics is only supported in browser environments
if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
}

export { app, auth, analytics, GoogleAuthProvider, db };
