'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Code2, Sparkles, Terminal } from 'lucide-react';
import dynamic from 'next/dynamic';

const ColorBends = dynamic(() => import('@/components/ColorBends'), { ssr: false });

export default function DocsPage() {
  const router = useRouter();

  const sections = [
    {
      title: "Getting Started",
      icon: <Sparkles className="w-5 h-5" />,
      items: ["Introduction", "Quick Start Guide", "Core Concepts"]
    },
    {
      title: "Analysis Guide",
      icon: <BookOpen className="w-5 h-5" />,
      items: ["How to Take Photos", "Interpreting Results", "Women's Health Mode"]
    },
    {
      title: "Developers",
      icon: <Terminal className="w-5 h-5" />,
      items: ["API Reference", "Webhooks", "SDKs"]
    }
  ];

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-black text-white selection:bg-white/20">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <ColorBends
          colors={["#a855f7", "#6366f1", "#06b6d4"]}
          rotation={300}
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

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-24 md:py-32">
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

          <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-2xl">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
                Documentation
              </h1>
              <p className="text-white/40 text-lg font-light">Everything you need to know about using and building with Anemo.</p>
            </div>
            <div className="p-1 px-4 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-xs font-medium uppercase tracking-[0.2em] text-white/60 h-fit mb-2">
                v2.4.0-stable
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-20">
            {sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.5 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-3 text-white/40 border-b border-white/5 pb-4">
                  {section.icon}
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em]">{section.title}</h3>
                </div>
                <ul className="space-y-4">
                  {section.items.map((item, i) => (
                    <li key={i}>
                      <a href="#" className="text-lg font-light text-white/60 hover:text-white transition-colors flex items-center group">
                        {item}
                        <ArrowLeft className="ml-2 w-4 h-4 opacity-0 group-hover:opacity-100 rotate-180 transition-all" />
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <div className="p-12 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Code2 className="w-8 h-8 text-white/40" />
                </div>
                <div>
                    <h3 className="text-xl font-bold mb-1">Looking for API access?</h3>
                    <p className="text-white/40 font-light">Integrate Anemo analysis into your own medical software.</p>
                </div>
            </div>
            <Button variant="outline" className="rounded-full border-white/10 hover:bg-white/10">
                Request API Key
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
