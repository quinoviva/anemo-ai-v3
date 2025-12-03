'use client';
import React from 'react';
import { Header } from '@/components/layout/Header';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (isUserLoading) {
      return; // Still waiting for Firebase to initialize and check auth state
    }
    if (!user) {
      // If not loading and no user, redirect to login
      router.push('/login');
    } else {
      // If user exists, we can show the content
      setIsCheckingAuth(false);
    }
  }, [user, isUserLoading, router]);

  if (isCheckingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  );
}
