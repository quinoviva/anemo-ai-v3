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
  Heart,
  Calendar,
  ChevronRight,
  Info,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  BookOpen,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 50, damping: 20 } },
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

const systemSteps = [
  {
    number: '01',
    icon: Cpu,
    title: 'Image Capture',
    desc: 'Upload a clear photo of your conjunctiva, palm, or fingernails using your camera.',
    details: 'We validate the image for quality and correct body part before analysis.',
  },
  {
    number: '02',
    icon: Brain,
    title: 'AI Analysis',
    desc: 'Our multimodal AI analyzes pallor indicators and clinical features with high accuracy.',
    details: 'Uses strict scoring: any pallor = minimum 50, visible creases = 60+, waxy = 80+.',
  },
  {
    number: '03',
    icon: TrendingUp,
    title: 'Results & Action',
    desc: 'Receive a personalized risk assessment, remedy suggestions, and trend tracking.',
    details: 'Score > 60 = POSITIVE, 30-60 = SUSPECTED, < 30 = NEGATIVE.',
  },
];

const cyclePhases = [
  { phase: 'Menstrual', days: '1-5', color: '#ef4444', icon: Droplet, iron: 'Higher need - blood loss' },
  { phase: 'Follicular', days: '6-12', color: '#f59e0b', icon: TrendingUp, iron: 'Absorption optimal' },
  { phase: 'Ovulation', days: '13-15', color: '#ec4899', icon: Heart, iron: 'Maintain intake' },
  { phase: 'Luteal', days: '16-28', color: '#8b5cf6', icon: Calendar, iron: 'PMT risk - increase iron' },
];

const whoStats = [
  { value: '2B+', label: 'People Affected Globally' },
  { value: '50%', label: 'of Pregnant Women' },
  { value: '#1', label: 'Nutritional Disorder Worldwide' },
  { value: '42%', label: 'Children Under 5 Affected' },
];

