'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Hand, Info, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
          title: 'How to capture Under-eye',
          steps: [
            'Gently pull down your lower eyelid using one finger.',
            'Ensure the pink/red area (conjunctiva) is clearly visible.',
            'Keep your eyes looking slightly upward.',
            'Make sure there is no makeup or obstruction.'
          ],
          animation: (
            <div className="relative w-48 h-48 bg-muted rounded-full flex items-center justify-center overflow-hidden border-4 border-primary/20">
              {/* Eye Base */}
              <motion.div 
                className="w-32 h-16 bg-white rounded-[100%] border-2 border-primary/40 relative overflow-hidden"
                initial={{ scaleY: 1 }}
              >
                 {/* Pupil */}
                 <motion.div 
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-zinc-800 rounded-full"
                    animate={{ 
                        y: [-10, -15, -10],
                        x: [-2, 2, -2]
                    }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                 />
                 {/* Lower Conjunctiva (Hidden initially) */}
                 <motion.div 
                    className="absolute bottom-0 left-0 w-full h-0 bg-red-100 border-t border-red-300"
                    animate={{ height: [0, 15, 15, 0] }}
                    transition={{ repeat: Infinity, duration: 4, times: [0, 0.3, 0.7, 1] }}
                 />
              </motion.div>
              
              {/* Eyelids */}
              <motion.div 
                className="absolute w-32 h-8 bg-primary/20 top-[4.5rem] rounded-b-[100%]"
                animate={{ translateY: [0, 15, 15, 0] }}
                transition={{ repeat: Infinity, duration: 4, times: [0, 0.3, 0.7, 1] }}
              />

              {/* Hand/Finger Animation */}
              <motion.div
                className="absolute text-primary"
                animate={{ 
                    y: [100, 75, 75, 100],
                    x: [0, 0, 0, 0],
                    opacity: [0, 1, 1, 0]
                }}
                transition={{ repeat: Infinity, duration: 4, times: [0, 0.2, 0.8, 1] }}
              >
                <Hand className="h-10 w-10 fill-primary/20" />
              </motion.div>
            </div>
          )
        };
      case 'skin':
        return {
          title: 'How to capture Palm',
          steps: [
            'Open your hand and flatten your palm.',
            'Hold your palm steady in front of the camera.',
            'Ensure even lighting across the entire palm.',
            'Remove any jewelry if possible.'
          ],
          animation: (
            <div className="relative w-48 h-48 bg-muted rounded-full flex items-center justify-center overflow-hidden border-4 border-primary/20">
              <motion.div
                animate={{ 
                    rotateY: [0, 180, 180, 0],
                    scale: [0.8, 1, 1, 0.8]
                }}
                transition={{ repeat: Infinity, duration: 4, times: [0, 0.4, 0.6, 1] }}
              >
                <Hand className="h-24 w-24 text-primary" />
              </motion.div>
              <motion.div 
                className="absolute inset-0 border-2 border-dashed border-primary/40 rounded-full m-8"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            </div>
          )
        };
      case 'fingernails':
        return {
          title: 'How to capture Fingernails',
          steps: [
            'Hold your fingers together with nails facing the camera.',
            'Ensure NO nail polish is present.',
            'Position your nails within the guide frame.',
            'Avoid shadows falling on the nail beds.'
          ],
          animation: (
            <div className="relative w-48 h-48 bg-muted rounded-full flex items-center justify-center overflow-hidden border-4 border-primary/20">
              <div className="flex gap-1 items-end h-24">
                {[1, 2, 3, 4].map((i) => (
                    <motion.div 
                        key={i}
                        className="w-6 bg-primary/20 border-2 border-primary/40 rounded-t-lg relative"
                        style={{ height: `${40 + i*10}%` }}
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 2, delay: i * 0.2 }}
                    >
                        <div className="absolute top-1 left-1 right-1 h-4 bg-white/60 rounded-t-sm" />
                    </motion.div>
                ))}
              </div>
              <motion.div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-16 border-2 border-dashed border-primary/60 rounded-lg"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            </div>
          )
        };
    }
  };

  const content = getGuideContent();

  return (
    <div className="flex flex-col items-center p-6 space-y-8 animate-in fade-in zoom-in duration-300">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Info className="h-6 w-6 text-primary" />
            {content.title}
        </h3>
        <p className="text-muted-foreground">Follow these simple steps for a better analysis.</p>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-8 w-full max-w-2xl">
        <div className="flex-1 flex justify-center">
            {content.animation}
        </div>
        
        <div className="flex-1 space-y-4">
            {content.steps.map((step, idx) => (
                <motion.div 
                    key={idx} 
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.15 }}
                >
                    <div className="mt-1 bg-primary/10 p-1 rounded-full">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-sm leading-tight">{step}</p>
                </motion.div>
            ))}
        </div>
      </div>

      <Button onClick={onComplete} size="lg" className="w-full max-w-sm rounded-full h-12 text-lg font-semibold shadow-lg">
        Got it, let's start
      </Button>
    </div>
  );
}
