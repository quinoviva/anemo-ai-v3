'use client';

import { Chatbot } from '@/components/anemo/Chatbot';
import { motion } from 'framer-motion';

export default function ChatbotPage() {
  return (
    <div className="h-[calc(100vh-6rem)] w-full flex flex-col relative overflow-hidden bg-background">
      {/* Premium Ambient Background - Ultra Blue */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Cyan Glow */}
          <div className="absolute top-[-20%] left-[20%] w-[60vw] h-[60vw] bg-cyan-500/10 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[8000ms]" />
          {/* Deep Indigo Depth */}
          <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-600/10 rounded-full blur-[130px] mix-blend-screen" />
          {/* Sky Blue Highlight */}
          <div className="absolute top-[40%] left-[-10%] w-[40vw] h-[40vw] bg-blue-500/10 rounded-full blur-[100px] mix-blend-screen" />
          
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 flex flex-col items-center justify-center h-full"
      >
        <div className="w-full h-full max-h-[85vh] rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 bg-background/40 backdrop-blur-xl relative flex flex-col ring-1 ring-white/5">
            {/* Inner Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
            <Chatbot />
        </div>
      </motion.div>
    </div>
  );
}
