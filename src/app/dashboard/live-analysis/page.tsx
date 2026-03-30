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

export default function LiveAnalysisPage() {
  return <CameraAnalysis />;
}
