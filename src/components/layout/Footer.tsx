import Link from 'next/link';
import { HeartPulse } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-background">
      <div className="mx-auto max-w-7xl py-12 px-4 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
              <HeartPulse className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">Anemo Check</span>
          </div>
          <p className="text-muted-foreground text-sm max-w-md">
            Helping you stay informed about your health through smart, image-based anemia screening.
          </p>
          <div className="pt-4 text-xs text-muted-foreground">
           <p className="font-semibold">Disclaimer</p>
           <p className="mt-1">
             Anemo Check is a health-assistive tool, not a medical diagnostic service. Always consult a qualified healthcare provider for professional diagnosis and treatment.
          </p>
          </div>
        </div>
        <div className="mt-12 border-t pt-8 text-center text-xs text-muted-foreground">
            <p>
                &copy; {new Date().getFullYear()} AnemoCheck. All rights reserved.
            </p>
            <p className="mt-2">
                <Link href="/privacy-policy" className="text-muted-foreground hover:text-foreground underline underline-offset-4">
                  Privacy Policy
                </Link>
                <span className="mx-2">|</span>
                <Link href="/terms-of-service" className="text-muted-foreground hover:text-foreground underline underline-offset-4">
                  Terms of Service
                </Link>
            </p>
        </div>
      </div>
    </footer>
  );
}
