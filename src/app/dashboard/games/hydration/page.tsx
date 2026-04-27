'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Droplets, 
  Plus, 
  Minus, 
  RotateCcw, 
  Target, 
  TrendingUp, 
  Award,
  Gamepad2
} from 'lucide-react';

type HydrationGoal = {
  daily: number;
  current: number;
  lastDrink: Date | null;
  streak: number;
  history: { date: string; achieved: boolean }[];
};

const DEFAULT_GOAL = 2000;
const cupSizes = [100, 150, 200, 250, 300, 500];

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

export default function HydrationPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [goal, setGoal] = useState<number>(DEFAULT_GOAL);
  const [current, setCurrent] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [showCelebration, setShowCelebration] = useState(false);
  
  const today = new Date().toDateString();

  useEffect(() => {
    if (!user?.uid || !firestore) return;
    
    const loadData = async () => {
      const docRef = doc(firestore, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const userData = docSnap.data();
        const data = userData?.hydration as HydrationGoal | undefined;
        
        if (data) {
          const lastDate = data.history?.[data.history.length - 1]?.date;
          
          if (lastDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toDateString();
            
            const achievedYesterday = data.history?.[data.history.length - 1]?.date === yesterdayStr && 
              data.history?.[data.history.length - 1]?.achieved;
            
            setStreak(achievedYesterday ? (data.streak || 0) + 1 : 0);
          }
          
          setGoal(data.daily || DEFAULT_GOAL);
          setCurrent(data.current || 0);
          setStreak(data.streak || 0);
        }
      }
    };
    
    loadData();
  }, [user?.uid, firestore, today]);

  const saveData = useCallback(async (newCurrent: number, newStreak: number) => {
    if (!user?.uid || !firestore) return;
    
    const achievedToday = newCurrent >= goal;
    const historyEntry = { date: today, achieved: achievedToday };
    
    await setDoc(doc(firestore, 'users', user.uid), {
      hydration: {
        daily: goal,
        current: newCurrent,
        streak: newStreak,
        lastDrink: serverTimestamp(),
        history: [historyEntry],
        updatedAt: serverTimestamp(),
      }
    }, { merge: true });
  }, [user?.uid, firestore, goal, today]);

  const addWater = (amount: number) => {
    const newCurrent = current + amount;
    setCurrent(newCurrent);
    
    if (current < goal && newCurrent >= goal) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
      toast({
        title: '🎉 Daily Goal Achieved!',
        description: `You drank ${(newCurrent/1000).toFixed(1)}L today!`,
      });
    }
    
    saveData(newCurrent, streak);
  };

  const removeWater = (amount: number) => {
    const newCurrent = Math.max(0, current - amount);
    setCurrent(newCurrent);
    saveData(newCurrent, streak);
  };

  const resetDaily = () => {
    setCurrent(0);
    saveData(0, streak);
    toast({ title: 'Reset', description: 'Daily progress has been reset.' });
  };

  const progress = Math.min(100, (current / goal) * 100);

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
              Tracker
            </span>
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-light tracking-tighter text-foreground leading-[0.9]">
            Hydration{' '}
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-500 to-blue-600">
              Track
            </span>
            <span className="text-primary animate-pulse">.</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-light tracking-widest uppercase">
            Daily Water Intake
          </p>
        </motion.div>

        {/* Game Area */}
        <motion.div
          variants={itemVariants}
          className="rounded-[2.5rem] bg-background/60 backdrop-blur-xl border border-primary/10 shadow-lg p-6 md:p-8 overflow-hidden"
        >
          {/* Progress Circle */}
          <div className="relative w-40 h-40 mx-auto mb-6">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="72"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-primary/20"
              />
              <circle
                cx="80"
                cy="80"
                r="72"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeDasharray={453}
                strokeDashoffset={453 - (453 * progress / 100)}
                className="text-primary transition-all duration-1000"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Droplets className="w-8 h-8 text-primary mb-1" />
              <span className="text-3xl font-black text-foreground">{current}</span>
              <span className="text-primary/70 text-xs">/ {goal} ml</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
              <span className="text-2xl font-bold text-foreground">{progress.toFixed(0)}%</span>
              <p className="text-xs text-muted-foreground">Progress</p>
            </div>
            <div className="text-center">
              <Award className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
              <span className="text-2xl font-bold text-foreground">{streak}</span>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </div>
          </div>

          {/* Quick Add */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {cupSizes.slice(0, 3).map((size) => (
              <button
                key={size}
                onClick={() => addWater(size)}
                className="p-4 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all"
              >
                <Plus className="w-4 h-4 text-primary mx-auto mb-1" />
                <span className="text-sm font-bold text-foreground">{size}ml</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {cupSizes.slice(3, 6).map((size) => (
              <button
                key={size}
                onClick={() => addWater(size)}
                className="p-4 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all"
              >
                <Plus className="w-4 h-4 text-primary mx-auto mb-1" />
                <span className="text-sm font-bold text-foreground">{size}ml</span>
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-3">
            <button
              onClick={() => removeWater(250)}
              disabled={current === 0}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 disabled:opacity-50"
            >
              <Minus className="w-4 h-4" />
              <span className="font-bold text-sm">Undo</span>
            </button>
            
            <button
              onClick={resetDaily}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-muted/20 border border-muted/30 text-muted-foreground hover:bg-muted/30"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="font-bold text-sm">Reset</span>
            </button>
          </div>
        </motion.div>

        {/* Info Pills */}
        <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-5">
          <div className="rounded-[2.5rem] bg-background/60 backdrop-blur-xl border border-primary/10 shadow-lg p-6 space-y-3 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border bg-primary/10 border-primary/20">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <span className="rounded-full text-[10px] font-bold uppercase tracking-widest px-3 py-1 border bg-primary/10 text-primary border-primary/20 inline-block">
              Daily Goal
            </span>
            <p className="text-sm font-medium text-muted-foreground">{goal}ml ({(goal/1000).toFixed(1)}L)</p>
          </div>

          <div className="rounded-[2.5rem] bg-background/60 backdrop-blur-xl border border-primary/10 shadow-lg p-6 space-y-3 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border bg-green-500/10 border-green-500/20">
              <Award className="h-5 w-5 text-green-500" />
            </div>
            <span className="rounded-full text-[10px] font-bold uppercase tracking-widest px-3 py-1 border bg-green-500/10 text-green-500 border-green-500/20 inline-block">
              Streak
            </span>
            <p className="text-sm font-medium text-muted-foreground">{streak} day{streak !== 1 ? 's' : ''}</p>
          </div>

          <div className="rounded-[2.5rem] bg-background/60 backdrop-blur-xl border border-primary/10 shadow-lg p-6 space-y-3 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border bg-cyan-500/10 border-cyan-500/20">
              <Droplets className="h-5 w-5 text-cyan-500" />
            </div>
            <span className="rounded-full text-[10px] font-bold uppercase tracking-widest px-3 py-1 border bg-cyan-500/10 text-cyan-500 border-cyan-500/20 inline-block">
              Remaining
            </span>
            <p className="text-sm font-medium text-muted-foreground">{Math.max(0, goal - current)}ml</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}