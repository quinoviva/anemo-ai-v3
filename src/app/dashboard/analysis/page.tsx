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
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="min-h-screen pb-20 px-4 md:px-0"
      >
        <div className="mb-8">
            <Button 
                variant="ghost" 
                onClick={() => setAnalysisMode('select')}
                className="group text-muted-foreground hover:text-foreground transition-colors gap-3 uppercase text-[10px] font-black tracking-[0.3em] h-12 rounded-full"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Return to Hub
            </Button>
        </div>
        <div className="w-full max-w-full overflow-hidden">
            <LocalCbcAnalyzer />
        </div>
      </motion.div>
    );
  }

  return (
    <div className="relative w-full min-h-[80vh] flex flex-col items-center justify-start py-6 px-4 md:px-0 overflow-hidden">
      
      <AnimatePresence mode="wait">
        {analysisMode === 'select' && (
          <motion.div 
            key="selection"
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full space-y-12 md:space-y-16"
          >
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
              <motion.div variants={itemVariants} className="space-y-4 w-full md:w-auto">
                <h1 className="text-5xl sm:text-6xl md:text-8xl font-light tracking-tighter text-foreground leading-[0.9] flex flex-wrap items-baseline gap-x-3 md:gap-x-4">
                  <span className="opacity-80">Select</span>
                  <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-rose-400 drop-shadow-sm">
                    Mode
                  </span>
                  <span className="text-primary animate-pulse">.</span>
                </h1>
                <p className="text-sm sm:text-xl md:text-2xl text-muted-foreground font-bold md:font-light tracking-[0.2em] md:tracking-widest uppercase">
                  DIAGNOSTIC INTELLIGENCE HUB
                </p>
              </motion.div>
              
              <motion.div variants={itemVariants} className="hidden md:block">
                  <div className="text-right">
                      <p className="text-[10px] font-black tracking-[0.4em] text-muted-foreground">CONCOLUUTIONAL NEURAL NETWORK ALGORITHM</p>
                      </div>
                  </div>
              </motion.div>
            </div>

            {/* Main Selection Bento Grid - Responsive Stacking */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
              
              {/* Option 1: Full Assessment */}
              <motion.div 
                variants={itemVariants}
                whileTap={{ scale: 0.98 }}
                onClick={startFullScan}
                className="group relative overflow-hidden rounded-[2.5rem] glass-panel glass-panel-hover flex flex-col p-8 md:p-12 cursor-pointer min-h-[450px] md:min-h-[550px] justify-between border-primary/20 shadow-[0_20px_60px_-15px_rgba(220,38,38,0.1)]"
              >
                  {/* Radial Blur Glow */}
                  <div className="absolute -top-40 -right-40 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-primary/20 rounded-full blur-[80px] md:blur-[160px] group-hover:bg-primary/30 transition-colors duration-1000 mix-blend-screen" />
                  
                  <div className="relative z-10 space-y-8 md:space-y-10">
                      <div className="flex justify-between items-start">
                        <div className="p-4 md:p-5 bg-primary/10 rounded-2xl md:rounded-3xl border border-primary/20 shadow-2xl shadow-primary/10 group-hover:scale-110 transition-transform duration-700">
                            <Camera className="h-8 w-8 md:h-10 md:w-10 text-primary" />
                        </div>
                        <div className="flex items-center gap-2 md:gap-3 px-4 md:px-5 py-2 md:py-2.5 rounded-full bg-primary/10 border border-primary/20 shadow-lg backdrop-blur-md">
                          <span className="text-[9px] md:text-[10px] font-black tracking-[0.2em] md:tracking-[0.3em] uppercase text-primary">High Precision</span>
                          <div className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
                        </div>
                      </div>
                      
                      <div className="space-y-4 md:space-y-6">
                          <h2 className="text-4xl md:text-6xl font-light tracking-tighter text-foreground leading-none">
                              Full Multimodal <span className="font-medium text-primary italic">Check</span>
                          </h2>
                          <p className="text-lg md:text-xl text-muted-foreground font-medium md:font-extralight leading-relaxed max-w-md">
                              Our most accurate assessment using your camera to analyze eye, skin, and nails combined with lab data.
                          </p>
                      </div>

                      <div className="space-y-3 md:space-y-4 pt-2">
                          {[
                              { icon: Activity, label: 'Analyzes conjunctiva, palm, & nails' },
                              { icon: Layers, label: 'Integrates optional lab reports' },
                              { icon: ShieldCheck, label: 'Comprehensive AI Health Report' }
                          ].map((item, i) => (
                              <div key={i} className="flex items-center gap-4 group/item">
                                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover/item:border-primary/40 transition-colors shrink-0">
                                      <item.icon className="h-4 w-4 text-primary/60 group-hover/item:text-primary transition-colors" />
                                  </div>
                                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground group-hover/item:text-foreground transition-colors">{item.label}</span>
                              </div>
                          ))}
                      </div>
                  </div>

                  <Button className="relative z-10 w-full justify-between group/btn bg-primary hover:bg-primary/90 text-white rounded-3xl h-16 md:h-20 transition-all px-8 md:px-10 shadow-2xl shadow-primary/20 overflow-hidden mt-8">
                      <span className="text-xs md:text-sm font-black uppercase tracking-[0.3em] relative z-10">Start Full Scan</span>
                      <div className="p-2 md:p-2.5 rounded-full bg-white/20 border border-white/20 group-hover/btn:bg-white group-hover/btn:text-primary transition-all relative z-10">
                        <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[200%] group-hover/btn:animate-[shimmer_2s_infinite] pointer-events-none" />
                  </Button>
              </motion.div>

              {/* Option 2: Quick CBC Analysis */}
              <motion.div 
                variants={itemVariants}
                whileTap={{ scale: 0.98 }}
                onClick={() => setAnalysisMode('local-cbc')}
                className="group relative overflow-hidden rounded-[2.5rem] glass-panel glass-panel-hover flex flex-col p-8 md:p-12 cursor-pointer min-h-[450px] md:min-h-[550px] justify-between border-blue-500/20 shadow-[0_20px_60px_-15px_rgba(37,99,235,0.1)]"
              >
                  {/* Radial Blur Glow */}
                  <div className="absolute -bottom-40 -right-40 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-600/20 rounded-full blur-[80px] md:blur-[140px] group-hover:bg-blue-600/30 transition-colors duration-1000 mix-blend-screen" />
                  
                  <div className="relative z-10 space-y-8 md:space-y-10">
                      <div className="flex justify-between items-start">
                        <div className="p-4 md:p-5 bg-blue-600/10 rounded-2xl md:rounded-3xl border border-blue-500/20 shadow-2xl shadow-blue-500/10 group-hover:scale-110 transition-transform duration-700">
                            <FileText className="h-8 w-8 md:h-10 md:w-10 text-blue-500" />
                        </div>
                        <div className="flex items-center gap-2 md:gap-3 px-4 md:px-5 py-2 md:py-2.5 rounded-full bg-blue-600/10 border border-blue-500/20 shadow-lg backdrop-blur-md animate-pulse">
                          <span className="text-[9px] md:text-[10px] font-black tracking-[0.2em] md:tracking-[0.3em] uppercase text-blue-500">New Protocol</span>
                        </div>
                      </div>
                      
                      <div className="space-y-4 md:space-y-6">
                          <h2 className="text-4xl md:text-6xl font-light tracking-tighter text-foreground leading-none">
                              Quick CBC <span className="font-medium text-blue-500 italic">Analysis</span>
                          </h2>
                          <p className="text-lg md:text-xl text-muted-foreground font-medium md:font-extralight leading-relaxed max-w-md">
                              Instant analysis of your CBC lab report using on-device AI for privacy and speed.
                          </p>
                      </div>

                      <div className="space-y-3 md:space-y-4 pt-2">
                          {[
                              { icon: Cpu, label: '100% Local AI (Privacy Focused)' },
                              { icon: FileText, label: 'Instant PDF Report Generation' },
                              { icon: Zap, label: 'No server upload required' }
                          ].map((item, i) => (
                              <div key={i} className="flex items-center gap-4 group/item">
                                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover/item:border-blue-500/40 transition-colors shrink-0">
                                      <item.icon className="h-4 w-4 text-blue-400/60 group-hover/item:text-blue-400 transition-colors" />
                                  </div>
                                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground group-hover/item:text-foreground transition-colors">{item.label}</span>
                              </div>
                          ))}
                      </div>
                  </div>

                  <Button className="relative z-10 w-full justify-between group/btn bg-blue-600 hover:bg-blue-500 text-white rounded-3xl h-16 md:h-20 transition-all px-8 md:px-10 shadow-2xl shadow-blue-500/20 overflow-hidden mt-8">
                      <span className="text-xs md:text-sm font-black uppercase tracking-[0.3em] relative z-10">Upload Report</span>
                      <div className="p-2 md:p-2.5 rounded-full bg-white/20 border border-white/20 group-hover/btn:bg-white group-hover/btn:text-blue-600 transition-all relative z-10">
                        <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[200%] group-hover/btn:animate-[shimmer_2s_infinite] pointer-events-none" />
                  </Button>
              </motion.div>

            </div>

            {/* Bottom Disclaimer */}
            <div className="pt-8 md:pt-12 text-center">
               <div className="flex items-center gap-4 mb-8 px-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                  <div className="flex items-center gap-2 text-primary/60">
                     <ShieldCheck className="h-4 w-4 shrink-0" />
                     <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em]">Diagnostic Intelligence Powered by AnemoCloud</span>
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
