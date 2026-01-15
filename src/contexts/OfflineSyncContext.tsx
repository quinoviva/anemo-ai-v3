
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getPendingImages, removePendingImage } from '@/lib/offline-storage';
import { runGenerateImageDescription } from '@/app/actions';
import { useFirestore, useUser } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

interface OfflineSyncContextType {
  isOnline: boolean;
}

const OfflineSyncContext = createContext<OfflineSyncContextType>({ isOnline: true });

export const useOfflineSync = () => useContext(OfflineSyncContext);

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    // Initial check
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: 'Back Online',
        description: 'Syncing your offline data...',
      });
      syncPendingData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: 'You are Offline',
        description: 'App functionality is limited. Data will be saved locally.',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast, user, firestore]);

  const syncPendingData = async () => {
    if (!user || !firestore) return;

    const pendingImages = await getPendingImages();
    if (pendingImages.length === 0) return;

    for (const item of pendingImages) {
      try {
        // Convert Blob to Data URI
        const reader = new FileReader();
        reader.readAsDataURL(item.file);
        
        await new Promise<void>((resolve, reject) => {
            reader.onloadend = async () => {
                const dataUri = reader.result as string;
                try {
                    // Call Server Action
                    const result = await runGenerateImageDescription({
                        photoDataUri: dataUri,
                        bodyPart: item.bodyPart as any
                    });

                    // Save to Firestore
                     const reportCollection = collection(firestore, `users/${user.uid}/imageAnalyses`);
                     await addDoc(reportCollection, {
                        userId: user.uid,
                        createdAt: serverTimestamp(),
                        riskScore: 0, // Placeholder, would need full flow
                        recommendations: "Synced from offline capture. Pending full analysis.",
                        imageAnalysisSummary: `Offline Capture (${item.bodyPart}): ${result.analysisResult}`,
                     });

                    // Remove from queue
                    await removePendingImage(item.id);
                    resolve();
                } catch (e) {
                    reject(e);
                }
            };
            reader.onerror = reject;
        });

      } catch (error) {
        console.error('Failed to sync image:', error);
      }
    }
    
    if (pendingImages.length > 0) {
        toast({
            title: 'Sync Complete',
            description: `${pendingImages.length} offline items have been processed.`,
        });
    }
  };

  return (
    <OfflineSyncContext.Provider value={{ isOnline }}>
      {children}
    </OfflineSyncContext.Provider>
  );
}
