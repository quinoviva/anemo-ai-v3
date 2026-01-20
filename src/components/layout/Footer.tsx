import Link from 'next/link';
import { HeartPulse } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto glass border-t-0 border-b-0 border-x-0 rounded-none backdrop-blur-2xl">
      <div className="mx-auto max-w-7xl py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                    <HeartPulse className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xl font-bold tracking-tight">Anemo Check</span>
            </div>
            <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
                Empowering you with AI-driven health insights. Early detection, personalized care, and seamless connection to healthcare providers.
            </p>
            </div>
            <div className="md:text-right text-xs text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">Medical Disclaimer</p>
            <p className="max-w-md ml-auto">
                Anemo Check is a health-assistive tool, not a medical diagnostic service. The results provided are for informational purposes only. Always consult a qualified healthcare provider for professional diagnosis and treatment.
            </p>
            </div>
        </div>
        
        <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <p>
                &copy; {new Date().getFullYear()} AnemoCheck. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
                <Link href="/privacy-policy" className="hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms-of-service" className="hover:text-primary transition-colors">
                  Terms of Service
                </Link>
                <Link href="/how-to-use" className="hover:text-primary transition-colors">
                  How to Use
                </Link>
            </div>
        </div>
      </div>
    </footer>
  );
}
