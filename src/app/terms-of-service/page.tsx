'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import dynamic from 'next/dynamic';

const ColorBends = dynamic(() => import('@/components/ColorBends'), { ssr: false });

export default function TermsOfServicePage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-black text-white selection:bg-white/20">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <ColorBends
          colors={["#ff5c7a", "#8a5cff", "#00ffd1"]}
          rotation={0}
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
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
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
              Terms of Service
            </h1>
            <p className="text-white/40 text-sm tracking-[0.3em] uppercase">Last updated: February 2025</p>
          </header>

          <div className="space-y-12 text-lg font-light leading-relaxed text-white/70">
            <section className="space-y-4">
              <p>
                Welcome to Anemo Check, an AI-powered web application designed to help users detect
                possible signs of anemia through image analysis and health-related insights. By using
                our website, features, or services, you agree to comply with and be bound by the
                following Terms of Service. Please read them carefully before using Anemo Check.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-tight">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Anemo Check, you confirm that you have read, understood, and
                agree to these Terms of Service and our Privacy Policy. If you do not agree, you may
                not access or use our services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-tight">2. Purpose of the Service</h2>
              <p>
                Anemo Check is intended for informational and educational purposes only. The
                AI-generated results, insights, and reports are not a substitute for professional
                medical diagnosis, advice, or treatment. Always consult a qualified healthcare
                provider regarding any medical condition or concern.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-tight">3. User Accounts</h2>
              <p>
                You may use Anemo Check as a guest or sign in through Google via Firebase
                Authentication. You are responsible for maintaining the confidentiality of your account and ensuring
                that your login credentials are secure.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-tight">4. Use of the Service</h2>
              <p>By using Anemo Check, you agree:</p>
              <ul className="list-none space-y-3 pl-0 border-l border-white/10 ml-2 pl-6">
                <li>Not to misuse the platform or attempt unauthorized access.</li>
                <li>Not to upload inappropriate or harmful content.</li>
                <li>To use the app only for personal, lawful, and non-commercial purposes.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-tight">5. Image and Data Usage</h2>
              <p>
                Uploaded images are processed securely through Firebase Storage and analyzed by
                Gemini AI solely for anemia detection. Your data may be temporarily stored for report generation
                but will not be shared with third parties without your consent.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-tight">6. AI Limitations</h2>
              <p>
                Anemo Check uses advanced AI models but may produce inaccurate or incomplete results.
                The AI’s conclusions are probabilistic and should be used as guidance only.
              </p>
            </section>

            <footer className="pt-16 border-t border-white/10">
              <p className="text-sm text-white/40">
                If you have questions or concerns about these Terms, please contact us at:<br />
                <span className="text-white">support@anemocheck.app</span>
              </p>
            </footer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}