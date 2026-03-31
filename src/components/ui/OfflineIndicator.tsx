'use client';
import { useEffect, useState } from 'react';
import { WifiOff, CloudOff } from 'lucide-react';
import { getQueuedSaves } from '@/lib/offline-queue';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const update = () => {
      setIsOnline(navigator.onLine);
      setQueueCount(getQueuedSaves().length);
    };
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    // Poll queue count every 10s in case items were added
    const interval = setInterval(() => setQueueCount(getQueuedSaves().length), 10000);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      clearInterval(interval);
    };
  }, []);

  if (isOnline && queueCount === 0) return null;

  return (
    <div className={cn(
      "fixed top-20 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-full border text-xs font-black uppercase tracking-widest shadow-2xl backdrop-blur-xl transition-all duration-300",
      !isOnline
        ? "bg-red-500/20 border-red-500/40 text-red-400"
        : "bg-amber-500/20 border-amber-500/40 text-amber-400"
    )}>
      {!isOnline ? (
        <><WifiOff className="w-3.5 h-3.5" /> Offline — changes will sync when reconnected</>
      ) : (
        <><CloudOff className="w-3.5 h-3.5" /> {queueCount} save{queueCount !== 1 ? 's' : ''} pending sync</>
      )}
    </div>
  );
}
