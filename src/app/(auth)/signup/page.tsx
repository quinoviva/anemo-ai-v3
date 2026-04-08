'use client';

import { SignUpForm } from '@/components/auth/SignUpForm';
import { motion } from 'framer-motion';

export default function SignUpPage() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full"
    >
      <div className="bg-[#080808]/40 backdrop-blur-2xl rounded-3xl p-5 sm:p-8 border border-white/[0.08] relative">
        <SignUpForm />
      </div>

      <div className="mt-4 flex justify-center gap-6 text-[9px] uppercase tracking-[0.2em] text-white/20">
        <a href="#" className="hover:text-rose-500 transition-colors">Privacy</a>
        <a href="#" className="hover:text-rose-500 transition-colors">Security</a>
        <a href="#" className="hover:text-rose-500 transition-colors">Help</a>
      </div>
    </motion.div>
  );
}