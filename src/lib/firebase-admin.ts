import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';
import { getAuth, Auth } from 'firebase-admin/auth';

/**
 * Returns an initialized Firebase Admin App instance.
 * Centralizes credential handling and PEM key parsing.
 */
export function getAdminApp(): App | null {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const isProduction = process.env.NODE_ENV === 'production';
  const isLocalAdminEnabled = process.env.FIREBASE_ADMIN_LOCAL_ENABLE === 'true';

  const APP_NAME = 'anemo-admin';
  const apps = getApps();
  const existingApp = apps.find(a => a.name === APP_NAME);

  if (!existingApp) {
    console.log(`[Admin SDK] Attempting initialization for app: ${APP_NAME}...`);
    try {
      if (serviceAccountKey) {
        try {
          const serviceAccount = JSON.parse(serviceAccountKey);
          console.log(`[Admin SDK] Key found for project: ${serviceAccount.project_id}`);
          
          // Fix PEM key parsing (escaped newlines from ENV)
          if (typeof serviceAccount.private_key === 'string') {
             serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
          }
          
          const config = {
            credential: cert(serviceAccount),
            projectId: serviceAccount.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`,
          };

          const app = initializeApp(config, APP_NAME);
          console.log(`[Admin SDK] Success: Initialized named app '${APP_NAME}' with Service Account.`);
          return app;
        } catch (parseError) {
          console.error('[Admin SDK] JSON Parse failed for FIREBASE_SERVICE_ACCOUNT_KEY:', parseError);
          return null;
        }
      } 
      
      // Fallback to ADC ONLY in production environments
      if (isProduction) {
        console.info('[Admin SDK] Initializing named app with Application Default Credentials.');
        return initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        }, APP_NAME);
      }

      // Locally, if no key, return null
      return null;
    } catch (err) {
      console.error('[Admin SDK] Initialization failed:', err);
      return null;
    }
  }
  
  return existingApp;
}

/**
 * Returns a typed Firestore Admin instance for backend operations.
 */
export function getAdminFirestore(): Firestore | null {
  const app = getAdminApp();
  if (!app) return null;
  try {
    return getFirestore(app);
  } catch (e) {
    return null;
  }
}

/**
 * Returns a typed Firebase Storage Admin instance for backend operations.
 */
export function getAdminStorage(): Storage | null {
    const app = getAdminApp();
    if (!app) return null;
    try {
        return getStorage(app);
    } catch (e) {
        return null;
    }
}

/**
 * Returns a typed Firebase Auth Admin instance for backend operations.
 */
export function getAdminAuth(): Auth | null {
    const app = getAdminApp();
    if (!app) return null;
    try {
        return getAuth(app);
    } catch (e) {
        return null;
    }
}
