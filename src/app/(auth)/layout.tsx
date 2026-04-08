'use client';

import React from 'react';
import { Logo } from '@/components/layout/Logo';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

const ColorBends = dynamic(() => import('@/components/ColorBends'), { ssr: false });

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  const colors = theme === 'dark'
    ? ['#000000', '#0a0a0a', '#e11d48', '#4c0519', '#000000']
    : ['#ffffff', '#fafafa', '#fee2e2', '#fecaca', '#ffffff'];

  return (
    <div className="h-screen w-full flex overflow-hidden bg-black selection:bg-rose-500/30">
      {/* Left Panel: Visual (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-black items-center justify-center overflow-hidden border-r border-white/5">
        <div className="absolute inset-0 z-0">
          <ColorBends colors={['#e11d48', '#a3556bff']} speed={0.1} noise={0.03} warpStrength={1.0} opacity={0.1} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_100%)]" />
        </div>
        <div className="relative z-10 p-8 text-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 flex justify-center">
            <Logo className="h-12 w-12  text-white opacity-70" />
          </motion.div>
          <h1 className="text-7xl font-light tracking-tighter text-white mb-4">
            See the <span className="text-rose-600 font-medium">Unseen</span>.
          </h1>
          <p className="text-lg text-white/80 font-light tracking-wide max-w-xs mx-auto">
            Clinical-grade AI diagnostics for personal anemia monitoring.
          </p>
        </div>
      </div>

      {/* Right Panel: Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative bg-black">
        <div className="absolute inset-0 -z-10 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay" />
        <div className="w-full max-w-[420px] flex flex-col items-stretch">
          <main className="w-full relative z-10">{children}</main>
          <div className="mt-6 text-center">
            <p className="text-[10px] uppercase tracking-[0.5em] text-white/30 font-bold">
              ANEMO © 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}