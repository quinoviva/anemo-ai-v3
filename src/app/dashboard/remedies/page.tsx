'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Leaf,
  Utensils,
  Zap,
  Coffee,
  Sun,
  Moon,
  Check,
  Info,
  Droplets,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

const foodData = [
  {
    icon: Leaf,
    title: 'Leafy Greens',
    ironContent: 'High Iron',
    tips: 'Spinach, kale, and collard greens. Best eaten cooked for better absorption.',
    accentColor: '#22c55e',
  },
  {
    icon: Utensils,
    title: 'Red Meat & Organ Meats',
    ironContent: 'Heme Iron (Best)',
    tips: 'Beef, liver, and lamb. Heme iron is absorbed 2–3x better than plant iron.',
    accentColor: '#ef4444',
  },
  {
    icon: Coffee,
    title: 'Legumes & Beans',
    ironContent: 'Moderate Iron',
    tips: 'Lentils, chickpeas, and soybeans. Soak them before cooking to reduce phytates.',
    accentColor: '#f59e0b',
  },
  {
    icon: Sun,
    title: 'Vitamin C Boosters',
    ironContent: 'Absorption Helper',
    tips: 'Citrus fruits, bell peppers, strawberries. ALWAYS pair these with iron foods!',
    accentColor: '#f97316',
  },
];

const quickActions = [
  {
    number: '01',
    icon: Moon,
    title: 'Rest Immediately',
    desc: 'Stop strenuous activity. Sit or lie down to reduce oxygen demand on your body.',
  },
  {
    number: '02',
    icon: Droplets,
    title: 'Hydrate',
    desc: 'Drink a glass of water. Dehydration can worsen fatigue and weakness.',
  },
  {
    number: '03',
    icon: Utensils,
    title: 'Iron-Rich Snack',
    desc: 'Eat a handful of nuts, dried fruits, or dark chocolate for a quick energy boost.',
  },
];

