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
    <div className="relative w-full min-h-screen overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full"
      >
        <MultimodalUploadAnalyzer onClose={() => router.push('/dashboard/analysis')} />
      </motion.div>
    </div>
  );
}

