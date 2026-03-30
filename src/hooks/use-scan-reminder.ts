'use client';

import { useEffect } from 'react';

const REMINDER_KEY = 'anemo_next_reminder_at';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Schedules a weekly "time for your Anemo check" browser notification.
 * Only fires if the user has already granted notification permission.
 * Should be mounted once, e.g. in the dashboard layout.
 */
export function useScanReminder() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const stored = localStorage.getItem(REMINDER_KEY);
    const nextAt = stored ? parseInt(stored, 10) : 0;
    const now = Date.now();

    const fireReminder = () => {
      try {
        new Notification('Time for Your Anemo Check 💊', {
          body: 'Regular screenings help track your anemia health. Tap to open Anemo AI.',
          icon: '/anemo.png',
          badge: '/anemo.png',
          tag: 'anemo-weekly-reminder',
        });
      } catch {
        // Notification API unavailable in this context
      }
      localStorage.setItem(REMINDER_KEY, String(Date.now() + WEEK_MS));
    };

    if (nextAt === 0) {
      // First time — schedule next reminder in 7 days, no immediate notification
      localStorage.setItem(REMINDER_KEY, String(now + WEEK_MS));
      return;
    }

    if (now >= nextAt) {
      // Reminder is due
      fireReminder();
      return;
    }

    // Schedule for the remaining time (capped at 2h to survive tab refreshes)
    const delay = Math.min(nextAt - now, 2 * 60 * 60 * 1000);
    const timerId = window.setTimeout(fireReminder, delay);
    return () => window.clearTimeout(timerId);
  }, []);
}
