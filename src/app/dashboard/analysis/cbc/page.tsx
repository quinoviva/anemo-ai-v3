'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const LocalCbcAnalyzer = dynamic(
  () => import('@/components/anemo/LocalCbcAnalyzer').then(mod => mod.LocalCbcAnalyzer),
  { ssr: false }
);

export default function CbcAnalysisPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full min-h-screen pb-20"
    >
      <div className="mb-8">
        <Link
          href="/dashboard/analysis"
          className="inline-flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group text-[10px] font-black tracking-[0.3em] uppercase h-12 rounded-full px-4 hover:bg-muted/30"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Return to Hub
        </Link>
      </div>
      <div className="w-full max-w-full overflow-hidden">
        <LocalCbcAnalyzer onBack={() => { window.history.back(); }} />
      </div>
    </motion.div>
  );
}
