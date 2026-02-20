'use client';

import React, { useState } from 'react';
import { 
  Camera, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  ArrowRight,
  ArrowLeft,
  Activity,
  Layers,
  Cpu,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SequentialImageAnalyzer } from '@/components/anemo/SequentialImageAnalyzer';
import dynamic from 'next/dynamic';

const LocalCbcAnalyzer = dynamic(
  () => import('@/components/anemo/LocalCbcAnalyzer').then(mod => mod.LocalCbcAnalyzer), 
  { ssr: false }
);

// --- Animation Variants (Matching Dashboard) ---
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

export default function AnalysisPage() {
  const [analysisMode, setAnalysisMode] = useState<'select' | 'full' | 'local-cbc'>('select');
  const [isFullAnalyzerOpen, setIsFullAnalyzerOpen] = useState(false);

  const startFullScan = () => {
    setAnalysisMode('full');
    setIsFullAnalyzerOpen(true);
  };

  if (analysisMode === 'local-cbc') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen pb-20"
      >
        <div className="mb-8">
            <Button 
                variant="ghost" 
                onClick={() => setAnalysisMode('select')}
                className="group text-muted-foreground hover:text-foreground transition-colors gap-3 uppercase text-[10px] font-bold tracking-widest"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Return to Intelligence Hub
            </Button>
        </div>
        <LocalCbcAnalyzer />
      </motion.div>
    );
  }

  return (
    <div className="relative w-full min-h-[80vh] flex flex-col items-center justify-start py-6 overflow-hidden">
      
      <AnimatePresence mode="wait">
        {analysisMode === 'select' && (
          <motion.div 
            key="selection"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -20 }}
            className="w-full space-y-16"
          >
            {/* Header Section (Matching Dashboard Hello style) */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
              <motion.div variants={itemVariants} className="space-y-4">
                <h1 className="text-6xl md:text-8xl font-light tracking-tighter text-foreground leading-[0.9] flex flex-wrap items-baseline gap-x-4">
                  <span className="opacity-80">Select</span>
                  <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-rose-400 drop-shadow-sm">
                    Mode
                  </span>
                  <span className="text-primary animate-pulse">.</span>
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground font-light tracking-widest uppercase">
                  DIAGNOSTIC INTELLIGENCE HUB
                </p>
              </motion.div>
              
              <motion.div variants={itemVariants} className="hidden md:block">
                  <div className="text-right">
                      <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Neural Engine</p>
                      <div className="flex items-center justify-end gap-2 mt-2">
                          <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_15px_theme(colors.emerald.500)] animate-pulse" />
                          <span className="text-sm font-medium tracking-tight">V.4 Active</span>
                      </div>
                  </div>
              </motion.div>
            </div>

            {/* Main Selection Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Option 1: Full Assessment (Matching Iron Catcher/Visual Scan style) */}
              <motion.div 
                variants={itemVariants}
                whileTap={{ scale: 0.98 }}
                onClick={startFullScan}
                className="group relative overflow-hidden rounded-[2.5rem] glass-panel glass-panel-hover flex flex-col p-12 cursor-pointer min-h-[500px] justify-between border-primary/20 shadow-[0_20px_60px_-15px_rgba(220,38,38,0.1)]"
              >
                  {/* Radial Blur Glow */}
                  <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[160px] group-hover:bg-primary/30 transition-colors duration-1000 mix-blend-screen" />
                  
                  <div className="relative z-10 space-y-8">
                      <div className="flex justify-between items-start">
                        <div className="p-5 bg-primary/10 rounded-3xl border border-primary/20 shadow-2xl shadow-primary/10 group-hover:scale-110 transition-transform duration-700">
                            <Camera className="h-10 w-10 text-primary" />
                        </div>
                        <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 shadow-lg backdrop-blur-md">
                          <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-primary">High Precision</span>
                          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                          <h2 className="text-5xl md:text-6xl font-light tracking-tighter text-foreground leading-none">
                              Full Multimodal <span className="font-medium text-primary italic">Check</span>
                          </h2>
                          <p className="text-xl text-muted-foreground font-extralight leading-relaxed max-w-md">
                              Our most accurate assessment using your camera to analyze eye, skin, and nails combined with lab data.
                          </p>
                      </div>

                      <div className="space-y-4 pt-4">
                          {[
                              { icon: Activity, label: 'Analyzes conjunctiva, palm, & nails' },
                              { icon: Layers, label: 'Integrates optional lab reports' },
                              { icon: ShieldCheck, label: 'Comprehensive AI Health Report' }
                          ].map((item, i) => (
                              <div key={i} className="flex items-center gap-4 group/item">
                                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover/item:border-primary/40 transition-colors">
                                      <item.icon className="h-4 w-4 text-primary/60 group-hover/item:text-primary transition-colors" />
                                  </div>
                                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover/item:text-foreground transition-colors">{item.label}</span>
                              </div>
                          ))}
                      </div>
                  </div>

                  <Button className="relative z-10 w-full justify-between group/btn bg-primary hover:bg-primary/90 text-white rounded-3xl h-20 transition-all px-10 shadow-2xl shadow-primary/20 overflow-hidden">
                      <span className="text-sm font-black uppercase tracking-[0.3em] relative z-10">Start Full Scan</span>
                      <div className="p-2.5 rounded-full bg-white/20 border border-white/20 group-hover/btn:bg-white group-hover/btn:text-primary transition-all relative z-10">
                        <ChevronRight className="h-5 w-5" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[200%] group-hover/btn:animate-[shimmer_2s_infinite] pointer-events-none" />
                  </Button>
              </motion.div>

              {/* Option 2: Quick CBC Analysis (Matching AI Assistant style) */}
              <motion.div 
                variants={itemVariants}
                whileTap={{ scale: 0.98 }}
                onClick={() => setAnalysisMode('local-cbc')}
                className="group relative overflow-hidden rounded-[2.5rem] glass-panel glass-panel-hover flex flex-col p-12 cursor-pointer min-h-[500px] justify-between border-blue-500/20 shadow-[0_20px_60px_-15px_rgba(37,99,235,0.1)]"
              >
                  {/* Radial Blur Glow */}
                  <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[140px] group-hover:bg-blue-600/30 transition-colors duration-1000 mix-blend-screen" />
                  
                  <div className="relative z-10 space-y-8">
                      <div className="flex justify-between items-start">
                        <div className="p-5 bg-blue-600/10 rounded-3xl border border-blue-500/20 shadow-2xl shadow-blue-500/10 group-hover:scale-110 transition-transform duration-700">
                            <FileText className="h-10 w-10 text-blue-500" />
                        </div>
                        <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-blue-600/10 border border-blue-500/20 shadow-lg backdrop-blur-md animate-pulse">
                          <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-blue-500">New Protocol</span>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                          <h2 className="text-5xl md:text-6xl font-light tracking-tighter text-foreground leading-none">
                              Quick CBC <span className="font-medium text-blue-500 italic">Analysis</span>
                          </h2>
                          <p className="text-xl text-muted-foreground font-extralight leading-relaxed max-w-md">
                              Instant analysis of your CBC lab report using on-device AI for privacy and speed.
                          </p>
                      </div>

                      <div className="space-y-4 pt-4">
                          {[
                              { icon: Cpu, label: '100% Local AI (Privacy Focused)' },
                              { icon: FileText, label: 'Instant PDF Report Generation' },
                              { icon: Zap, label: 'No server upload required' }
                          ].map((item, i) => (
                              <div key={i} className="flex items-center gap-4 group/item">
                                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover/item:border-blue-500/40 transition-colors">
                                      <item.icon className="h-4 w-4 text-blue-400/60 group-hover/item:text-blue-400 transition-colors" />
                                  </div>
                                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover/item:text-foreground transition-colors">{item.label}</span>
                              </div>
                          ))}
                      </div>
                  </div>

                  <Button className="relative z-10 w-full justify-between group/btn bg-blue-600 hover:bg-blue-500 text-white rounded-3xl h-20 transition-all px-10 shadow-2xl shadow-blue-500/20 overflow-hidden">
                      <span className="text-sm font-black uppercase tracking-[0.3em] relative z-10">Upload Report</span>
                      <div className="p-2.5 rounded-full bg-white/20 border border-white/20 group-hover/btn:bg-white group-hover/btn:text-blue-600 transition-all relative z-10">
                        <ChevronRight className="h-5 w-5" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[200%] group-hover/btn:animate-[shimmer_2s_infinite] pointer-events-none" />
                  </Button>
              </motion.div>

            </div>

            {/* Bottom Disclaimer (Matching Dashboard Nutrition Ticker style) */}
            <div className="pt-12 text-center">
               <div className="flex items-center gap-4 mb-8 px-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                  <div className="flex items-center gap-2 text-primary/60">
                     <ShieldCheck className="h-4 w-4" />
                     <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Diagnostic Intelligence Powered by AnemoCloud</span>
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sequential Image Analyzer for 'full' mode */}
      <SequentialImageAnalyzer 
        isOpen={isFullAnalyzerOpen} 
        onClose={() => {
            setIsFullAnalyzerOpen(false);
            setAnalysisMode('select');
        }} 
      />
    </div>
  );
}
