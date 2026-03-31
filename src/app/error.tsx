'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Anemo Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[60vw] h-[40vw] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center space-y-8"
      >
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-[2rem] bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <AlertTriangle className="w-9 h-9 text-destructive" />
        </div>

        {/* Text */}
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">System Error</p>
          <h1 className="text-4xl font-light tracking-tight">Something went wrong.</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            An unexpected error occurred. Your data is safe — you can try again or return to the dashboard.
          </p>
          {error?.digest && (
            <p className="text-[10px] font-mono text-muted-foreground/50">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="h-12 px-8 rounded-2xl gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Button asChild variant="outline" className="h-12 px-8 rounded-2xl glass-button gap-2">
            <Link href="/dashboard">
              <Home className="w-4 h-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
