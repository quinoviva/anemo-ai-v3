'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { IronCatcherGame } from '@/components/anemo/IronCatcherGame';
import { Gamepad2, MousePointer2, Target, ShieldOff } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 80 } },
};

const infoPills = [
  {
    icon: MousePointer2,
    label: 'Controls',
    value: 'Mouse Hover / Touch Drag',
    accentColor: '#3b82f6',
  },
  {
    icon: Target,
    label: 'Goal',
    value: 'Catch Iron-Rich Foods \uD83E\uDD69\uD83E\uDD6C',
    accentColor: '#22c55e',
  },
  {
    icon: ShieldOff,
    label: 'Avoid',
    value: 'Absorption Blockers \u2615\uFE0F\uD83C\uDF75',
    accentColor: '#ef4444',
  },
];

export default function IronCatcherPage() {
  return (
    <div className="w-full max-w-5xl mx-auto pb-24 space-y-12">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-12"
      >
        {/* Hero */}
        <motion.div variants={itemVariants} className="space-y-4 pt-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest px-3 py-1.5">
              <Gamepad2 className="h-3 w-3" />
              Arcade
            </span>
          </div>
          <h1 className="text-6xl md:text-8xl font-light tracking-tighter text-foreground leading-[0.9]">
            Iron{' '}
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-rose-400">
              Catcher
            </span>
            <span className="text-primary animate-pulse">.</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-light tracking-widest uppercase">
            Hemoglobin Rush Arcade
          </p>
        </motion.div>

        {/* Game Area */}
        <motion.div
          variants={itemVariants}
          className="rounded-[2.5rem] bg-background/60 backdrop-blur-xl border border-primary/10 shadow-lg p-4 md:p-6 overflow-hidden"
        >
          <div className="w-full flex justify-center">
            <div className="w-full max-w-4xl">
              <IronCatcherGame />
            </div>
          </div>
        </motion.div>

        {/* Info Pills */}
        <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-5">
          {infoPills.map(({ icon: Icon, label, value, accentColor }) => (
            <div
              key={label}
              className="rounded-[2.5rem] bg-background/60 backdrop-blur-xl border border-primary/10 shadow-lg p-6 space-y-3 text-center hover:border-primary/30 transition-colors"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border"
                style={{ backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40` }}
              >
                <Icon className="h-5 w-5" style={{ color: accentColor }} />
              </div>
              <span
                className="rounded-full text-[10px] font-bold uppercase tracking-widest px-3 py-1 border inline-block"
                style={{
                  backgroundColor: `${accentColor}20`,
                  color: accentColor,
                  borderColor: `${accentColor}40`,
                }}
              >
                {label}
              </span>
              <p className="text-sm font-medium text-muted-foreground">{value}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
