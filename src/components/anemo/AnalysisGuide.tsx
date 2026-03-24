'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Hand, Info, CheckCircle2, Sparkles, AlertCircle, ShieldCheck, Zap, Crosshair, Search, Dna, Cpu, Scan, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type BodyPart = 'skin' | 'under-eye' | 'fingernails';

interface AnalysisGuideProps {
  bodyPart: BodyPart;
  onComplete: () => void;
}

export function AnalysisGuide({ bodyPart, onComplete }: AnalysisGuideProps) {
  const getGuideContent = () => {
    switch (bodyPart) {
      case 'under-eye':
        return {
          title: 'Ocular Bed Scan',
          subtitle: 'Spectral analysis of the palpebral vascular bed distribution.',
          code: 'PX-02',
          steps: [
            'Gently expose the lower eyelid (inner tissue).',
            'Ensure zero eyeliner or mascara interference.',
            'Maintain steady focus in indirect daylight.',
            'Keep iris positioned slightly upward.'
          ],
          color: 'from-red-600/30 to-rose-600/30',
          accent: 'text-red-500',
          glow: 'bg-red-500/20',
          animation: (
            <div className="relative w-full aspect-square max-w-[400px] glass-panel bg-background/60 rounded-[3rem] md:rounded-[4rem] flex items-center justify-center overflow-hidden border border-white/10 shadow-2xl group isolate">
              <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:30px_30px] z-0" />
              <div className="absolute inset-x-[-100px] blur-[100px] bg-red-500/10 rounded-full opacity-40 animate-pulse" />
              
              {/* Eye Base */}
              <motion.div 
                className="w-48 h-24 bg-background rounded-[100%] border-2 border-primary/20 relative overflow-hidden shadow-2xl isolate"
                initial={{ scaleY: 1 }}
              >
                 <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-20" />
                 
                 {/* Pupil */}
                 <motion.div 
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-foreground rounded-full border-4 border-primary/20"
                    animate={{ 
                        y: [-15, -20, -15],
                        x: [-4, 4, -4]
                    }}
                    transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                 >
                    <div className="absolute top-2 left-3 w-4 h-4 bg-white/30 rounded-full" />
                 </motion.div>
                 
                 {/* Lower Conjunctiva Area (Target) */}
                 <motion.div 
                    className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-red-500/60 to-red-400/20 border-t border-red-600/50"
                    animate={{ height: [0, 30, 30, 0] }}
                    transition={{ repeat: Infinity, duration: 4, times: [0, 0.3, 0.7, 1] }}
                 />
              </motion.div>
              
              {/* Eyelids Mask (Top) */}
              <div className="absolute w-48 h-24 top-[10rem] bg-background/95 rounded-b-[100%] border-t border-white/10 shadow-inner z-10" />

              {/* Hand/Finger Trigger */}
              <motion.div
                className="absolute text-red-500 z-30"
                animate={{ 
                    y: [140, 110, 110, 140],
                    opacity: [0, 1, 1, 0]
                }}
                transition={{ repeat: Infinity, duration: 4, times: [0, 0.2, 0.8, 1] }}
              >
                <div className="p-5 bg-red-600/10 rounded-full border border-red-500/30 backdrop-blur-3xl shadow-xl">
                    <Hand className="h-12 w-12 fill-red-500/10" />
                </div>
              </motion.div>

              {/* Advanced Scanning Reticle */}
              <motion.div 
                className="absolute inset-[60px] border border-red-500/20 rounded-[2.5rem] z-40 pointer-events-none"
                animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.8, 0.3] }}
                transition={{ repeat: Infinity, duration: 4 }}
              >
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]" />
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]" />
              </motion.div>

              <div className="absolute top-10 right-10 flex items-center gap-3">
                 <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                 <span className="text-[10px] font-black text-white/50 tracking-[0.4em] uppercase">LOCK_PX02</span>
              </div>
            </div>
          )
        };
      case 'skin':
        return {
          title: 'Dermal Scan',
          subtitle: 'Deep-field analysis of palmar creases and subcutaneous hue distribution.',
          code: 'PX-01',
          steps: [
            'Fully extend palm and flatten surface.',
            'Avoid direct sunlight (glare-free indirect light).',
            'Ensure skin is clean and lotion-free.',
            'Keep hand parallel to the lens plane.'
          ],
          color: 'from-amber-600/30 to-orange-600/30',
          accent: 'text-amber-500',
          glow: 'bg-amber-500/20',
          animation: (
            <div className="relative w-full aspect-square max-w-[400px] glass-panel bg-background/60 rounded-[3rem] md:rounded-[4rem] flex items-center justify-center overflow-hidden border border-white/10 shadow-2xl group isolate">
              <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:30px_30px] z-0" />
              <div className="absolute inset-x-[-100px] blur-[100px] bg-amber-500/10 rounded-full opacity-40 animate-pulse" />
              
              <motion.div
                animate={{ 
                    rotateY: [0, 15, -15, 0],
                    scale: [0.95, 1.1, 1.1, 0.95],
                    filter: ['grayscale(100%)', 'grayscale(0%)', 'grayscale(0%)', 'grayscale(100%)']
                }}
                transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
              >
                <Hand className="h-56 w-56 text-amber-500 opacity-20" strokeWidth={0.5} />
              </motion.div>
              
              {/* Specialized Scanning Box */}
              <motion.div 
                className="absolute inset-[80px] border-2 border-amber-500/30 rounded-[3.5rem] flex items-center justify-center isolate overflow-hidden shadow-2xl"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 4 }}
              >
                  <motion.div 
                    className="absolute inset-x-0 h-px bg-amber-500 shadow-[0_0_40px_rgba(245,158,11,1)] z-10"
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  />
                  <div className="absolute inset-0 bg-amber-500/5 transition-all duration-1000" />
              </motion.div>
              
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[11px] font-black text-amber-500 uppercase tracking-[0.5em] opacity-50 italic">
                  SYNAPSE_LOCK_01
              </div>
            </div>
          )
        };
      case 'fingernails':
        return {
          title: 'Ungual Matrix Scan',
          subtitle: 'Ultra-point detection of capillary distribution in nail beds matrix.',
          code: 'PX-03',
          steps: [
            'Bare nails only (strictly zero polish/gel).',
            'Position fingertips towards the scanner lens.',
            'Light pressure only—do not blanch the skin.',
            'Ensure even, shadowless illumination.'
          ],
          color: 'from-blue-600/30 to-cyan-600/30',
          accent: 'text-blue-500',
          glow: 'bg-blue-500/20',
          animation: (
            <div className="relative w-full aspect-square max-w-[400px] glass-panel bg-background/60 rounded-[3rem] md:rounded-[4rem] flex items-center justify-center overflow-hidden border border-white/10 shadow-2xl group isolate">
              <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:30px_30px] z-0" />
              <div className="absolute inset-x-[-100px] blur-[100px] bg-blue-500/10 rounded-full opacity-40 animate-pulse" />
              
              <div className="flex gap-6 sm:gap-8 items-end h-[200px] relative">
                {[1, 2, 3, 4].map((i) => (
                    <motion.div 
                        key={i}
                        className="w-12 sm:w-16 bg-blue-500/20 border border-blue-500/20 rounded-t-[2rem] md:rounded-t-[2.5rem] relative shadow-2xl"
                        style={{ height: `${60 + i*10}%` }}
                        animate={{ y: [0, -12, 0] }}
                        transition={{ repeat: Infinity, duration: 4, delay: i * 0.25, ease: "easeInOut" }}
                    >
                        <div className="absolute top-4 left-3 right-3 h-12 bg-white/10 rounded-t-2xl border border-white/10 isolate shadow-xl backdrop-blur-3xl">
                            <motion.div 
                                className="absolute bottom-0 inset-x-0 h-4 bg-cyan-400/50 blur-md"
                                animate={{ opacity: [0.3, 0.9, 0.3] }}
                                transition={{ repeat: Infinity, duration: 2.5 }}
                            />
                        </div>
                    </motion.div>
                ))}
              </div>
              
              <div className="absolute top-10 left-10 p-8 border-l-2 border-t-2 border-blue-500/40 rounded-tl-[3.5rem]">
                  <div className="w-3.5 h-3.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_20px_rgba(59,130,246,1)]" />
              </div>
              <div className="absolute bottom-10 right-10 flex flex-col items-end gap-3 opacity-60">
                  <span className="text-[11px] font-mono text-blue-400 tracking-[0.4em] leading-none uppercase italic">SYNC_NODE_C9</span>
                  <div className="h-2 w-20 bg-blue-500/30 rounded-full overflow-hidden" />
              </div>
            </div>
          )
        };
    }
  };

  const content = getGuideContent();

  return (
    <div className="flex flex-col items-center p-8 sm:p-16 lg:p-24 space-y-24 md:space-y-32 animate-in fade-in zoom-in duration-1000 w-full relative isolate overflow-hidden">
      
      <div className="text-center space-y-8 md:space-y-12 relative z-10 w-full">
        <motion.div 
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full flex justify-center"
        >
            <div className={cn("inline-flex items-center gap-4 px-6 py-2 rounded-full bg-white/5 border backdrop-blur-3xl shadow-xl transition-all", content.accent.replace('text-', 'border-').replace('500', '500/35'))}>
                <Cpu className={cn("w-4 h-4 animate-pulse", content.accent)} />
                <span className={cn("text-[11px] font-bold uppercase tracking-widest leading-none", content.accent)}>Neural Protocol {content.code}</span>
            </div>
        </motion.div>
        
        <h3 className="text-[clamp(3.5rem,10vw,6.5rem)] font-black tracking-tighter text-foreground leading-[0.9] drop-shadow-xl">
            {content.title.split(' ')[0]} <span className={cn("text-primary italic-font", content.accent)}>{content.title.split(' ').slice(1).join(' ')}</span>
        </h3>
        
        <div className="flex items-center justify-center gap-8">
            <div className="h-px w-12 bg-white/10" />
            <p className="text-muted-foreground text-base md:text-xl font-medium tracking-wide max-w-2xl mx-auto leading-relaxed opacity-90">{content.subtitle}</p>
            <div className="h-px w-12 bg-white/10" />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-center gap-16 md:gap-24 w-full max-w-[1500px] relative z-10">
        <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative group transition-all duration-1000 w-full max-w-[480px] aspect-square lg:max-w-none lg:flex-1 flex items-center justify-center"
        >
            <div className={cn("absolute inset-[-80px] blur-[160px] opacity-20 transition-all duration-1000", content.glow)} />
            {content.animation}
            
            <div className={cn("absolute -top-12 -left-12 opacity-30 shadow-2xl", content.accent)}>
                <Crosshair className="w-20 h-20" />
            </div>
            <div className={cn("absolute -bottom-12 -right-12 scale-x-[-1] scale-y-[-1] opacity-30 shadow-2xl", content.accent)}>
                <Crosshair className="w-20 h-20" />
            </div>
        </motion.div>
        
        <div className="flex-1 space-y-12 w-full max-w-2xl text-left">
            <div className="grid grid-cols-1 gap-8 md:gap-10">
                {content.steps.map((step, idx) => (
                    <motion.div 
                        key={idx} 
                        className="flex items-center gap-8 md:gap-10 p-6 md:p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-all duration-500 group/item shadow-xl relative isolate overflow-hidden"
                        initial={{ opacity: 0, x: 40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.15, duration: 1 }}
                    >
                        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] z-0" />
                        <div className={cn("w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-[1.8rem] md:rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center group-hover/item:scale-110 transition-transform shadow-lg relative z-10")}>
                            <span className={cn("font-black text-xl md:text-2xl drop-shadow-md leading-none italic", content.accent)}>0{idx + 1}</span>
                        </div>
                        <p className="text-base md:text-lg font-medium text-foreground/90 leading-relaxed group-hover/item:text-foreground transition-colors relative z-10">{step}</p>
                    </motion.div>
                ))}
            </div>
            
            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="p-8 md:p-10 rounded-[3rem] bg-red-950/20 border border-red-900/40 shadow-xl flex items-start gap-8 relative overflow-hidden group/alert"
            >
                <div className="p-4 bg-red-600/10 rounded-2xl border border-red-600/20 shadow-lg"><AlertCircle className="w-6 h-6 text-red-500 shrink-0" /></div>
                <div className="space-y-4">
                    <h5 className="text-[12px] font-bold uppercase tracking-widest text-red-500 drop-shadow-sm">Careful Heuristics</h5>
                    <p className="text-sm md:text-base font-medium text-red-200/80 leading-relaxed text-balance">
                        Parameter precision is vital for extraction. Any optical obstructions or spectral noise will necessitate a system restart.
                    </p>
                </div>
            </motion.div>
        </div>
      </div>

      <div className="w-full max-w-lg pt-8">
          <Button 
            onClick={onComplete} 
            className="w-full rounded-full h-20 md:h-24 text-sm md:text-base font-bold tracking-widest uppercase bg-primary text-white hover:bg-primary/90 hover:scale-[1.03] active:scale-95 transition-all shadow-2xl group border-t border-white/20 relative overflow-hidden"
          >
            <div className="absolute inset-x-0 h-1 bg-white/30 top-0 group-hover:translate-y-24 transition-transform duration-700" />
            <div className="flex items-center justify-center gap-6">
                <Zap className="w-5 h-5 group-hover:fill-white transition-all shadow-md" />
                <span>INJECT PROTOCOL</span>
            </div>
          </Button>
      </div>
    </div>
  );
}

