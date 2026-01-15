
import { openDB, DBSchema } from 'idb';

interface OfflineDB extends DBSchema {
  'image-queue': {
    key: string;
    value: {
      id: string; // generated uuid
      file: Blob;
      bodyPart: string;
      timestamp: number;
      status: 'pending' | 'processing' | 'failed';
    };
  };
  'clinical-cache': {
    key: string; // e.g., 'latest-insights'
    value: any;
  };
}

const dbPromise = typeof window !== 'undefined' ? openDB<OfflineDB>('anemo-offline-db', 1, {
  upgrade(db) {
    db.createObjectStore('image-queue', { keyPath: 'id' });
    db.createObjectStore('clinical-cache');
  },
}) : Promise.resolve(null);

export async function saveOfflineImage(file: Blob, bodyPart: string) {
  const db = await dbPromise;
  if (!db) return;
  const id = crypto.randomUUID();
  await db.put('image-queue', {
    id,
    file,
    bodyPart,
    timestamp: Date.now(),
    status: 'pending',
  });
  return id;
}

export async function getPendingImages() {
  const db = await dbPromise;
  if (!db) return [];
  return db.getAll('image-queue');
}

export async function removePendingImage(id: string) {
  const db = await dbPromise;
  if (!db) return;
  await db.delete('image-queue', id);
}

export async function cacheInsights(insights: any) {
    const db = await dbPromise;
    if (!db) return;
    await db.put('clinical-cache', insights, 'latest-insights');
}

export async function getCachedInsights() {
    const db = await dbPromise;
    if (!db) return null;
    return db.get('clinical-cache', 'latest-insights');
}
