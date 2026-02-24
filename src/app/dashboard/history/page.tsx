'use client';

import { AnalysisHistory } from "@/components/anemo/AnalysisHistory";
import { motion } from "framer-motion";
import { History, Sparkles, TrendingUp, Activity } from "lucide-react";
import dynamic from 'next/dynamic';

const ColorBends = dynamic(() => import('@/components/ColorBends'), { ssr: false });

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 50, damping: 20 } },
};

export default function HistoryPage() {
  return (
    <div className="relative w-full">
      {/* Background Aesthetic */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full space-y-16"
      >
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <motion.div variants={itemVariants} className="space-y-4">
            <h1 className="text-6xl md:text-8xl font-light tracking-tighter text-foreground leading-[0.9] flex flex-wrap items-baseline gap-x-4">
              <span className="opacity-80">Health</span>
              <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-rose-400 drop-shadow-sm cursor-default relative group">
                Track
                <motion.span 
                  className="absolute -bottom-2 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-rose-400 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)]"
                  layoutId="underline-track"
                />
              </span>
              <span className="text-primary animate-pulse">.</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-light tracking-widest uppercase">
              Diagnostic Timeline & Evolution
            </p>
          </motion.div>
          
          <motion.div variants={itemVariants} className="hidden md:block">
              <div className="text-right">
                  <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Archive Status</p>
                  <div className="flex items-center justify-end gap-2 mt-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_15px_theme(colors.emerald.500)] animate-pulse" />
                      <span className="text-sm font-medium tracking-tight">Sync Active</span>
                  </div>
              </div>
          </motion.div>
        </div>

        {/* Stats / Overview Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div variants={itemVariants} className="p-8 rounded-[2.5rem] glass-panel border-primary/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <Activity className="h-16 w-16 text-primary" />
                </div>
                <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">Diagnostic Volume</p>
                    <h3 className="text-5xl font-light tracking-tighter">History</h3>
                    <p className="text-sm text-muted-foreground mt-2 font-medium">Complete record of your health scans</p>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="p-8 rounded-[2.5rem] glass-panel border-blue-500/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <TrendingUp className="h-16 w-16 text-blue-500" />
                </div>
                <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-4">Correlation Core</p>
                    <h3 className="text-5xl font-light tracking-tighter">Insights</h3>
                    <p className="text-sm text-muted-foreground mt-2 font-medium">Neural cross-reference data</p>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="p-8 rounded-[2.5rem] glass-panel border-amber-500/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <Sparkles className="h-16 w-16 text-amber-500" />
                </div>
                <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 mb-4">Premium Access</p>
                    <h3 className="text-5xl font-light tracking-tighter">Vault</h3>
                    <p className="text-sm text-muted-foreground mt-2 font-medium">Securely encrypted health data</p>
                </div>
            </motion.div>
        </div>

        <motion.div variants={itemVariants} className="w-full">
          <AnalysisHistory />
        </motion.div>
      </motion.div>
    </div>
  );
}
