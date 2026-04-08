'use client';

import { LoginForm } from '@/components/auth/LoginForm';
import { motion } from 'framer-motion';

export default function LoginPage() {
  return (
    <div className="w-full">
      {/* Big Branding Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-8"
      >
        <h1 className="text-5xl font-light text-slate-900 dark:text-white uppercase tracking-tight">
          ANEMO
        </h1>
        <div className="h-px w-12 bg-rose-500 mt-2 opacity-50" />
      </motion.div>

      {/* Card: Uses Crystal Glass in Light, Obsidian Glass in Dark */}
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="bg-white/70 dark:bg-[#080808]/40 backdrop-blur-3xl rounded-[2rem] p-6 sm:p-10 border border-slate-200 dark:border-white/[0.08] shadow-xl shadow-slate-200/50 dark:shadow-none relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/20 to-transparent" />
          <LoginForm />
        </div>
      </motion.div>
    </div>
  );
}