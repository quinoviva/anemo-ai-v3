'use client';
import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { AnemoLoading } from '@/components/ui/anemo-loading';
import { useOfflineQueueFlush } from '@/hooks/use-offline-queue';
import { useScanReminder } from '@/hooks/use-scan-reminder';


import dynamic from 'next/dynamic';

const ClinicBackground = dynamic(() => import('@/components/ui/ClinicBackground').then(mod => mod.ClinicBackground), { ssr: false });
const OnboardingModal = dynamic(() => import('@/components/anemo/OnboardingModal').then(mod => mod.OnboardingModal), { ssr: false });
const Breadcrumbs = dynamic(() => import('@/components/layout/Breadcrumbs').then(mod => mod.Breadcrumbs), { ssr: false });
const OfflineIndicator = dynamic(() => import('@/components/ui/OfflineIndicator').then(mod => mod.OfflineIndicator), { ssr: false });

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);


  // Global Cmd+K / Ctrl+K shortcut to navigate to AI Assistant
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        router.push('/dashboard/chatbot');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  // Flush offline-queued saves when connectivity is restored
  useOfflineQueueFlush();
  // Fire weekly scan reminder notification if permission is granted
  useScanReminder();

  useEffect(() => {
    if (isUserLoading) {
      return;
    }
    if (!user) {
      router.push('/login');
    } else {
      setIsCheckingAuth(false);
    }
  }, [user, isUserLoading, router]);

  if (isCheckingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <AnemoLoading />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col relative selection:bg-primary/20 overflow-x-hidden">
      {/* Background Layer */}
      <ClinicBackground />
      <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay z-[2]" />

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Skip-to-content for keyboard/screen reader accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-full focus:bg-primary focus:text-white focus:text-xs focus:font-bold focus:uppercase focus:tracking-widest focus:shadow-lg"
        >
          Skip to content
        </a>
        <OnboardingModal />
        <Header />
        <OfflineIndicator />
        
        <main id="main-content" className="flex-1 w-full max-w-[1600px] mx-auto pt-32 px-6 md:px-12 lg:px-20">
          <Breadcrumbs />
          <div className="w-full h-full animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-backwards">
              {children}
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}