export default function RemediesPage() {
  const [activeTab, setActiveTab] = useState('foods');
  const [checklist, setChecklist] = useState<string[]>([]);
  const [todayLog, setTodayLog] = useState<string[]>([]);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`anemo_food_log_${today}`) || '[]');
      setTodayLog(saved);
    } catch {}
  }, [today]);

  const toggleFoodLog = (item: string) => {
    setTodayLog(prev => {
      const next = prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item];
      try { localStorage.setItem(`anemo_food_log_${today}`, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const toggleCheck = (item: string) => {
    setChecklist((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-24 space-y-16">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-16"
      >
        {/* Hero */}
        <motion.div variants={itemVariants} className="space-y-4 pt-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest px-3 py-1.5">
            <Leaf className="h-3 w-3" />
            Natural Healing
          </span>
          <h1 className="text-6xl md:text-8xl font-light tracking-tighter text-foreground leading-[0.9]">
            Combat{' '}
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-rose-400">
              Anemia
            </span>
            <span className="text-primary animate-pulse">.</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-light tracking-widest uppercase">
            Natural Healing Guide
          </p>
        </motion.div>

        {/* Quick-Action Bento Cards */}
        <motion.div variants={itemVariants} className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">First Steps: Feeling Weak?</h2>
              <p className="text-sm text-muted-foreground">Immediate actions to take right now</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {quickActions.map(({ number, icon: Icon, title, desc }) => (
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

        {/* Tab Switcher */}
        <motion.div variants={itemVariants} className="space-y-8">
          <div className="flex justify-center gap-3">
            <Button
              variant={activeTab === 'foods' ? 'default' : 'outline'}
              onClick={() => setActiveTab('foods')}
              className="rounded-full px-8"
            >
              Iron Powerhouses
            </Button>
            <Button
              variant={activeTab === 'habits' ? 'default' : 'outline'}
              onClick={() => setActiveTab('habits')}
              className="rounded-full px-8"
            >
              Lifestyle Habits
            </Button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'foods' && (
              <motion.div
                key="foods"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
              >
                {foodData.map(({ icon: Icon, title, ironContent, tips, accentColor }) => (
                  <div
                    key={title}
                    className="rounded-[2rem] bg-background/60 backdrop-blur-xl border border-primary/10 shadow-lg p-6 relative overflow-hidden group hover:border-primary/30 transition-colors"
                    style={{ borderLeft: `4px solid ${accentColor}` }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-2xl bg-background/50 backdrop-blur-md border border-border/50">
                        <Icon className="h-5 w-5" style={{ color: accentColor }} />
                      </div>
                      <span className="rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                        {ironContent}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold mb-2">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{tips}</p>
                    <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12 pointer-events-none">
                      <Icon className="h-28 w-28" />
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'habits' && (
              <motion.div
                key="habits"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid md:grid-cols-2 gap-6"
              >
                <div className="rounded-[2.5rem] bg-background/60 backdrop-blur-xl border border-primary/10 shadow-lg p-8 space-y-6">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-green-500">
                    <Check className="h-5 w-5" /> Do This
                  </h3>
                  <ul className="space-y-4">
                    {[
                      'Cook with cast-iron cookware',
                      'Combine plant iron with Vitamin C',
                      'Soak beans and grains before cooking',
                      'Take supplements if prescribed',
                    ].map((item, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => toggleCheck(`do-${i}`)}
                      >
                        <div
                          className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                            checklist.includes(`do-${i}`)
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-muted-foreground'
                          }`}
                        >
                          {checklist.includes(`do-${i}`) && <Check className="h-3 w-3" />}
                        </div>
                        <span
                          className={`text-base transition-all ${
                            checklist.includes(`do-${i}`) ? 'line-through text-muted-foreground' : ''
                          }`}
                        >
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[2.5rem] bg-background/60 backdrop-blur-xl border border-primary/10 shadow-lg p-8 space-y-6">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-red-500">
                    <Info className="h-5 w-5" /> Avoid This
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Avoid consuming these WITH iron-rich meals (wait 1–2 hours).
                  </p>
                  <ul className="space-y-4">
                    {[
                      'Coffee and tea (tannins block absorption)',
                      'Milk and dairy (calcium blocks absorption)',
                      'Whole grain cereals (high phytates)',
                      'Antacids / Calcium supplements',
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-muted-foreground">
                        <div className="h-2 w-2 rounded-full bg-red-400 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Iron Pair Pro Tip */}
        <motion.div
          variants={itemVariants}
          className="rounded-[2.5rem] bg-background/60 backdrop-blur-xl border border-amber-500/20 shadow-lg p-8 md:p-12 relative overflow-hidden"
          style={{ borderLeft: '4px solid #f59e0b' }}
        >
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Utensils className="h-64 w-64 rotate-12" />
          </div>
          <div className="relative z-10 space-y-6 max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <Zap className="h-5 w-5 text-amber-500" />
              </div>
              <span className="rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                Pro Tip
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              The "Iron Pair" Rule
            </h2>
            <p className="text-muted-foreground leading-relaxed text-lg">
              Iron absorption is a chemistry game. To win, always pair your Non-Heme iron (plants)
              with Vitamin C. It turns difficult-to-absorb iron into a form your body loves!
            </p>
            <div className="flex flex-col md:flex-row gap-4 items-center rounded-[1.5rem] bg-background/50 backdrop-blur-sm border border-border/50 p-5 w-fit">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">Spinach Salad</span>
                <span className="text-muted-foreground text-sm">(Iron)</span>
              </div>
              <span className="text-2xl font-black text-primary">+</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">Lemon Dressing</span>
                <span className="text-muted-foreground text-sm">(Vit C)</span>
              </div>
              <span className="text-2xl font-black text-green-500">=</span>
              <Badge className="bg-green-500 hover:bg-green-600 text-sm px-4 py-1 rounded-full">
                Super Absorption!
              </Badge>
            </div>
          </div>
        </motion.div>

        {/* Daily Iron Food Log */}
        <motion.div variants={itemVariants} className="rounded-[2.5rem] glass-panel border-primary/10 p-8 md:p-10 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Today's Iron Log</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-thin text-primary">{todayLog.length}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Logged</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Spinach / Kale', emoji: '🥬', type: 'plant' },
              { label: 'Red Meat / Liver', emoji: '🥩', type: 'heme' },
              { label: 'Lentils / Beans', emoji: '🫘', type: 'plant' },
              { label: 'Tofu / Tempeh', emoji: '🍱', type: 'plant' },
              { label: 'Pumpkin Seeds', emoji: '🌱', type: 'plant' },
              { label: 'Fortified Cereal', emoji: '🥣', type: 'fortified' },
              { label: 'Dark Chocolate', emoji: '🍫', type: 'plant' },
              { label: 'Oysters / Shellfish', emoji: '🦪', type: 'heme' },
              { label: 'Vitamin C (Citrus)', emoji: '🍊', type: 'booster' },
              { label: 'Broccoli', emoji: '🥦', type: 'plant' },
            ].map(({ label, emoji, type }) => {
              const checked = todayLog.includes(label);
              const typeColor = type === 'heme' ? 'text-red-400' : type === 'booster' ? 'text-orange-400' : type === 'fortified' ? 'text-blue-400' : 'text-emerald-400';
              return (
                <button
                  key={label}
                  onClick={() => toggleFoodLog(label)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                    checked ? 'bg-primary/10 border-primary/30' : 'glass-button border-white/10 hover:border-primary/20'
                  }`}
                >
                  <span className="text-xl">{emoji}</span>
                  <div className="flex-1">
                    <p className={`text-xs font-bold ${checked ? 'text-primary' : 'text-foreground'}`}>{label}</p>
                    <p className={`text-[9px] font-black uppercase tracking-widest ${typeColor}`}>{type === 'heme' ? 'Heme Iron' : type === 'booster' ? 'Absorption Booster' : type === 'fortified' ? 'Fortified' : 'Plant Iron'}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${checked ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                    {checked && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
          {todayLog.length >= 3 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-xl">🎉</span>
              <p className="text-xs font-bold text-emerald-400">Great job! You've logged {todayLog.length} iron-rich foods today.</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
