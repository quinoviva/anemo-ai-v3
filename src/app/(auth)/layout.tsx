'use client';

import React from 'react';
import { Logo } from '@/components/layout/Logo';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

const ColorBends = dynamic(() => import('@/components/ColorBends'), { ssr: false });

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  
  // Premium color palette based on theme
  const colors = theme === 'dark' 
    ? ['#000000', '#1a1a1a', '#e11d48', '#4c0519', '#000000'] // Dark: Deep blacks with red accents
    : ['#ffffff', '#f4f4f5', '#ffe4e6', '#fda4af', '#ffffff']; // Light: Clean whites with soft rose

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-background">
      {/* Left Panel: Visual Experience */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-black items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
             <ColorBends 
                colors={colors}
                speed={0.15}
                noise={0.1}
                warpStrength={1.5}
                opacity={0.8}
             />
             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/80" />
        </div>
        
        {/* Glass Overlay Content */}
        <div className="relative z-10 p-16 max-w-xl text-center">
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.8, delay: 0.2 }}
             className="mb-10 flex justify-center"
           >
             <div className="h-28 w-28 rounded-[2rem] bg-white/5 backdrop-blur-2xl border border-white/10 flex items-center justify-center shadow-2xl ring-1 ring-white/20">
                <Logo className="h-16 w-16" />
             </div>
           </motion.div>
           
           <motion.h1 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.8, delay: 0.4 }}
             className="text-6xl font-light tracking-tight text-white mb-8 leading-tight drop-shadow-lg"
           >
             See the <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-red-600">Unseen</span>.
           </motion.h1>
           
           <motion.p 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.8, delay: 0.6 }}
             className="text-xl text-white/80 font-light leading-relaxed tracking-wide"
           >
             Advanced anemia detection powered by clinical-grade AI and computer vision. 
             Experience the future of personal diagnostics.
           </motion.p>
        </div>
        
        {/* Decorative elements */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 1 }}
          className="absolute bottom-12 left-12 right-12 flex justify-between text-xs text-white/40 uppercase tracking-[0.2em] font-medium"
        >
            <span>Anemo AI © 2026</span>
            <span>Clinical Grade • Privacy First</span>
        </motion.div>
      </div>

      {/* Right Panel: Authentication Form */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Subtle Background Texture */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
        <div className="absolute inset-0 -z-10 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay" /> 

        <div className="w-full max-w-[480px] p-6 md:p-12 relative z-10">
             {/* Mobile Logo Show */}
             <div className="lg:hidden flex flex-col items-center mb-10 gap-4">
                 <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-background border border-primary/10 flex items-center justify-center shadow-xl">
                     <Logo className="h-10 w-10 text-primary" />
                 </div>
                 <h1 className="text-3xl font-bold tracking-tight text-foreground">Anemo AI</h1>
             </div>
             
             {children}
        </div>
      </div>
    </div>
  );
}
