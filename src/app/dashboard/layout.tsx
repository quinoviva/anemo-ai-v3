'use client';
import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { AnemoLoading } from '@/components/ui/anemo-loading';

import dynamic from 'next/dynamic';

const ClinicBackground = dynamic(() => import('@/components/ui/ClinicBackground').then(mod => mod.ClinicBackground), { ssr: false });

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
        <Header />
        
        <main className="flex-1 w-full max-w-[1600px] mx-auto pt-32 px-6 md:px-12 lg:px-20">
          <div className="w-full h-full animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-backwards">
              {children}
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}
