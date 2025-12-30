import admin from 'firebase-admin';

/**
 * Initialize Firebase Admin SDK
 * Uses service account credentials from environment variables
 */

// Check if already initialized
if (!admin.apps.length) {
    // Try to initialize with service account credentials
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccount) {
        try {
            const parsedServiceAccount = JSON.parse(serviceAccount);
            admin.initializeApp({
                credential: admin.credential.cert(parsedServiceAccount),
            });
        } catch (error) {
            console.error('Error parsing Firebase service account:', error);
            // Fall back to default credentials (for local development with gcloud CLI)
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
            });
        }
    } else {
        // Fall back to default credentials
        // This works when running in Google Cloud or with GOOGLE_APPLICATION_CREDENTIALS set
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
    }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export default admin;
