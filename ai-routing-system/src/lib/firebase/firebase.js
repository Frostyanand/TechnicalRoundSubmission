// src/lib/firebase/firebase.js

// Load environment variables from .env file 
if (typeof window === 'undefined') {
  try {
    const path = require('path');
    const fs = require('fs');
    const envPath = path.join(process.cwd(), '.env');
    const envLocalPath = path.join(process.cwd(), '.env.local');
    
    if (fs.existsSync(envLocalPath)) {
      require('dotenv').config({ path: envLocalPath });
    } else if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath });
    }
  } catch (e) {
  }
}

// Using 'require' for Node.js standard module loading
const admin = require('firebase-admin');

// Function to safely initialize the Admin SDK
const initializeFirebaseAdmin = () => {
    if (admin.apps.length > 0) {
        return admin.app();
    }

    // Validate all required environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    // Debug: Log what we found (without sensitive data)
    console.log(" Checking Firebase Admin credentials...");
    console.log(`   FIREBASE_PROJECT_ID: ${projectId ? ' Found' : ' Missing'}`);
    console.log(`   FIREBASE_CLIENT_EMAIL: ${clientEmail ? ' Found' : ' Missing'}`);
    console.log(`   FIREBASE_PRIVATE_KEY: ${privateKey ? ` Found (${privateKey.length} chars)` : ' Missing'}`);

    if (!projectId) {
        console.error(" FIREBASE_PROJECT_ID environment variable is missing.");
        console.error("   Make sure your .env file is in the project root and contains FIREBASE_PROJECT_ID");
        return null;
    }

    if (!clientEmail) {
        console.error(" FIREBASE_CLIENT_EMAIL environment variable is missing.");
        console.error("   Make sure your .env file is in the project root and contains FIREBASE_CLIENT_EMAIL");
        return null;
    }

    if (!privateKey) {
        console.error(" FIREBASE_PRIVATE_KEY environment variable is missing.");
        console.error("   Make sure your .env file is in the project root and contains FIREBASE_PRIVATE_KEY");
        return null;
    }

    // Handle private key formatting (replace \\n with actual newlines)
    privateKey = privateKey.replace(/\\n/g, '\n');

    // Validate private key format
    if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
        console.error(" FIREBASE_PRIVATE_KEY appears to be invalid. It should start with '-----BEGIN PRIVATE KEY-----'");
        return null;
    }

    try {
        const serviceAccount = {
            projectId: projectId,
            clientEmail: clientEmail,
            privateKey: privateKey,
        };

        // Validate private key format more thoroughly
        if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
            console.error(" FIREBASE_PRIVATE_KEY format error: Should start with '-----BEGIN PRIVATE KEY-----'");
            console.error("   First 50 chars:", privateKey.substring(0, 50));
            return null;
        }

        if (!privateKey.includes('-----END PRIVATE KEY-----')) {
            console.error(" FIREBASE_PRIVATE_KEY format error: Should end with '-----END PRIVATE KEY-----'");
            return null;
        }

        const app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });

        console.log(" Firebase Admin SDK initialized successfully");
        console.log(`   Project ID: ${projectId}`);
        console.log(`   Service Account: ${clientEmail}`);
        
        // Test Firestore connection
        try {
            const db = admin.firestore(app);
            // Try a simple operation to verify credentials work
            console.log(" Testing Firestore connection...");
            // We'll test it when actually used, but log that we're ready
            console.log(" Firestore instance created");
        } catch (dbError) {
            console.error("Failed to create Firestore instance:", dbError.message);
        }
        
        return app;
    } catch (error) {
        console.error(" Failed to initialize Firebase Admin SDK:", error.message);
        console.error("   Error details:", error);
        return null;
    }
};

const firebaseAdminApp = initializeFirebaseAdmin();
const firestoreAdmin = firebaseAdminApp ? admin.firestore(firebaseAdminApp) : null;
const authAdmin = firebaseAdminApp ? admin.auth(firebaseAdminApp) : null;

// Helper function to check if Firestore is properly initialized
const isFirestoreReady = () => {
    if (!firebaseAdminApp) {
        console.error(" Firebase Admin App is not initialized.");
        console.error("   Please check your .env.local file has:");
        console.error("   - FIREBASE_PROJECT_ID");
        console.error("   - FIREBASE_CLIENT_EMAIL");
        console.error("   - FIREBASE_PRIVATE_KEY (with proper newlines)");
        return false;
    }
    if (!firestoreAdmin) {
        console.error(" Firestore is not initialized.");
        return false;
    }
    return true;
};

// Diagnostic function to check Firebase configuration
const checkFirebaseConfig = () => {
    const config = {
        hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
        hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        privateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
        privateKeyHasNewlines: process.env.FIREBASE_PRIVATE_KEY?.includes('\\n') || false,
        isInitialized: !!firebaseAdminApp,
    };
    
    if (!config.hasProjectId || !config.hasClientEmail || !config.hasPrivateKey) {
        console.error(" Firebase Admin configuration is incomplete:");
        console.error(JSON.stringify(config, null, 2));
    }
    
    return config;
};

// Verify Firebase ID token and get user email
const verifyToken = async (idToken) => {
    if (!authAdmin) {
        throw new Error('Firebase Admin not initialized');
    }
    try {
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        return {
            uid: decodedToken.uid,
            email: decodedToken.email,
        };
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
};

module.exports = { 
    firestoreAdmin,
    authAdmin,
    verifyToken,
    isFirestoreReady,
    checkFirebaseConfig
};