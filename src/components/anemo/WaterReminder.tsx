'use client';

import React, { useEffect, useState } from 'react';
import { Droplets, Clock, Plus, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import './WaterWidget.css';

const NOTIFICATION_INTERVAL_MS = 60 * 60 * 1000; // 1 Hour

export const WaterReminder = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [lastDrink, setLastDrink] = useState<number>(Date.now());
  const [timeSince, setTimeSince] = useState<string>('Just now');
  const [isRefilling, setIsRefilling] = useState(false);
  const [level, setLevel] = useState(0); 
  const { toast } = useToast();

  // Load settings on mount
  useEffect(() => {
    const loadedSetting = localStorage.getItem('waterReminderEnabled') === 'true';
    setIsEnabled(loadedSetting);
    
    const savedLastDrink = localStorage.getItem('lastDrinkTime');
    const savedLevel = localStorage.getItem('dailyWaterLevel');
    
    if (savedLastDrink) {
      const lastDate = new Date(parseInt(savedLastDrink));
      const today = new Date();
      
      // Daily Reset Logic: If last drink was before today, reset level
      if (lastDate.toDateString() !== today.toDateString()) {
        setLevel(0);
        localStorage.setItem('dailyWaterLevel', '0');
      } else {
        setLastDrink(parseInt(savedLastDrink));
        if (savedLevel) setLevel(parseInt(savedLevel));
      }
    }
  }, []);

  // Timer for updating "Time Since" display
  useEffect(() => {
    if (!isEnabled) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = now - lastDrink;
      const minutes = Math.floor(diff / 60000);
      
      if (minutes < 1) setTimeSince('Just now');
      else if (minutes < 60) setTimeSince(`${minutes}m ago`);
      else setTimeSince(`${Math.floor(minutes / 60)}h ${minutes % 60}m ago`);

      if (diff > NOTIFICATION_INTERVAL_MS) {
        triggerNotification();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isEnabled, lastDrink]);

  const triggerNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification("Hydration Check 💧", {
        body: "Time for a glass of water!",
        icon: "/favicon.svg",
        tag: 'hydration-reminder'
      });
    } else {
        toast({
            title: "Hydration Check 💧",
            description: "Time for a glass of water!",
        })
    }
  };

  const handleDrink = () => {
    setIsRefilling(true);
    
    setTimeout(() => {
        const now = Date.now();
        const prevLevel = level;
        const newLevel = Math.min(100, level + 20);
        
        setLastDrink(now);
        setLevel(newLevel);
        setTimeSince('Just now');
        
        localStorage.setItem('lastDrinkTime', now.toString());
        localStorage.setItem('dailyWaterLevel', newLevel.toString());
        
        setIsRefilling(false);
        
        if (newLevel === 100 && prevLevel < 100) {
            toast({
              title: "Goal Reached! 🌟",
              description: "You've completed your daily hydration goal. Brilliant work!",
            });
        } else {
            toast({
              title: "Intake Logged!",
              description: `Current Level: ${newLevel}%`,
            });
        }
    }, 1000);
  };

  const handleToggleEnable = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    localStorage.setItem('waterReminderEnabled', newState.toString());
    window.dispatchEvent(new Event('storage'));
    
    if (newState) {
        toast({
            title: "Hydration Tracking Active",
            description: "Stay hydrated! We'll help you track your daily intake.",
        });
    }
  };

  if (!isEnabled) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="water-widget-container relative rounded-[2rem] p-10 flex flex-col items-center justify-center h-full min-h-[300px] text-center space-y-6 border border-blue-500/20 shadow-[0_20px_60px_-15px_rgba(59,130,246,0.2)] overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-blue-900/5 to-transparent backdrop-blur-sm -z-10" />
        
        <div className="relative">
             <div className="absolute inset-0 bg-blue-500 blur-[50px] opacity-40 animate-pulse" />
             <div className="p-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full mb-2 border border-blue-400/30 shadow-lg shadow-blue-500/20 relative z-10 backdrop-blur-md">
                <Droplets className="h-10 w-10 text-cyan-400 animate-bounce drop-shadow-lg" />
            </div>
        </div>
        
        <div className="space-y-2 relative z-10">
            <h3 className="font-light text-2xl tracking-tight text-blue-950 dark:text-white">Hydration Tracker</h3>
            <p className="text-sm text-blue-800/80 dark:text-blue-100/70 max-w-[200px] mx-auto leading-relaxed font-medium">
                Monitor your daily water intake to boost energy levels.
            </p>
        </div>
        <Button 
            onClick={handleToggleEnable}
            className="relative z-10 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-[0_10px_30px_-10px_rgba(6,182,212,0.6)] px-10 py-6 text-xs font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 border border-white/10"
        >
            Enable Tracker
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className={`water-widget-container relative rounded-[2.5rem] p-10 text-blue-950 dark:text-blue-50 flex flex-col justify-between h-full min-h-[360px] shadow-2xl border border-blue-500/20 overflow-hidden ${level === 100 ? 'goal-reached-state' : ''}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-transparent -z-10" />
      <div className="wave-bg opacity-40 mix-blend-overlay" />
      <div className="wave-bg-2 opacity-40 mix-blend-overlay" />

      {/* Celebration Sparkles */}
      {level === 100 && [1,2,3,4,5].map(i => (
        <div 
          key={i} 
          className="sparkle-particle" 
          style={{ 
            top: `${Math.random() * 80 + 10}%`, 
            left: `${Math.random() * 80 + 10}%`,
            animationDelay: `${i * 0.4}s`
          }} 
        />
      ))}

      {/* Header */}
      <div className="relative z-30 flex justify-between items-start">
        <div className="flex items-center gap-5">
            <div className={`p-4 water-widget-glass rounded-2xl animate-pulse-water shadow-lg backdrop-blur-md border ${level === 100 ? 'border-cyan-400/50 bg-cyan-400/20' : 'border-blue-400/30 bg-blue-500/20'}`}>
                <Droplets className={`h-8 w-8 ${level === 100 ? 'text-cyan-200' : 'text-blue-600 dark:text-cyan-400'} drop-shadow-md`} />
            </div>
            <div>
                <h3 className={`font-light text-2xl tracking-tight ${level === 100 ? 'text-cyan-600 dark:text-cyan-300' : 'text-blue-900 dark:text-white'}`}>
                  {level === 100 ? 'Hydration Peak' : 'Hydration'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${level === 100 ? 'bg-cyan-400' : 'bg-blue-500'}`}></span>
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${level === 100 ? 'bg-cyan-500' : 'bg-blue-500'}`}></span>
                    </span>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 text-blue-800 dark:text-blue-200">Live Tracker</p>
                </div>
            </div>
        </div>
        <div className="glass-stat-pill px-5 py-2.5 rounded-full flex items-center gap-2 text-xs font-mono font-medium opacity-100 shadow-lg bg-white/40 dark:bg-black/40 backdrop-blur-md border border-white/20 text-blue-900 dark:text-blue-100">
            <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-400" />
            {timeSince}
        </div>
      </div>

      {/* Visual Component: The Glass & Drinking Person */}
      <div className={`relative z-30 flex justify-center py-4 h-[160px] ${isRefilling ? 'drinking-active' : ''}`}>
          
          <div className="absolute left-1/2 -translate-x-[140%] bottom-0 h-40 w-32 opacity-90">
             <svg viewBox="0 0 100 120" className="w-full h-full overflow-visible drop-shadow-2xl">
                <path d="M20,120 Q20,80 50,80 Q80,80 80,120" fill="currentColor" className="text-blue-900/10 dark:text-blue-100/10" />
                <g className="person-head">
                   <circle cx="50" cy="50" r="22" fill="currentColor" className="text-blue-900/20 dark:text-blue-100/20" />
                   <path d="M72,50 Q75,55 70,65" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-blue-900/30 dark:text-blue-100/30" />
                </g>
                <g className="person-arm">
                   <path d="M70,90 Q90,80 85,55" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" className="text-blue-900/20 dark:text-blue-100/20" />
                   <g transform="translate(80, 35) rotate(-10)">
                      <path d="M0,0 L12,0 L10,18 Q6,20 2,18 Z" fill="rgba(255,255,255,0.6)" stroke="currentColor" strokeWidth="1" className="text-blue-500" />
                      <path d="M12,2 Q20,10 35,40" fill="none" stroke="#06b6d4" strokeWidth="3" className="glass-liquid opacity-0" strokeDasharray="50" strokeDashoffset="0" />
                   </g>
                </g>
             </svg>
          </div>

          <div className="glass-container shadow-[0_20px_50px_-10px_rgba(6,182,212,0.4)] border-white/30 dark:border-white/10">
              <div 
                className="liquid-fill" 
                style={{ 
                    height: `${level}%`, 
                    background: 'linear-gradient(to top, #0ea5e9, #06b6d4)',
                    filter: 'drop-shadow(0 0 15px rgba(6,182,212,0.6))' 
                }}
              />
              {level > 0 && [1, 2, 3].map((b) => (
                  <div 
                    key={b} 
                    className="bubble bg-white/60" 
                    style={{ 
                        left: `${Math.random() * 80 + 10}%`, 
                        bottom: `${Math.random() * (level - 10)}%`,
                        width: `${Math.random() * 6 + 2}px`,
                        height: `${Math.random() * 6 + 2}px`,
                        animationDelay: `${Math.random() * 2}s`
                    }} 
                  />
              ))}
          </div>
      </div>

      {/* Content */}
      <div className="relative z-30 space-y-8">
        <div className="flex items-end justify-between">
            <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 text-blue-800 dark:text-blue-200">Daily Volume</p>
                <div className="flex items-baseline gap-1">
                    <span className={`text-6xl font-light tracking-tighter ${level === 100 ? 'text-cyan-600 dark:text-cyan-300' : 'text-blue-800 dark:text-white'} drop-shadow-md`}>
                        {level}
                    </span>
                    <span className="text-lg font-medium opacity-70 mb-2 text-blue-600 dark:text-blue-300">%</span>
                </div>
            </div>
            <div className="p-3 rounded-full water-widget-glass mb-2 shadow-lg border border-white/20">
                <Timer className="h-6 w-6 opacity-80 text-blue-700 dark:text-blue-200" />
            </div>
        </div>

        <Button 
            onClick={handleDrink}
            disabled={isRefilling}
            className={`w-full h-16 shadow-2xl rounded-full transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] font-black tracking-[0.2em] text-xs uppercase ${level === 100 ? 'bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 shadow-cyan-500/40' : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-500/40'} text-white border-0 ring-1 ring-white/20`}
        >
            <Plus className={`mr-2 h-4 w-4 ${isRefilling ? 'animate-spin' : ''}`} /> 
            {isRefilling ? 'Gulping...' : level === 100 ? 'Stay Saturated' : 'Log Intake'}
        </Button>
      </div>
    </motion.div>
  );
};