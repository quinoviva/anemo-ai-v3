'use client';

import Link from 'next/link';
import { HeartPulse, Info, Activity } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border/40 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/30">
      <div className="w-full px-4 md:px-8 py-8 flex flex-col gap-8">
        
        {/* Top: Information Section */}
        <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary">
                    <Activity className="h-5 w-5" />
                    <h4 className="font-bold text-sm tracking-wide uppercase">What is Anemia?</h4>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
                    Anemia is a condition where you lack enough healthy red blood cells to carry adequate oxygen to your body's tissues. 
                    Common signs include fatigue, skin pallor, and weakness. Early detection is key to managing your health.
                </p>
            </div>
            <div className="md:text-right space-y-3">
                 <h4 className="font-bold text-sm tracking-wide uppercase text-foreground">Quick Links</h4>
                 <nav className="flex flex-col md:items-end gap-2 text-sm text-muted-foreground">
                    <Link href="/dashboard/analysis" className="hover:text-primary transition-colors">Start Analysis</Link>
                    <Link href="/dashboard/find-doctor" className="hover:text-primary transition-colors">Find a Doctor</Link>
                    <Link href="/dashboard/chatbot" className="hover:text-primary transition-colors">Ask AI Assistant</Link>
                 </nav>
            </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border/40 w-full" />

        {/* Bottom: Copyright & Legal */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">Anemo Check</span>
                <span className="hidden md:inline text-border">|</span>
                <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
            </div>

            <div className="flex items-center gap-6">
                <nav className="flex gap-4">
                    <Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy</Link>
                    <Link href="/terms-of-service" className="hover:text-primary transition-colors">Terms</Link>
                </nav>

                <TooltipProvider delayDuration={0}>
                    <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-help hover:text-foreground transition-colors bg-secondary/50 px-2 py-1 rounded-full">
                        <Info className="h-3 w-3" />
                        <span className="font-medium">Disclaimer</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="end" className="max-w-sm p-4 text-xs leading-relaxed bg-card/95 backdrop-blur-md border shadow-xl">
                        <p className="font-semibold mb-1 text-foreground">Medical Disclaimer</p>
                        <p>
                        Anemo Check is a health-assistive tool, not a medical diagnostic service. 
                        The results provided are for informational purposes only. 
                        Always consult a qualified healthcare provider for professional diagnosis and treatment.
                        </p>
                    </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>

      </div>
    </footer>
  );
}
