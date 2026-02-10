'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck, Lock, EyeOff, Server } from 'lucide-react';
import dynamic from 'next/dynamic';

const ColorBends = dynamic(() => import('@/components/ColorBends'), { ssr: false });

export default function SecurityPage() {
  const router = useRouter();

  const securityFeatures = [
    {
      icon: <Lock className="w-6 h-6" />,
      title: "End-to-End Encryption",
      description: "All data transmitted between your device and our servers is encrypted using industry-standard TLS/SSL protocols."
    },
    {
      icon: <ShieldCheck className="w-6 h-6" />,
      title: "Secure Authentication",
      description: "We use Firebase Authentication to ensure your login credentials are handled with the highest level of security."
    },
    {
      icon: <EyeOff className="w-6 h-6" />,
      title: "Privacy First",
      description: "Your health data and images are processed with strict privacy controls and are never shared with unauthorized parties."
    },
    {
      icon: <Server className="w-6 h-6" />,
      title: "Cloud Security",
      description: "Our infrastructure is hosted on Google Cloud Platform, benefiting from world-class physical and network security."
    }
  ];

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-black text-white selection:bg-white/20">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <ColorBends
          colors={["#4f46e5", "#06b6d4", "#8b5cf6"]}
          rotation={240}
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
              Security at Anemo
            </h1>
            <p className="text-white/40 text-sm tracking-[0.3em] uppercase">Built on trust and world-class infrastructure</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
            {securityFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.5 }}
                className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors group"
              >
                <div className="mb-4 text-primary group-hover:scale-110 transition-transform duration-500">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2 tracking-tight">{feature.title}</h3>
                <p className="text-white/50 font-light leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          <div className="space-y-12 text-lg font-light leading-relaxed text-white/70">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-tight">Security Disclosure</h2>
              <p>
                If you believe you have found a security vulnerability in Anemo, please contact us 
                immediately. We take all reports seriously and will work with you to resolve 
                the issue as quickly as possible.
              </p>
            </section>

            <footer className="pt-16 border-t border-white/10">
              <p className="text-sm text-white/40">
                For security-related inquiries, contact:<br />
                <span className="text-white">security@anemocheck.app</span>
              </p>
            </footer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
