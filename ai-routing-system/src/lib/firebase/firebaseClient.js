// src/lib/firebase/firebaseClient.js

// Use ES module imports for the client bundle
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// The client-side configuration uses NEXT_PUBLIC_ variables
const clientConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function createFirebaseApp() {
    // Only initialize on client side
    if (typeof window === 'undefined') {
        return null;
    }
    
    if (getApps().length === 0) {
        return initializeApp(clientConfig);
    }
    return getApp(); 
}

// Initialize client app (only on client side)
export const app = createFirebaseApp();

// Export the specific services you plan to use on the client
export const firestoreClient = app ? getFirestore(app) : null;
export const authClient = app ? getAuth(app) : null;