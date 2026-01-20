'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence, browserPopupRedirectResolver } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (typeof window === 'undefined') {
    // Running on the server, return a stub or null.
    // This prevents server-side execution of client-side Firebase code.
    // The actual initialization will happen on the client.
    return { firebaseApp: null, auth: null, firestore: null };
  }

  let app: FirebaseApp;
  let auth: any;
  let firestore: any;

  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    });
    firestore = getFirestore(app);

  } else {
    // If already initialized, return the SDKs with the already initialized App
    app = getApp();
    auth = getAuth(app);
    firestore = getFirestore(app);
  }
  

  return getSdks(app, auth, firestore);
}

export function getSdks(firebaseApp: FirebaseApp, auth: any, firestore?: any) {
  return {
    firebaseApp,
    auth,
    firestore: firestore || getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';