'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import HeartLoader from '@/components/ui/HeartLoader';
import { motion } from 'framer-motion';

const MultimodalUploadAnalyzer = dynamic(
  () =>
    import('@/components/anemo/MultimodalUploadAnalyzer').then(
      (m) => m.MultimodalUploadAnalyzer,
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

export default function MultimodalAnalysisPage() {
  const router = useRouter();

  return (
    <div className="relative w-full min-h-screen bg-background overflow-hidden isolate">
      {/* Subtle grid texture */}
      <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:60px_60px] z-0 pointer-events-none" />

      {/* Ambient glow orbs */}
      <div className="absolute top-1/4 -right-20 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[160px] opacity-30 animate-slow-pulse pointer-events-none" />
      <div className="absolute -bottom-40 -left-60 w-[700px] h-[700px] bg-blue-500/10 rounded-full blur-[200px] opacity-20 animate-float pointer-events-none" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full"
      >
        <MultimodalUploadAnalyzer onClose={() => router.push('/dashboard/analysis')} />
      </motion.div>

      {/* Edge vignette */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_0_150px_rgba(0,0,0,0.35)] z-50" />
    </div>
  );
}

