'use client';

import { useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getQueuedSaves, removeFromQueue } from '@/lib/offline-queue';
import { useToast } from '@/hooks/use-toast';

/**
 * Listens for the browser "online" event and retries any Firestore saves
 * that were queued while offline. Drop this hook into the root layout.
 */
export function useOfflineQueueFlush() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !firestore) return;

    const flush = async () => {
      const queue = getQueuedSaves();
      if (queue.length === 0) return;

      let flushed = 0;
      let permanent = 0;

      for (const item of queue) {
        // Drop items older than 30 days to prevent permanent queue bloat
        if (Date.now() - item.queuedAt > 30 * 24 * 60 * 60 * 1000) {
          removeFromQueue(item.id);
          permanent++;
          continue;
        }

        try {
          const col = collection(firestore, item.collectionPath);
          await addDoc(col, { ...item.data, createdAt: serverTimestamp(), _recoveredFromQueue: true });
          removeFromQueue(item.id);
          flushed++;
        } catch (err: unknown) {
          // Distinguish: permission/validation errors are permanent — remove to avoid infinite retry
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('permission') || msg.includes('PERMISSION_DENIED') || msg.includes('invalid')) {
            console.warn('Offline queue: removing permanently failed item', item.id, msg);
            removeFromQueue(item.id);
            permanent++;
          }
          // Network errors — leave in queue for next retry
        }
      }

      if (flushed > 0) {
        toast({
          title: 'Synced',
          description: `${flushed} offline record${flushed > 1 ? 's' : ''} saved to your history.`,
        });
      }
    };

    if (navigator.onLine) flush();

    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, [user, firestore, toast]);
}
