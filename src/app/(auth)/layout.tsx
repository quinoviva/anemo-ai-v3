import React from 'react';
import { Logo } from '@/components/layout/Logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Logo />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Anemo Check
            </h1>
            <p className="text-muted-foreground">
              CNN and AI-Powered Anemia Analysis
            </p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
