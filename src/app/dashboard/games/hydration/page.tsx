'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  CheckCircle,
  GlassWater,
  Coffee
} from 'lucide-react';
import { cn } from '@/lib/utils';

type HydrationGoal = {
  daily: number; // ml
  current: number; // ml
  lastDrink: Date | null;
  streak: number;
  history: { date: string; achieved: boolean }[];
};

const DEFAULT_GOAL = 2000; // 2 liters daily

export default function HydrationGame() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [goal, setGoal] = useState<number>(DEFAULT_GOAL);
  const [current, setCurrent] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [selectedCup, setSelectedCup] = useState<number>(250);
  
  // Cup sizes in ml
  const cupSizes = [100, 150, 200, 250, 300, 500];
  
  const today = new Date().toDateString();
  
  // Load hydration data
  useEffect(() => {
    if (!user?.uid || !firestore) return;
    
    const loadData = async () => {
      const docRef = doc(firestore, `users/${user.uid}`, 'hydration');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as HydrationGoal;
        const lastDate = data.history?.[data.history.length - 1]?.date;
        
        // Reset if new day
        if (lastDate !== today) {
          // Check streak
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
    };
    
    loadData();
  }, [user?.uid, firestore]);
  
  // Save hydration data
  const saveData = useCallback(async (newCurrent: number, newStreak: number) => {
    if (!user?.uid || !firestore) return;
    
    const achievedToday = newCurrent >= goal;
    const historyEntry = { date: today, achieved: achievedToday };
    
    await setDoc(doc(firestore, `users/${user.uid}`, 'hydration'), {
      daily: goal,
      current: newCurrent,
      streak: newStreak,
      lastDrink: serverTimestamp(),
      history: [historyEntry],
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }, [user?.uid, firestore, goal, today]);
  
  // Add water
  const addWater = (amount: number) => {
    const newCurrent = current + amount;
    setCurrent(newCurrent);
    
    // Check if goal achieved
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
  
  // Remove water (undo)
  const removeWater = (amount: number) => {
    const newCurrent = Math.max(0, current - amount);
    setCurrent(newCurrent);
    saveData(newCurrent, streak);
  };
  
  // Quick add buttons
  const quickAdd = (amount: number) => {
    addWater(amount);
  };
  
  // Progress percentage
  const progress = Math.min(100, (current / goal) * 100);
  
  // Reset daily
  const resetDaily = () => {
    setCurrent(0);
    saveData(0, streak);
    toast({ title: 'Reset', description: 'Daily progress has been reset.' });
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-blue-900 to-blue-950 p-4 md:p-8">
      <div className="max-w-lg mx-auto space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/20 border-2 border-blue-400/30">
            <Droplets className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Hydration</h1>
          <p className="text-blue-300/70">Track your daily water intake</p>
        </motion.div>
        
        {/* Main Display */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative p-8 rounded-[3rem] bg-blue-500/10 border border-blue-500/20 backdrop-blur-xl"
        >
          {/* Celebration */}
          <AnimatePresence>
            {showCelebration && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-blue-500/90 rounded-[3rem] z-10"
              >
                <div className="text-center">
                  <Award className="w-24 h-24 text-yellow-400 mx-auto mb-4" />
                  <p className="text-3xl font-black text-white">Goal Achieved!</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Progress Circle */}
          <div className="relative w-48 h-48 mx-auto mb-6">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-blue-900/50"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={553}
                strokeDashoffset={553 - (553 * progress / 100)}
                className="text-blue-400 transition-all duration-1000"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-white">{current}</span>
              <span className="text-blue-300/70 text-sm">/ {goal} ml</span>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex justify-center gap-6 mb-6">
            <div className="text-center">
              <TrendingUp className="w-5 h-5 text-blue-400 mx-auto mb-1" />
              <span className="text-xl font-bold text-white">{progress.toFixed(0)}%</span>
            </div>
            <div className="text-center">
              <Award className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <span className="text-xl font-bold text-white">{streak} day streak</span>
            </div>
          </div>
          
          {/* Quick Add Buttons */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {cupSizes.slice(0, 3).map((size) => (
              <button
                key={size}
                onClick={() => quickAdd(size)}
                className="p-4 rounded-2xl bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 transition-all"
              >
                <Plus className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <span className="text-sm font-bold text-white">{size}ml</span>
              </button>
            ))}
          </div>
          
          <div className="grid grid-cols-3 gap-3 mb-6">
            {cupSizes.slice(3, 6).map((size) => (
              <button
                key={size}
                onClick={() => quickAdd(size)}
                className="p-4 rounded-2xl bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 transition-all"
              >
                <Plus className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <span className="text-sm font-bold text-white">{size}ml</span>
              </button>
            ))}
          </div>
          
          {/* Controls */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => removeWater(selectedCup)}
              disabled={current === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 disabled:opacity-50"
            >
              <Minus className="w-5 h-5" />
              <span className="font-bold">Undo</span>
            </button>
            
            <button
              onClick={resetDaily}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-muted/20 border border-muted/30 text-muted-foreground hover:bg-muted/30"
            >
              <RotateCcw className="w-5 h-5" />
              <span className="font-bold">Reset</span>
            </button>
          </div>
          
          {/* Streak Info */}
          <div className="mt-6 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
            <div className="text-center text-blue-300/70 text-sm">
              <Award className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
              <p>Complete your daily goal to maintain your streak!</p>
            </div>
          </div>
        </motion.div>
        
        {/* Tips */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="p-6 rounded-[2rem] bg-blue-500/5 border border-blue-500/10"
        >
          <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
            <Coffee className="w-5 h-5 text-blue-400" />
            Hydration Tips
          </h3>
          <ul className="space-y-2 text-blue-300/70 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-400 mt-1 shrink-0" />
              <span>Drink water first thing in the morning</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-400 mt-1 shrink-0" />
              <span>Keep a water bottle at your desk</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-400 mt-1 shrink-0" />
              <span>Drink before, during, and after exercise</span>
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}