'use client';

import { SignUpForm } from '@/components/auth/SignUpForm';
import { motion } from 'framer-motion';

export default function SignUpPage() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="glass-panel rounded-[2rem] p-8 border-primary/5 shadow-xl">
        <SignUpForm />
      </div>
    </motion.div>
  );
}
