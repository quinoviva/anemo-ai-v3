'use client';

import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import './ClinicBackground.css';

export const ClinicBackground = () => {
  const { scrollY } = useScroll();

  // Parallax Transforms
  // Layer 1: Background (Walls/Windows) - Moves Slowest
  const backgroundY = useTransform(scrollY, [0, 1000], [0, 100]);
  
  // Layer 2: Furniture (Desk) - Medium Speed
  const furnitureY = useTransform(scrollY, [0, 1000], [0, -50]);
  
  // Layer 3: Equipment (Monitor, Cart) - Faster
  const equipmentY = useTransform(scrollY, [0, 1000], [0, -150]);
  
  // Layer 4: Foreground (IV Drip, Glass) - Fastest
  const foregroundY = useTransform(scrollY, [0, 1000], [0, -300]);

  return (
    <div className="clinic-scene-container">
      {/* --- Layer 1: Background Structure --- */}
      <motion.div style={{ y: backgroundY }} className="absolute inset-0 w-full h-full">
        <div className="clinic-wall-grid" />
        
        {/* Window with Blinds */}
        <div className="clinic-window">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="window-blind" />
          ))}
        </div>
      </motion.div>

      {/* --- Layer 2: Furniture --- */}
      <motion.div style={{ y: furnitureY }} className="absolute inset-0 w-full h-full">
        {/* Reception Desk */}
        <div className="clinic-desk">
          <div className="desk-logo flex items-center justify-center">
            <span className="text-white font-bold text-xl">+</span>
          </div>
        </div>
      </motion.div>

      {/* --- Layer 3: Equipment --- */}
      <motion.div style={{ y: equipmentY }} className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Medical Monitor on Desk */}
        <div className="medical-monitor" style={{ bottom: '35%', left: '15%' }}>
          <div className="monitor-screen">
            <div className="monitor-line animate-pulse" />
            <div className="absolute top-2 right-2 text-[8px] text-green-400">98%</div>
          </div>
        </div>

        {/* Medical Cart */}
        <div className="medical-cart" style={{ bottom: '25%', right: '20%' }}>
           <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-blue-100 border border-blue-200" />
           <div className="absolute top-12 left-2 w-16 h-2 bg-slate-200 rounded-full" />
           <div className="absolute top-16 left-2 w-12 h-2 bg-slate-200 rounded-full" />
        </div>
      </motion.div>

      {/* --- Layer 4: Foreground & Details --- */}
      <motion.div style={{ y: foregroundY }} className="absolute inset-0 w-full h-full pointer-events-none">
        {/* IV Drip Stand (Blurred Foreground) */}
        <div className="iv-drip-stand foreground-blur">
          <div className="iv-bag" />
        </div>

        {/* Floating Particles/Dust for atmosphere */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full opacity-40 blur-[1px]" />
        <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-blue-200 rounded-full opacity-30 blur-[1px]" />
      </motion.div>

      {/* Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent dark:from-[#020617]/90 pointer-events-none" />
    </div>
  );
};