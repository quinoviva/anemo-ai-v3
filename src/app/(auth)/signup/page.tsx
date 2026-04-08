'use client';

import { SignUpForm } from '@/components/auth/SignUpForm';
import { motion } from 'framer-motion';

export default function SignUpPage() {
  return (
    <div className="w-full">
      {/* Consistent Header for Signup */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-8"
      >
        <h1 className="text-5xl font-light text-slate-900 dark:text-white uppercase tracking-tight">
          ANEMO
        </h1>
        <p className="text-[10px] uppercase tracking-[0.3em] text-rose-500 font-bold mt-1">Enrollment</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full"
      >
        <div className="bg-white/70 dark:bg-[#080808]/40 backdrop-blur-3xl rounded-[2rem] p-6 sm:p-10 border border-slate-200 dark:border-white/[0.08] shadow-xl shadow-slate-200/50 dark:shadow-none relative">
          <SignUpForm />
        </div>

        <div className="mt-6 flex justify-center gap-6 text-[9px] uppercase tracking-[0.2em] text-slate-400 dark:text-white/20">
          <a href="#" className="hover:text-rose-500 transition-colors">Privacy</a>
          <a href="#" className="hover:text-rose-500 transition-colors">Security</a>
          <a href="#" className="hover:text-rose-500 transition-colors">Help</a>
        </div>
      </motion.div>
    </div>
  );
}