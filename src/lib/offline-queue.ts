/**
 * Offline-first save queue.
 * When a Firestore save fails due to network issues, data is persisted to
 * localStorage and retried automatically when connectivity is restored.
 */

const QUEUE_KEY = 'anemo_offline_queue';

export interface QueuedSave {
  id: string;
  collectionPath: string; // e.g. "users/uid/imageAnalyses"
  data: Record<string, unknown>;
  queuedAt: number;
}

export function enqueueFirestoreSave(collectionPath: string, data: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    const queue = getQueuedSaves();
    // Cap queue at 50 items to avoid unbounded growth
    if (queue.length >= 50) {
      console.warn('Offline queue full (50 items). Oldest item dropped.');
      queue.shift();
    }
    queue.push({
      id: crypto.randomUUID(),
      collectionPath,
      data,
      queuedAt: Date.now(),
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    // localStorage full or unavailable
    console.warn('Could not enqueue offline save:', err);
  }
}

export function getQueuedSaves(): QueuedSave[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function removeFromQueue(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const filtered = getQueuedSaves().filter((item) => item.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  } catch {}
}

export function clearQueue(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {}
}
