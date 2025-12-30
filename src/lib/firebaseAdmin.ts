import admin from 'firebase-admin';

/**
 * Initialize Firebase Admin SDK
 * Uses service account credentials from environment variables
 */

// Check if already initialized
if (!admin.apps.length) {
    // Try to initialize with service account credentials
    const serviceAccount = JSON.stringify({
        type: 'service_account',
        project_id: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID,
        private_key_id: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY,
        client_email: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_ID,
        auth_uri: process.env.FIREBASE_SERVICE_ACCOUNT_AUTH_URI,
        token_uri: process.env.FIREBASE_SERVICE_ACCOUNT_TOKEN_URI,
        auth_provider_x509_cert_url: process.env.FIREBASE_SERVICE_ACCOUNT_AUTH_PROVIDER,
        client_x509_cert_url: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_CERT_URL,
        universe_domain: process.env.FIREBASE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN,
    });

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
