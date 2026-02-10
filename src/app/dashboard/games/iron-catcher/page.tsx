'use client';

import React from 'react';
import { IronCatcherGame } from '@/components/anemo/IronCatcherGame';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Gamepad2 } from 'lucide-react';

export default function IronCatcherPage() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-12 space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-4">
            <Button variant="ghost" asChild className="rounded-full">
                <Link href="/dashboard">
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Back to Dashboard
                </Link>
            </Button>
         </div>
         <div className="flex items-center gap-2 text-muted-foreground">
             <Gamepad2 className="h-5 w-5" />
             <span className="text-sm font-bold uppercase tracking-widest">Anemo Arcade</span>
         </div>
      </div>

      <div className="space-y-4">
         <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground">
            Iron Catcher
         </h1>
         <p className="text-lg text-muted-foreground max-w-2xl">
            Test your reflexes and nutrition knowledge! Help the red blood cell absorb iron-rich foods while avoiding absorption blockers like coffee and tea.
         </p>
      </div>

      <div className="w-full flex justify-center py-8">
          <div className="w-full max-w-4xl transform hover:scale-[1.01] transition-transform duration-500">
             <IronCatcherGame />
          </div>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6 text-center text-sm text-muted-foreground opacity-70">
          <div className="p-4 bg-secondary/30 rounded-xl">
              <p className="font-bold mb-1">Controls</p>
              Mouse Hover / Touch Drag
          </div>
          <div className="p-4 bg-secondary/30 rounded-xl">
              <p className="font-bold mb-1">Goal</p>
              Catch Iron (🥩🥬)
          </div>
          <div className="p-4 bg-secondary/30 rounded-xl">
              <p className="font-bold mb-1">Avoid</p>
              Blockers (☕🍵)
          </div>
      </div>
    </div>
  );
}
