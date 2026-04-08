import { Droplets, Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background overflow-hidden">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-primary/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-lg text-center space-y-10">
        {/* Giant 404 */}
        <div className="relative">
          <p className="text-[clamp(100px,25vw,180px)] font-black leading-none tracking-tighter text-primary/10 select-none">
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Droplets className="w-8 h-8 text-primary" />
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Page Not Found</p>
          <h1 className="text-3xl md:text-4xl font-light tracking-tight">
            This page doesn&apos;t exist.
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
            The page you&apos;re looking for may have moved, been deleted, or never existed.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="h-12 px-8 rounded-2xl gap-2">
            <Link href="/dashboard">
              <Home className="w-4 h-4" />
              Go to Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-12 px-8 rounded-2xl glass-button gap-2">
            <Link href="javascript:history.back()">
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Link>
          </Button>
        </div>

        {/* Brand */}
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/40 font-bold">
          Anemo
        </p>
      </div>
    </div>
  );
}