export default function AboutAnemiaPage() {
  return (
    <div className="relative w-full">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full space-y-16 pb-24"
      >
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="space-y-4 pt-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest px-3 py-1.5">
              <Droplet className="h-3 w-3" />
              Hematological Intelligence
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-light tracking-tighter text-foreground leading-[0.9] flex flex-wrap items-baseline gap-x-4">
            <span className="opacity-80">Understanding</span>
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-rose-400">
              Anemia
            </span>
            <span className="text-primary animate-pulse">.</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-light tracking-widest uppercase">
            Everything You Need to Know
          </p>
        </motion.div>

        {/* Hero Cards - What is Anemia & Symptoms */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* What is Anemia */}
          <motion.div
            variants={itemVariants}
            className="group relative overflow-hidden rounded-[2.5rem] glass-panel flex flex-col p-8 md:p-10 cursor-pointer border-primary/20 shadow-[0_20px_60px_-15px_rgba(220,38,38,0.1)] min-h-[400px]"
          >
            <div className="absolute -top-40 -right-40 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-primary/20 rounded-full blur-[80px] md:blur-[160px] group-hover:bg-primary/30 transition-colors duration-1000 mix-blend-screen" />
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                  <Droplet className="h-5 w-5 text-primary" />
                </div>
                <span className="rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                  Definition
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight">What is Anemia?</h2>
              <p className="text-muted-foreground leading-relaxed text-lg">
                Anemia is a condition in which you lack enough healthy red blood cells to carry adequate oxygen to your body&apos;s tissues. 
                Having anemia, also referred to as low hemoglobin, can make you feel tired and weak.
              </p>
              <div className="rounded-2xl bg-primary/5 border border-primary/10 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Hemoglobin Thresholds (WHO)</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-center">
                    <p className="text-sm font-bold text-rose-500">Females</p>
                    <p className="text-2xl font-black">&lt; 12 g/dL</p>
                    <p className="text-xs text-muted-foreground">Non-pregnant</p>
                  </div>
                  <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 text-center">
                    <p className="text-sm font-bold text-blue-500">Males</p>
                    <p className="text-2xl font-black">&lt; 13 g/dL</p>
                    <p className="text-xs text-muted-foreground">Adult</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Symptoms */}
          <motion.div
            variants={itemVariants}
            className="group relative overflow-hidden rounded-[2.5rem] glass-panel flex flex-col p-8 md:p-10 cursor-pointer border-red-500/20 shadow-[0_20px_60px_-15px_rgba(239,68,68,0.1)] min-h-[400px]"
          >
            <div className="absolute -bottom-40 -right-40 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-red-500/20 rounded-full blur-[80px] md:blur-[160px] group-hover:bg-red-500/30 transition-colors duration-1000 mix-blend-screen" />
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                  <Activity className="h-5 w-5 text-red-500" />
                </div>
                <span className="rounded-full bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                  Symptoms
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight">Common Effects</h2>
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
            </div>
          </motion.div>
        </div>

        {/* Women's Cycle & Anemia */}
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
              <Calendar className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Women&apos;s Cycle & Anemia</h2>
              <p className="text-sm text-muted-foreground">How your menstrual cycle affects iron levels</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="group relative overflow-hidden rounded-[2.5rem] glass-panel flex flex-col p-6 md:p-8 cursor-pointer border-rose-500/20 shadow-[0_20px_60px_-15px_rgba(244,63,94,0.1)]">
              <div className="absolute -top-20 -right-20 w-[250px] h-[250px] bg-rose-500/20 rounded-full blur-[80px] mix-blend-screen" />
              <div className="relative z-10 space-y-4">
                <h3 className="text-lg font-semibold">Cycle Phases & Iron Needs</h3>
                <div className="space-y-2">
                  {cyclePhases.map(({ phase, days, color, icon: Icon, iron }) => (
                    <div key={phase} className="flex items-center gap-3 p-3 rounded-xl bg-background/50">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
                        <Icon className="h-4 w-4" style={{ color }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">{phase}</span>
                          <span className="text-xs text-muted-foreground">Day {days}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{iron}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-[2.5rem] glass-panel flex flex-col p-6 md:p-8 cursor-pointer border-rose-500/20 shadow-[0_20px_60px_-15px_rgba(244,63,94,0.1)]">
              <div className="absolute -bottom-20 -left-20 w-[250px] h-[250px] bg-cyan-500/20 rounded-full blur-[80px] mix-blend-screen" />
              <div className="relative z-10 space-y-4">
                <h3 className="text-lg font-semibold">Why Track Your Cycle?</h3>
                <ul className="space-y-3">
                  {[
                    'Blood loss during periods depletes iron stores',
                    'Hemoglobin levels fluctuate throughout cycle',
                    'Luteal phase may have lower iron absorption',
                    'Heavy flow increases anemia risk',
                    'Cycle data improves AI accuracy',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <ChevronRight className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="w-full rounded-full bg-rose-500 hover:bg-rose-600 text-white" asChild>
                  <Link href="/dashboard#cycle-log">
                    Log Your Cycle
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* How Anemo Works */}
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Cpu className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">How Anemo Works</h2>
              <p className="text-sm text-muted-foreground">AI-powered detection in three steps</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {systemSteps.map(({ number, icon: Icon, title, desc, details }) => (
              <div
                key={number}
                className="group relative overflow-hidden rounded-[2.5rem] glass-panel flex flex-col p-7 cursor-pointer border-primary/20 shadow-[0_20px_60px_-15px_rgba(220,38,38,0.1)] hover:border-primary/40 transition-colors"
              >
                <div className="absolute -top-20 -right-20 w-[200px] h-[200px] bg-primary/10 rounded-full blur-[60px] group-hover:bg-primary/20 transition-colors" />
                <div className="relative z-10 space-y-4">
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
                    <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-primary/10">{details}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Gender-Specific Thresholds */}
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
              <Globe className="h-5 w-5 text-cyan-500" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">How Results Are Calculated</h2>
              <p className="text-sm text-muted-foreground">Gender-specific severity thresholds</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Female */}
            <div className="group relative overflow-hidden rounded-[2.5rem] glass-panel flex flex-col p-6 md:p-8 cursor-pointer border-rose-500/20 shadow-[0_20px_60px_-15px_rgba(244,63,94,0.1)]">
              <div className="absolute -top-20 -right-20 w-[250px] h-[250px] bg-rose-500/20 rounded-full blur-[80px] mix-blend-screen" />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-rose-500/10">
                    <Heart className="h-5 w-5 text-rose-500" />
                  </div>
                  <h3 className="text-xl font-bold text-rose-500">Females</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                    <span className="text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Normal</span>
                    <span className="font-bold text-green-600">&gt; 12.0 g/dL</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <span className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" /> Mild</span>
                    <span className="font-bold text-yellow-600">10.0 - 12.0 g/dL</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <span className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Moderate/Severe</span>
                    <span className="font-bold text-red-600">&lt; 10.0 g/dL</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Male */}
            <div className="group relative overflow-hidden rounded-[2.5rem] glass-panel flex flex-col p-6 md:p-8 cursor-pointer border-blue-500/20 shadow-[0_20px_60px_-15px_rgba(37,99,235,0.1)]">
              <div className="absolute -bottom-20 -right-20 w-[250px] h-[250px] bg-blue-500/20 rounded-full blur-[80px] mix-blend-screen" />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-blue-500/10">
                    <Shield className="h-5 w-5 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold text-blue-500">Males</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                    <span className="text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Normal</span>
                    <span className="font-bold text-green-600">&gt; 13.0 g/dL</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <span className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" /> Mild</span>
                    <span className="font-bold text-yellow-600">11.0 - 13.0 g/dL</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <span className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Moderate/Severe</span>
                    <span className="font-bold text-red-600">&lt; 11.0 g/dL</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Results */}
          <div className="group relative overflow-hidden rounded-[2.5rem] glass-panel flex flex-col p-6 md:p-8 cursor-pointer border-primary/20 shadow-[0_20px_60px_-15px_rgba(220,38,38,0.1)]">
            <div className="absolute -top-20 -left-20 w-[250px] h-[250px] bg-primary/10 rounded-full blur-[80px] mix-blend-screen" />
            <div className="relative z-10 space-y-4">
              <h3 className="text-lg font-semibold">Analysis Result Types</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl bg-green-500/10 border border-green-500/20 p-4 text-center">
                  <p className="text-xl font-black text-green-500">Normal</p>
                  <p className="text-sm font-medium text-green-600">ANEMIA NEGATIVE</p>
                  <p className="text-xs text-muted-foreground mt-1">Hb &gt; threshold</p>
                </div>
                <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/20 p-4 text-center">
                  <p className="text-xl font-black text-yellow-500">Mild</p>
                  <p className="text-sm font-medium text-yellow-600">ANEMIA SUSPECTED</p>
                  <p className="text-xs text-muted-foreground mt-1">Hb ≥ mild threshold</p>
                </div>
                <div className="rounded-2xl bg-orange-500/10 border border-orange-500/20 p-4 text-center">
                  <p className="text-xl font-black text-orange-500">Moderate</p>
                  <p className="text-sm font-medium text-orange-600">ANEMIA POSITIVE</p>
                  <p className="text-xs text-muted-foreground mt-1">Hb ≥ moderate</p>
                </div>
                <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-center">
                  <p className="text-xl font-black text-red-500">Severe</p>
                  <p className="text-sm font-medium text-red-600">ANEMIA POSITIVE</p>
                  <p className="text-xs text-muted-foreground mt-1">Hb &lt; moderate</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Types of Anemia */}
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Microscope className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Types of Anemia</h2>
              <p className="text-sm text-muted-foreground">Each type has distinct causes and treatments</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {anemiaTypes.map(({ icon: Icon, title, desc, accentColor, badge }) => (
              <div
                key={title}
                className="group relative overflow-hidden rounded-[2.5rem] glass-panel flex flex-col p-6 cursor-pointer border-primary/10 shadow-lg hover:border-primary/30 transition-colors"
                style={{ borderTop: `3px solid ${accentColor}` }}
              >
                <div className="absolute -top-20 -right-20 w-[200px] h-[200px] rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: `${accentColor}30` }} />
                <div className="relative z-10 space-y-4">
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
              </div>
            ))}
          </div>
        </motion.div>

        {/* WHO Statistics */}
        <motion.div
          variants={itemVariants}
          className="group relative overflow-hidden rounded-[2.5rem] glass-panel flex flex-col p-8 md:p-12 cursor-pointer border-blue-500/20 shadow-[0_20px_60px_-15px_rgba(37,99,235,0.1)]"
          style={{ borderLeft: '4px solid #3b82f6' }}
        >
          <div className="absolute -top-40 -right-40 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-blue-500/20 rounded-full blur-[100px] md:blur-[200px] group-hover:bg-blue-500/30 transition-colors mix-blend-screen" />
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

        {/* References */}
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <BookOpen className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">References & Sources</h2>
              <p className="text-sm text-muted-foreground">Evidence-based information from leading health organizations</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-5">
            {/* WHO Reference */}
            <div className="group relative overflow-hidden rounded-[2.5rem] glass-panel flex flex-col p-6 md:p-7 cursor-pointer border-emerald-500/20 shadow-[0_20px_60px_-15px_rgba(16,185,129,0.1)]">
              <div className="absolute -top-20 -right-20 w-[200px] h-[200px] bg-emerald-500/20 rounded-full blur-[60px] mix-blend-screen" />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <Globe className="h-8 w-8 text-emerald-500" />
                  <div>
                    <h3 className="font-bold">World Health Organization</h3>
                    <p className="text-xs text-muted-foreground">WHO Nutrition Landscape Information System</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Definition: Anaemia is defined as a haemoglobin concentration below a specified cut-off point. WHO defines anaemia in non-pregnant women as Hb &lt; 120 g/L (&lt; 12.0 g/dL) and in men as Hb &lt; 130 g/L (&lt; 13.0 g/dL).
                </p>
                <a 
                  href="https://www.who.int/data/nutrition/nlis/info/anaemia" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-emerald-500 hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  View WHO Source
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Red Cross Reference */}
            <div className="group relative overflow-hidden rounded-[2.5rem] glass-panel flex flex-col p-6 md:p-7 cursor-pointer border-red-500/20 shadow-[0_20px_60px_-15px_rgba(239,68,68,0.1)]">
              <div className="absolute -bottom-20 -left-20 w-[200px] h-[200px] bg-red-500/20 rounded-full blur-[60px] mix-blend-screen" />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <Droplet className="h-8 w-8 text-red-500" />
                  <div>
                    <h3 className="font-bold">American Red Cross</h3>
                    <p className="text-xs text-muted-foreground">Blood Services - Hematocrit Guide</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Normal hemoglobin ranges: Men 13.5-17.5 g/dL, Women 12.0-15.5 g/dL. Hematocrit: Men 41%-50%, Women 36%-44%. All measurements use g/dL unit.
                </p>
                <a 
                  href="https://www.redcrossblood.org/donate-blood/dlp/hematocrit.html" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-red-500 hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  View Red Cross Source
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Unit Note */}
          <div className="rounded-2xl bg-background/60 border border-primary/10 p-5">
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium">Unit of Measurement</p>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              All hemoglobin values on this page and in Anemo AI are expressed in <span className="font-bold text-foreground">g/dL (grams per deciliter)</span>. This is the standard unit used by WHO and most laboratories worldwide.
            </p>
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div variants={itemVariants} className="text-center py-8 space-y-6">
          <p className="text-2xl font-light text-muted-foreground">
            Ready to take control of your health?
          </p>
          <Button size="lg" className="rounded-full text-lg px-10" asChild>
            <Link href="/dashboard/analysis">
              Start Analysis Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}