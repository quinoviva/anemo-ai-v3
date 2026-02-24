'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { AnemoLoading } from '@/components/ui/anemo-loading'; // Correct path if needed, or stick to what was there if it was working
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';

const ColorBends = dynamic(() => import('@/components/ColorBends'), { ssr: false });

export default function RootPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!isUserLoading && user) {
      setIsRedirecting(true);
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || isRedirecting) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-black">
         <AnemoLoading />
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center text-white bg-black">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <ColorBends
          colors={["#ff5c7a", "#8a5cff", "#00ffd1"]}
          rotation={0}
          speed={0.2}
          scale={1}
          frequency={1}
          warpStrength={1}
          mouseInfluence={1}
          parallax={0.5}
          noise={0.1}
          transparent
          autoRotate={0}
          color=""
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 flex flex-col items-center space-y-12 p-6 text-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.8, type: "spring" }}
        >
          <h1 className="font-light text-8xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-white/70 drop-shadow-2xl">
            ANEMO
          </h1>
          <p className="md:text-2xl font-light text-white/80 tracking-widest mt-4">
            CNN and AI-Powered Health Analysis
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-6 w-full max-w-md"
        >
          <Button 
            asChild 
            size="lg" 
            className="w-full h-14 text-lg rounded-full bg-white text-black hover:bg-white/90 transition-all shadow-xl hover:scale-105"
          >
            <Link href="/login">Login</Link>
          </Button>
          <Button 
            asChild 
            size="lg" 
            variant="outline" 
            className="w-full h-14 text-lg rounded-full border-white/40 text-white hover:bg-white/10 hover:text-white backdrop-blur-md transition-all hover:scale-105"
          >
            <Link href="/signup">Sign Up</Link>
          </Button>
        </motion.div>
      </motion.div>

      {/* Footer / Copyright */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-8 text-white/40 text-sm font-light"
      >
        © 2025 Anemo. All rights reserved.
      </motion.div>
    </div>
  );
}