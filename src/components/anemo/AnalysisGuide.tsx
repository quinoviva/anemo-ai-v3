'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Hand, Info, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
          title: 'Conjunctiva Scan',
          subtitle: 'Precise analysis of the lower eyelid vascular bed.',
          steps: [
            'Gently pull down your lower eyelid using one finger.',
            'Ensure the inner tissue (conjunctiva) is clearly exposed.',
            'Keep your eyes looking slightly upward to avoid glare.',
            'Maintain steady focus in bright, natural lighting.'
          ],
          color: 'from-blue-500/20 to-indigo-500/20',
          accent: 'text-blue-400',
          animation: (
            <div className="relative w-56 h-56 bg-background/40 rounded-3xl flex items-center justify-center overflow-hidden border border-primary/10 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent" />
              
              {/* Eye Base */}
              <motion.div 
                className="w-40 h-20 bg-background rounded-[100%] border-2 border-muted relative overflow-hidden shadow-inner"
                initial={{ scaleY: 1 }}
              >
                 {/* Pupil */}
                 <motion.div 
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-foreground rounded-full"
                    animate={{ 
                        y: [-12, -18, -12],
                        x: [-3, 3, -3]
                    }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                 >
                    <div className="absolute top-2 left-2 w-3 h-3 bg-background/20 rounded-full" />
                 </motion.div>
                 
                 {/* Lower Conjunctiva */}
                 <motion.div 
                    className="absolute bottom-0 left-0 w-full h-0 bg-gradient-to-t from-red-400/40 to-red-300/20 border-t border-red-500/30"
                    animate={{ height: [0, 20, 20, 0] }}
                    transition={{ repeat: Infinity, duration: 4, times: [0, 0.3, 0.7, 1] }}
                 />
              </motion.div>
              
              {/* Eyelids Mask */}
              <motion.div 
                className="absolute w-40 h-10 bg-background/80 top-[6.2rem] rounded-b-[100%] border-t border-primary/5"
                animate={{ translateY: [0, 20, 20, 0] }}
                transition={{ repeat: Infinity, duration: 4, times: [0, 0.3, 0.7, 1] }}
              />

              {/* Hand/Finger Animation */}
              <motion.div
                className="absolute text-primary z-20"
                animate={{ 
                    y: [120, 90, 90, 120],
                    opacity: [0, 1, 1, 0]
                }}
                transition={{ repeat: Infinity, duration: 4, times: [0, 0.2, 0.8, 1] }}
              >
                <Hand className="h-12 w-12 fill-primary/10 stroke-[1.5]" />
              </motion.div>

              {/* Scanning Line */}
              <motion.div 
                className="absolute left-4 right-4 h-px bg-primary/40 shadow-[0_0_15px_rgba(var(--primary),0.5)] z-30"
                animate={{ top: ['30%', '70%', '30%'] }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
              />
            </div>
          )
        };
      case 'skin':
        return {
          title: 'Skin Pallor Check',
          subtitle: 'Dermal pigmentation analysis of the palmar surface.',
          steps: [
            'Open your hand and fully flatten your palm.',
            'Maintain a steady position within the frame.',
            'Ensure shadows do not obscure the skin surface.',
            'Best results achieved in indirect daylight.'
          ],
          color: 'from-amber-500/20 to-orange-500/20',
          accent: 'text-amber-400',
          animation: (
            <div className="relative w-56 h-56 bg-background/40 rounded-3xl flex items-center justify-center overflow-hidden border border-primary/10 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent" />
              
              <motion.div
                animate={{ 
                    rotateY: [0, 15, -15, 0],
                    scale: [0.9, 1, 1, 0.9]
                }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              >
                <Hand className="h-28 w-28 text-primary opacity-80" strokeWidth={1} />
              </motion.div>
              
              <motion.div 
                className="absolute inset-8 border-2 border-dashed border-primary/20 rounded-2xl"
                animate={{ 
                    scale: [1, 1.05, 1],
                    opacity: [0.2, 0.5, 0.2]
                }}
                transition={{ repeat: Infinity, duration: 3 }}
              />
              
              <div className="absolute top-4 right-4">
                <Sparkles className="w-5 h-5 text-amber-500/40 animate-pulse" />
              </div>
            </div>
          )
        };
      case 'fingernails':
        return {
          title: 'Nail Bed Analysis',
          subtitle: 'Detection of capillary refill and plate pallor.',
          steps: [
            'Align your fingernails within the capture zone.',
            'Ensure nails are completely free of any polish.',
            'Avoid pressing hard on the surface during capture.',
            'Lighting should be bright and uniform.'
          ],
          color: 'from-emerald-500/20 to-teal-500/20',
          accent: 'text-emerald-400',
          animation: (
            <div className="relative w-56 h-56 bg-background/40 rounded-3xl flex items-center justify-center overflow-hidden border border-primary/10 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
              
              <div className="flex gap-2 items-end h-28">
                {[1, 2, 3, 4].map((i) => (
                    <motion.div 
                        key={i}
                        className="w-7 bg-primary/10 border border-primary/20 rounded-t-xl relative"
                        style={{ height: `${50 + i*8}%` }}
                        animate={{ y: [0, -6, 0] }}
                        transition={{ repeat: Infinity, duration: 3, delay: i * 0.2, ease: "easeInOut" }}
                    >
                        <div className="absolute top-1 left-1.5 right-1.5 h-6 bg-foreground/20 rounded-t-md shadow-sm" />
                    </motion.div>
                ))}
              </div>
              
              <motion.div 
                className="absolute w-44 h-20 border border-dashed border-primary/40 rounded-2xl"
                animate={{ 
                    scale: [0.95, 1, 0.95],
                    opacity: [0.4, 0.8, 0.4] 
                }}
                transition={{ repeat: Infinity, duration: 3 }}
              />
            </div>
          )
        };
    }
  };

  const content = getGuideContent();

  return (
    <div className="flex flex-col items-center p-8 space-y-10 animate-in fade-in zoom-in duration-500 w-full">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-2">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Capture Protocol</span>
        </div>
        <h3 className="text-4xl font-black tracking-tighter text-foreground uppercase">
            {content.title}
        </h3>
        <p className="text-muted-foreground text-sm font-medium tracking-tight uppercase">{content.subtitle}</p>
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-12 w-full max-w-4xl">
        <div className="relative group">
            <div className={cn("absolute inset-0 bg-gradient-to-br blur-[80px] opacity-20 transition-all group-hover:opacity-40", content.color)} />
            {content.animation}
        </div>
        
        <div className="flex-1 space-y-6 w-full">
            <div className="grid grid-cols-1 gap-4">
                {content.steps.map((step, idx) => (
                    <motion.div 
                        key={idx} 
                        className="flex items-start gap-4 p-4 rounded-2xl bg-muted/10 border border-primary/5 hover:bg-muted/20 transition-all"
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <div className="mt-0.5 w-6 h-6 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-tight text-foreground/70 leading-relaxed">{step}</p>
                    </motion.div>
                ))}
            </div>
            
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold uppercase tracking-tight text-amber-500/70">
                    Precision matters. Poor quality captures may result in inaccurate diagnostic assessment.
                </p>
            </div>
        </div>
      </div>

      <Button 
        onClick={onComplete} 
        className="w-full max-w-sm rounded-full h-14 text-xs font-black tracking-[0.3em] uppercase bg-primary text-primary-foreground hover:opacity-90 hover:scale-[1.02] transition-all shadow-[0_15px_30px_rgba(var(--primary),0.2)]"
      >
        INITIATE CAPTURE
      </Button>
    </div>
  );
}
