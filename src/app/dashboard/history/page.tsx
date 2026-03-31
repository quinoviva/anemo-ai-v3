'use client';

import { AnalysisHistory } from "@/components/anemo/AnalysisHistory";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 50, damping: 20 } },
};

export default function HistoryPage() {
  return (
    <div className="relative w-full">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full space-y-10"
      >
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <motion.div variants={itemVariants} className="space-y-4">
            <h1 className="text-6xl md:text-8xl font-light tracking-tighter text-foreground leading-[0.9] flex flex-wrap items-baseline gap-x-4">
              <span className="opacity-80">Health</span>
              <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-rose-400 drop-shadow-sm">
                Track
              </span>
              <span className="text-primary animate-pulse">.</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-light tracking-widest uppercase">
              Diagnostic Timeline and Reports
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="hidden md:block">
            <div className="text-right">
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Database</p>
              <div className="flex items-center justify-end gap-2 mt-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_15px_theme(colors.emerald.500)] animate-pulse" />
                <span className="text-sm font-medium tracking-tight">Active</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Subtle section divider */}
        <motion.div variants={itemVariants} className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/60">
            Scan Records
          </p>
          <div className="h-px flex-1 bg-gradient-to-l from-primary/20 to-transparent" />
        </motion.div>

        <motion.div variants={itemVariants} className="w-full">
          <AnalysisHistory />
        </motion.div>
      </motion.div>
    </div>
  );
}
