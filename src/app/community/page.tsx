'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare, Twitter, Facebook, Instagram, Music } from 'lucide-react';
import dynamic from 'next/dynamic';

import './team.css';

const ColorBends = dynamic(() => import('@/components/ColorBends'), { ssr: false });

const teamMembers = [
  { name: 'Zaxius Berina', role: 'Visionary Lead', image: 'https://placehold.co/400x400/1a1a1a/FFF?text=Z' },
  { name: 'Ashley', role: 'Core Operations', image: 'https://placehold.co/400x400/1a1a1a/FFF?text=A' },
  { name: 'Erika', role: 'Design Lead', image: 'https://placehold.co/400x400/1a1a1a/FFF?text=E' },
  { name: 'Emerald', role: 'Tech Innovation', image: 'https://placehold.co/400x400/1a1a1a/FFF?text=E' },
];

const socialLinks = [
  { name: 'Discord', icon: <MessageSquare className="w-5 h-5" />, link: '#' },
  { name: 'Facebook', icon: <Facebook className="w-5 h-5" />, link: '#' },
  { name: 'X', icon: <Twitter className="w-5 h-5" />, link: '#' },
  { name: 'Instagram', icon: <Instagram className="w-5 h-5" />, link: '#' },
  { name: 'TikTok', icon: <Music className="w-5 h-5" />, link: '#' },
];

export default function CommunityPage() {
  const router = useRouter();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.95, filter: 'blur(10px)' },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        duration: 0.8,
        ease: [0.23, 1, 0.32, 1],
      },
    },
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#050505] text-white selection:bg-white/20 font-sans">
      
      {/* Subtle Ambient Background */}
      <div className="fixed inset-0 -z-10 opacity-30">
        <ColorBends
          colors={["#333", "#111", "#000"]}
          rotation={45}
          speed={0.05}
          scale={2}
          frequency={0.2}
          warpStrength={0.5}
          mouseInfluence={0.1}
          parallax={0.1}
          noise={0.05}
          transparent
          autoRotate={0}
          color=""
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-12 md:py-24">
        
        {/* Minimal Nav */}
        <motion.div 
          initial={{ opacity: 0 }} 
          whileInView={{ opacity: 1 }} 
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="mb-24 flex justify-between items-center"
        >
          <Button 
            variant="link" 
            onClick={() => router.back()}
            className="text-xs tracking-[0.2em] text-white/40 hover:text-white uppercase p-0"
          >
            <ArrowLeft className="mr-4 h-3 w-3" />
            Back to Dashboard
          </Button>
          <span className="text-xs tracking-[0.2em] text-white/20 uppercase">Community Node</span>
        </motion.div>

        {/* 1. Meet The Minds (Hero) */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-40"
        >
           <motion.div variants={itemVariants} className="text-center mb-20">
              <h1 className="text-5xl md:text-8xl font-thin tracking-tighter text-white">
                THE MINDS
              </h1>
              <div className="horizon-line" />
              <p className="text-sm md:text-base text-white/40 tracking-[0.3em] uppercase max-w-lg mx-auto leading-loose">
                Behind Anemo Vision
              </p>
           </motion.div>

           <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-16 max-w-6xl mx-auto">
              {teamMembers.map((member, i) => (
                 <motion.div
                    key={i}
                    variants={itemVariants}
                    className="group team-card-premium flex flex-col items-center text-center cursor-pointer"
                 >
                    <div className="relative team-image-container w-40 h-40 md:w-56 md:h-56 mb-8 overflow-hidden grayscale group-hover:grayscale-0">
                       <div className="glow-ring" />
                       <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                       {/* eslint-disable-next-line @next/next/no-img-element */}
                       <img 
                          src={member.image} 
                          alt={member.name} 
                          className="w-full h-full object-cover scale-100 group-hover:scale-110 transition-transform duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]" 
                       />
                    </div>
                    
                    <div className="space-y-2">
                       <h3 className="team-name text-2xl md:text-3xl font-light tracking-wide">{member.name}</h3>
                       <div className="h-px w-0 bg-white/30 group-hover:w-full transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] mx-auto" />
                       <p className="team-role pt-2">{member.role}</p>
                    </div>
                 </motion.div>
              ))}
           </div>
        </motion.div>

        <div className="h-px w-full bg-white/5 mb-24" />

        {/* 2. Connect (Minimalist One-Liner) */}
        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 1, delay: 0.5 }}
           className="flex flex-col items-center space-y-8 mb-32"
        >
            <span className="text-[10px] tracking-[0.4em] uppercase text-white/30">Connect with us</span>
            <div className="flex items-center justify-center gap-8 md:gap-16">
                {socialLinks.map((social, i) => (
                    <motion.a 
                        key={i} 
                        href={social.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        whileHover={{ y: -5, scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="text-white/30 hover:text-white transition-colors duration-500 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                    >
                        {social.icon}
                        <span className="sr-only">{social.name}</span>
                    </motion.a>
                ))}
            </div>
        </motion.div>

        {/* Footer Note */}
        <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center pb-12"
        >
            <p className="text-[10px] text-white/10 uppercase tracking-[0.5em]">Anemo Check</p>
        </motion.div>

      </div>
    </div>
  );
}