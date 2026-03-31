'use client';
import { LoginForm } from '@/components/auth/LoginForm';
import dynamic from 'next/dynamic';
import { HeartPulse } from 'lucide-react';
const ClinicBackground = dynamic(() => import('@/components/ui/ClinicBackground').then(m => m.ClinicBackground), { ssr: false });

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden p-4">
      <ClinicBackground />
      <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay z-[2]" />
      <div className="relative z-10 w-full max-w-md">
        {/* Logo mark */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <HeartPulse className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Anemo</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">AI Health System</p>
          </div>
        </div>
        {/* Card */}
        <div className="glass-panel rounded-[2.5rem] p-8 md:p-10 border-primary/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)]">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
