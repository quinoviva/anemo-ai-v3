'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence, browserPopupRedirectResolver } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (typeof window === 'undefined') {
    // Running on the server, return a stub or null.
    // This prevents server-side execution of client-side Firebase code.
    // The actual initialization will happen on the client.
    return { firebaseApp: null, auth: null, firestore: null };
  }

  if (!getApps().length) {
    const app = initializeApp(firebaseConfig);
    const auth = initializeAuth(app, {
      persistence: browserLocalPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    });
    return getSdks(app, auth);
  }

  // If already initialized, return the SDKs with the already initialized App
  const app = getApp();
  const auth = getAuth(app);
  return getSdks(app, auth);
}

export function getSdks(firebaseApp: FirebaseApp, auth: any) {
  return {
    firebaseApp,
    auth,
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';