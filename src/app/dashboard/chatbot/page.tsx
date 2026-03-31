'use client';

import { Chatbot } from '@/components/anemo/Chatbot';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 50, damping: 20 } },
};

export default function ChatbotPage() {
  return (
    <div className="w-full pb-10">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-0 space-y-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="pt-2 space-y-3">
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-light tracking-tighter text-foreground leading-[0.9] flex flex-wrap items-baseline gap-x-3 md:gap-x-4">
            <span className="opacity-80">Anemo</span>
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 drop-shadow-sm">
              Bot
            </span>
            <span className="text-cyan-400 animate-pulse">.</span>
          </h1>
          <p className="text-sm sm:text-xl md:text-2xl text-muted-foreground font-light tracking-widest uppercase">
            AI Health Intelligence Assistant
          </p>
        </motion.div>

        {/* Chat Panel */}
        <motion.div
          variants={itemVariants}
          className="w-full rounded-[2rem] overflow-hidden shadow-2xl glass-panel relative flex flex-col min-h-[400px] h-[calc(100svh-280px)] max-h-[800px]"
        >
          {/* Inner top highlight */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent pointer-events-none" />
          <Chatbot />
        </motion.div>
      </motion.div>
    </div>
  );
}
