'use client';

import dynamic from 'next/dynamic';
import HeartLoader from '@/components/ui/HeartLoader';

// Dynamically import so TF.js and the worker are never bundled into the
// initial page payload — they are loaded only when the user navigates here.
const CameraAnalysis = dynamic(
  () =>
    import('@/components/anemo/CameraAnalysis').then(
      (m) => m.CameraAnalysis,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <HeartLoader size={40} strokeWidth={3} />
        <p className="text-sm text-muted-foreground">Loading analysis engine…</p>
      </div>
    ),
  },
);

import { GlassSurface } from '@/components/ui/glass-surface';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function LiveAnalysisPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background/80">
      <GlassSurface intensity="high" className="w-full max-w-3xl mx-auto my-8 rounded-3xl shadow-2xl p-0 md:p-8 flex flex-col gap-0 md:gap-8">
        <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-4 md:gap-8 px-6 pt-8 pb-4 md:pb-0">
          <div className="flex items-center gap-3 w-full">
            <Link href="/dashboard" className="flex items-center gap-2 text-primary hover:underline font-bold text-sm">
              <ChevronLeft className="w-5 h-5" />
              Back to Dashboard
            </Link>
            <Badge variant="outline" className="ml-4 px-3 py-1 text-xs font-semibold tracking-widest bg-primary/10 text-primary border-primary/20 rounded-full">LIVE ANALYSIS</Badge>
          </div>
          <div className="text-right w-full md:w-auto">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mb-1">Real-Time Anemia Scan</h1>
            <p className="text-sm text-muted-foreground max-w-md">Scan your skin, nails, or under-eye in real time. All analysis is performed securely on your device using our AI ensemble.</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center w-full px-2 md:px-8 pb-8">
          <CameraAnalysis />
        </div>
      </GlassSurface>
    </div>
  );
}
