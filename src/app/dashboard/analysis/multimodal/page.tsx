'use client';

import { SequentialImageAnalyzer } from "@/components/anemo/SequentialImageAnalyzer";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function MultimodalAnalysisPage() {
  const router = useRouter();

  return (
    <div className="relative w-full min-h-screen bg-background overflow-hidden isolate">
      {/* 
          Ultra-Premium Layered Background 
          Ensures 'Perfect Position' for the analyzer container while adding
          high-end depth via gradients and blurring.
      */}
      
      {/* Primary Contrast Layer */}
      <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:60px_60px] z-0" />
      
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 -right-20 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[180px] opacity-30 animate-slow-pulse" />
      <div className="absolute -bottom-40 -left-60 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[200px] opacity-20 animate-float" />
      
      {/* Perfect Position Content Container */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative z-10 w-full"
      >
        <SequentialImageAnalyzer 
            isPage={true}
            onClose={() => router.push('/dashboard/analysis')} 
        />
      </motion.div>

      {/* Edge Vignette for depth */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_0_150px_rgba(0,0,0,0.4)] z-50" />
    </div>
  );
}
