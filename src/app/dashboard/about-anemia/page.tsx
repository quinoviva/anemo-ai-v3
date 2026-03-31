'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Droplet,
  Activity,
  Microscope,
  FlaskConical,
  Cpu,
  Brain,
  TrendingUp,
  Globe,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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

const anemiaTypes = [
  {
    icon: Droplet,
    title: 'Iron-Deficiency',
    desc: 'The most common type. Caused by insufficient iron in diet, poor absorption, or blood loss.',
    accentColor: '#ef4444',
    badge: 'Most Common',
  },
  {
    icon: FlaskConical,
    title: 'Vitamin-Deficiency',
    desc: 'Lack of B12 or folate impairs red blood cell production, causing megaloblastic anemia.',
    accentColor: '#3b82f6',
    badge: 'B12 & Folate',
  },
  {
    icon: Activity,
    title: 'Aplastic Anemia',
    desc: 'A rare but serious condition where the bone marrow stops producing enough blood cells.',
    accentColor: '#8b5cf6',
    badge: 'Rare & Serious',
  },
  {
    icon: Microscope,
    title: 'Hemolytic Anemia',
    desc: 'Red blood cells are destroyed faster than they can be produced by the bone marrow.',
    accentColor: '#f59e0b',
    badge: 'RBC Destruction',
  },
];

const howItWorksSteps = [
  {
    number: '01',
    icon: Cpu,
    title: 'Capture',
    desc: 'Upload a photo of your eye conjunctiva or fingernails using your camera or file upload.',
  },
  {
    number: '02',
    icon: Brain,
    title: 'Analyze',
    desc: 'Our CNN model analyzes pallor and blood indicators with clinical-grade accuracy in seconds.',
  },
  {
    number: '03',
    icon: TrendingUp,
    title: 'Act',
    desc: 'Receive a personalized risk score, remedy suggestions, and trend tracking over time.',
  },
];

const whoStats = [
  { value: '2B+', label: 'People Affected Globally' },
  { value: '50%', label: 'of Pregnant Women' },
  { value: '#1', label: 'Nutritional Disorder Worldwide' },
  { value: '42%', label: 'Children Under 5 Affected' },
];

export default function AboutAnemiaPage() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-16 pb-24">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-16"
      >
        {/* Hero */}
        <motion.div variants={itemVariants} className="space-y-4 pt-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest px-3 py-1.5">
            <Droplet className="h-3 w-3" />
            Hematological Intelligence
          </span>
          <h1 className="text-6xl md:text-8xl font-light tracking-tighter text-foreground leading-[0.9]">
            Understanding{' '}
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-rose-400">
              Anemia
            </span>
            <span className="text-primary animate-pulse">.</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-light tracking-widest uppercase">
            Hematological Intelligence
          </p>
        </motion.div>

        {/* Two-column bento: What is Anemia + Common Effects */}
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            variants={itemVariants}
            className="rounded-[2.5rem] bg-background/60 backdrop-blur-xl border border-primary/10 shadow-lg p-8 space-y-6 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Droplet className="h-48 w-48" />
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                <Droplet className="h-5 w-5 text-primary" />
              </div>
              <span className="rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                Definition
              </span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">What is Anemia?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Anemia is a condition in which you lack enough healthy red blood cells to carry
              adequate oxygen to your body&apos;s tissues. Having anemia, also referred to as low
              hemoglobin, can make you feel tired and weak.
            </p>
            <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Key Indicator</p>
              <p className="font-semibold text-sm">
                Hemoglobin &lt; 12 g/dL (women) or &lt; 13 g/dL (men)
              </p>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="rounded-[2.5rem] bg-background/60 backdrop-blur-xl border border-primary/10 shadow-lg p-8 space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                <Activity className="h-5 w-5 text-red-500" />
              </div>
              <span className="rounded-full bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                Symptoms
              </span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Common Effects</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              These symptoms often develop gradually and may be mild at first.
            </p>
            <ul className="grid grid-cols-2 gap-3">
              {[
                'Extreme Fatigue',
                'Weakness',
                'Pale Skin',
                'Chest Pain',
                'Headache',
                'Cold Hands/Feet',
                'Dizziness',
                'Shortness of Breath',
              ].map((effect) => (
                <li key={effect} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-1.5 w-1.5 bg-red-400 rounded-full flex-shrink-0" />
                  {effect}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Types of Anemia */}
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Microscope className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Types of Anemia</h2>
              <p className="text-sm text-muted-foreground">Each type has distinct causes and treatments</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {anemiaTypes.map(({ icon: Icon, title, desc, accentColor, badge }) => (
              <div
                key={title}
                className="rounded-[2.5rem] bg-background/60 backdrop-blur-xl border border-primary/10 shadow-lg p-6 space-y-4 hover:border-primary/30 transition-colors"
                style={{ borderTop: `3px solid ${accentColor}` }}
              >
                <div className="flex items-start justify-between">
                  <div
                    className="p-3 rounded-2xl border"
                    style={{ backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: accentColor }} />
                  </div>
                  <span
                    className="rounded-full text-[10px] font-bold uppercase tracking-widest px-2 py-1 border"
                    style={{
                      backgroundColor: `${accentColor}20`,
                      color: accentColor,
                      borderColor: `${accentColor}40`,
                    }}
                  >
                    {badge}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-base mb-1">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* How Anemo Works */}
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Cpu className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">How Anemo Works</h2>
              <p className="text-sm text-muted-foreground">AI-powered detection in three simple steps</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {howItWorksSteps.map(({ number, icon: Icon, title, desc }) => (
              <div
                key={number}
                className="rounded-[2.5rem] bg-background/60 backdrop-blur-xl border border-primary/10 shadow-lg p-7 space-y-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <span className="text-5xl font-black text-primary/10 leading-none select-none">
                    {number}
                  </span>
                  <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* WHO Stats Bento */}
        <motion.div
          variants={itemVariants}
          className="rounded-[2.5rem] bg-background/60 backdrop-blur-xl border border-blue-500/20 shadow-lg p-8 md:p-12 relative overflow-hidden"
          style={{ borderLeft: '4px solid #3b82f6' }}
        >
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Globe className="h-64 w-64" />
          </div>
          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                <Globe className="h-5 w-5 text-blue-500" />
              </div>
              <span className="rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                WHO Statistics
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">A Global Health Crisis</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {whoStats.map(({ value, label }) => (
                <div
                  key={label}
                  className="rounded-2xl bg-background/50 border border-border/50 p-5 text-center space-y-1"
                >
                  <p className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-rose-400">
                    {value}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium leading-tight">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div variants={itemVariants} className="text-center py-8 space-y-6">
          <p className="text-2xl font-light text-muted-foreground">
            Ready to take control of your health?
          </p>
          <Button size="lg" className="rounded-full text-lg px-10" asChild>
            <Link href="/dashboard/analysis">Start Analysis Now</Link>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
