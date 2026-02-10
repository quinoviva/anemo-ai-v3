'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import dynamic from 'next/dynamic';

const ColorBends = dynamic(() => import('@/components/ColorBends'), { ssr: false });

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-black text-white selection:bg-white/20">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <ColorBends
          colors={["#00ffd1", "#8a5cff", "#ff5c7a"]}
          rotation={120}
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
              Privacy Policy
            </h1>
            <p className="text-white/40 text-sm tracking-[0.3em] uppercase">Last updated: February 2025</p>
          </header>

          <div className="space-y-12 text-lg font-light leading-relaxed text-white/70">
            <section className="space-y-4">
              <p>
                Welcome to Anemo Check. Your privacy and data protection
                are important to us. This Privacy Policy explains how we collect, use, store, and
                protect your personal information when you use our app and services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-tight">1. Information We Collect</h2>
              <p>
                We collect only the data necessary to deliver accurate and personalized anemia
                analysis.
              </p>
              <div className="border-l border-white/10 ml-2 pl-6 space-y-4">
                <p><strong>Account Information:</strong> Name, email, and profile photo via Google Auth.</p>
                <p><strong>Uploaded Images:</strong> Photos securely stored in Firebase Storage for analysis.</p>
                <p><strong>Health Inputs:</strong> Optional symptoms and menstrual data.</p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-tight">2. How We Use Your Information</h2>
              <p>We use your data to:</p>
              <ul className="list-none space-y-3 pl-0 border-l border-white/10 ml-2 pl-6">
                <li>Analyze images and provide AI-based insights.</li>
                <li>Generate and store personalized health reports.</li>
                <li>Improve app accuracy and user experience.</li>
              </ul>
              <p className="pt-2 italic text-white/50">We do not sell, trade, or rent your personal information to anyone.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-tight">3. Data Storage and Security</h2>
              <p>
                Your data is stored securely using Google Firebase services. Images and reports are encrypted 
                during upload, storage, and retrieval. You may request deletion of your account and all 
                associated data at any time.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-tight">4. AI and Data Processing</h2>
              <p>
                Anemo Check uses Gemini AI and a custom CNN model to process your images. AI-generated 
                outputs are probabilistic and may not always be medically accurate. No personal data 
                is shared externally or used for training unrelated models.
              </p>
            </section>

            <footer className="pt-16 border-t border-white/10">
              <p className="text-sm text-white/40">
                To exercise your rights or ask questions, contact us via:<br />
                <span className="text-white">support@anemocheck.app</span>
              </p>
            </footer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}