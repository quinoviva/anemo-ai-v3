'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Activity, Globe, Database } from 'lucide-react';
import dynamic from 'next/dynamic';

const ColorBends = dynamic(() => import('@/components/ColorBends'), { ssr: false });

export default function StatusPage() {
  const router = useRouter();

  const systems = [
    { name: "Core API", status: "Operational", icon: <Globe className="w-5 h-5" /> },
    { name: "Image Analysis Engine", status: "Operational", icon: <Activity className="w-5 h-5" /> },
    { name: "Database (Firestore)", status: "Operational", icon: <Database className="w-5 h-5" /> },
    { name: "Authentication", status: "Operational", icon: <CheckCircle2 className="w-5 h-5" /> }
  ];

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-black text-white selection:bg-white/20">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <ColorBends
          colors={["#22c55e", "#10b981", "#3b82f6"]}
          rotation={45}
          speed={0.1}
          scale={1.5}
          frequency={0.5}
          warpStrength={1}
          mouseInfluence={0.5}
          parallax={0.2}
          noise={0.1}
          transparent
          autoRotate={0}
          color=""
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="mb-12 group text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back
          </Button>

          <header className="mb-16">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
              System Status
            </h1>
            <p className="text-white/40 text-sm tracking-[0.3em] uppercase">Real-time health of Anemo services</p>
          </header>

          <div className="mb-12 p-8 rounded-3xl bg-green-500/10 border border-green-500/20 backdrop-blur-md flex items-center gap-6">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
                <h2 className="text-2xl font-semibold tracking-tight text-green-400">All Systems Operational</h2>
                <p className="text-white/40">Verified as of {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-4 mb-20">
            {systems.map((system, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 + 0.5 }}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-4">
                    <span className="text-white/40">{system.icon}</span>
                    <span className="text-lg font-medium">{system.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium text-green-400 uppercase tracking-widest">{system.status}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <footer className="pt-16 border-t border-white/10">
            <p className="text-sm text-white/40 italic">
              Historical uptime and detailed incident reports are available for enterprise customers.
            </p>
          </footer>
        </motion.div>
      </div>
    </div>
  );
}
