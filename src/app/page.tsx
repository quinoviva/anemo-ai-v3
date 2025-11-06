'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

// This is the main entry point of the app.
// It will check auth status and redirect accordingly.
export default function RootPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) {
      // Do nothing while checking auth status
      return;
    }
    if (user) {
      // If user is logged in, go to the dashboard
      router.replace('/dashboard');
    } else {
      // If user is not logged in, go to the login page
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  // Show a loading screen while the redirect is happening
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
