'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Droplets, User, Camera, ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'anemo_onboarding_done';

const steps = [
  {
    icon: <Droplets className="w-14 h-14 text-primary" strokeWidth={1.4} />,
    title: 'Welcome to Anemo',
    description: 'AI-powered anemia screening in seconds',
    cta: null,
  },
  {
    icon: <User className="w-14 h-14 text-primary" strokeWidth={1.4} />,
    title: 'Complete Your Profile',
    description: 'Add your age, sex, and medical info for 35% more accurate results',
    cta: { label: 'Go to Profile', href: '/dashboard/profile' },
  },
  {
    icon: <Camera className="w-14 h-14 text-primary" strokeWidth={1.4} />,
    title: 'Start Your First Scan',
    description: 'Use your camera or upload images of your palm, conjunctiva, and nailbed',
    cta: { label: 'Start Scanning', href: '/dashboard/analysis' },
  },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrev = () => setStep((s) => Math.max(0, s - 1));

  const current = steps[step];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="onboarding-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Background glow blobs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-rose-500/10 blur-3xl" />
            <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full bg-primary/8 blur-3xl" />
          </div>

          <motion.div
            key="onboarding-card"
            className="relative w-full max-w-lg glass-panel rounded-[2.5rem] p-8 md:p-10 flex flex-col items-center text-center shadow-2xl"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
          >
            {/* Dismiss (X) button */}
            <button
              onClick={handleDismiss}
              aria-label="Skip onboarding"
              className="absolute top-5 right-5 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Sparkles badge */}
            <div className="mb-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold uppercase tracking-widest">
              <Sparkles className="w-3 h-3" />
              Getting Started
            </div>

            {/* Step content with animated transitions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                className="flex flex-col items-center"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <div className="mb-6 p-5 rounded-[1.5rem] bg-primary/8 border border-primary/15">
                  {current.icon}
                </div>

                <h2 className="luxury-heading text-2xl md:text-3xl mb-3">
                  {current.title}
                </h2>

                <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-sm">
                  {current.description}
                </p>

                {current.cta && (
                  <Link
                    href={current.cta.href}
                    onClick={handleDismiss}
                    className="mt-5 glass-button inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-primary"
                  >
                    {current.cta.label}
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Step dots */}
            <div className="flex items-center gap-2 mt-8">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  aria-label={`Go to step ${i + 1}`}
                  className={cn(
                    'rounded-full transition-all duration-300',
                    i === step
                      ? 'w-6 h-2 bg-primary'
                      : 'w-2 h-2 bg-primary/25 hover:bg-primary/50'
                  )}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between w-full mt-6 gap-3">
              <button
                onClick={handlePrev}
                disabled={step === 0}
                className={cn(
                  'glass-button inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-opacity',
                  step === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <button
                onClick={handleDismiss}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Skip
              </button>

              <button
                onClick={handleNext}
                className="glass-button inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm text-primary font-medium"
              >
                {step === steps.length - 1 ? 'Done' : 'Next'}
                {step < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
