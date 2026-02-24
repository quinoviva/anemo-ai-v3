'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, MapPin, Phone, Send } from 'lucide-react';
import dynamic from 'next/dynamic';

const ColorBends = dynamic(() => import('@/components/ColorBends'), { ssr: false });

export default function ContactPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-black text-white selection:bg-white/20">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <ColorBends
          colors={["#f59e0b", "#ef4444", "#8b5cf6"]}
          rotation={90}
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

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-24 md:py-32">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
            <div>
              <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="max-w-2xl">
                  <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
                    Get in Touch
                  </h1>
                  <p className="text-white/40 text-xl font-light leading-relaxed">
                    Have questions about our AI analysis? Need technical support? 
                    Our team is here to help you.
                  </p>
                </div>
              </header>

              <div className="space-y-8">
                <div className="flex items-center gap-6 group">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:scale-110 transition-transform">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-white/20 mb-1">Email</p>
                    <p className="text-lg font-medium">support@anemocheck.app</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 group">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:scale-110 transition-transform">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-white/20 mb-1">Office</p>
                    <p className="text-lg font-medium">West Visayas State University - Pototan Campus</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 group">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:scale-110 transition-transform">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-white/20 mb-1">Phone</p>
                    <p className="text-lg font-medium">+1 (555) 000-ANEMO</p>
                  </div>
                </div>
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="p-10 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-2xl"
            >
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">First Name</label>
                    <input type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-white/20 transition-colors" placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Last Name</label>
                    <input type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-white/20 transition-colors" placeholder="Doe" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Email Address</label>
                  <input type="email" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-white/20 transition-colors" placeholder="john@example.com" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Message</label>
                  <textarea rows={4} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-white/20 transition-colors resize-none" placeholder="How can we help?" />
                </div>

                <Button className="w-full h-16 rounded-2xl bg-white text-black hover:bg-white/90 text-lg font-semibold flex items-center justify-center gap-2">
                  Send Message
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
