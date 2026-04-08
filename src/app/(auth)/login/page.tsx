'use client';

import { LoginForm } from '@/components/auth/LoginForm';
import { Logo } from '@/components/layout/Logo';
import { motion } from 'framer-motion';

export default function LoginPage() {
  return (
    <div className="w-full">
      {/* Big Branding Header (Outside) */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-8"
      >
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-5xl font-light text-white uppercase">ANEMO</h1>
        </div>
      </motion.div>

      {/* Clean Login Card */}
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="bg-[#080808]/40 backdrop-blur-3xl rounded-[2rem] p-6 sm:p-10 border border-white/[0.08] relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <LoginForm />
        </div>
      </motion.div>
    </div>
  );
}