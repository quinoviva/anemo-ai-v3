'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Droplet, Shield, Smartphone, Monitor, Activity, Heart, Zap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import './anemia-info.css';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function AboutAnemiaPage() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-12 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild className="rounded-full">
          <Link href="/dashboard">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-16"
      >
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="text-center space-y-6">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-rose-400 animate-gradient-x p-2">
            Understanding Anemia
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto font-light leading-relaxed">
            A silent condition affecting millions. Learn how Anemo helps you detect, monitor, and combat anemia effectively.
          </p>
        </motion.div>

        {/* What is Anemia & Effects */}
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div variants={itemVariants} className="glass-card p-8 space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Droplet className="h-40 w-40" />
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/10 rounded-full animate-pulse-red">
                <Droplet className="h-6 w-6 text-red-500" />
              </div>
              <h2 className="text-3xl font-semibold">What is Anemia?</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed text-lg">
              Anemia is a condition in which you lack enough healthy red blood cells to carry adequate oxygen to your body's tissues. Having anemia, also referred to as low hemoglobin, can make you feel tired and weak.
            </p>
            <div className="space-y-4 pt-4">
              <h3 className="font-semibold text-xl">Common Effects:</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['Extreme Fatigue', 'Weakness', 'Pale Skin', 'Chest Pain', 'Headache', 'Cold Hands/Feet'].map((effect) => (
                  <li key={effect} className="flex items-center gap-2 text-muted-foreground">
                    <span className="h-2 w-2 bg-red-400 rounded-full" />
                    {effect}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="glass-card p-8 space-y-6 relative overflow-hidden animate-float">
             <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Shield className="h-6 w-6 text-blue-500" />
              </div>
              <h2 className="text-3xl font-semibold">Our Solution</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed text-lg">
              We created <span className="font-bold text-foreground">Anemo</span> to bridge the gap between expensive medical diagnostics and accessible daily health monitoring.
            </p>
            <div className="space-y-4">
               <div className="flex gap-4">
                  <div className="h-12 w-1 bg-gradient-to-b from-blue-500 to-transparent rounded-full" />
                  <div>
                    <h4 className="font-bold text-lg">AI-Powered Detection</h4>
                    <p className="text-muted-foreground">Using advanced Convolutional Neural Networks (CNN) to analyze pallor in fingernails and conjunctiva.</p>
                  </div>
               </div>
               <div className="flex gap-4">
                  <div className="h-12 w-1 bg-gradient-to-b from-emerald-500 to-transparent rounded-full" />
                  <div>
                    <h4 className="font-bold text-lg">Instant Insights</h4>
                    <p className="text-muted-foreground">Get real-time risk assessments and personalized health recommendations without waiting for lab results.</p>
                  </div>
               </div>
            </div>
          </motion.div>
        </div>

        {/* How to Use */}
        <motion.div variants={itemVariants} className="space-y-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold tracking-tight">How to Use Anemo</h2>
            <p className="text-muted-foreground mt-2">Seamless experience across all your devices.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Web Usage */}
            <div className="glass-card p-8 border-l-4 border-l-purple-500 space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <Monitor className="h-8 w-8 text-purple-500" />
                <h3 className="text-2xl font-bold">Web Application</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex gap-3">
                   <div className="bg-purple-500/20 text-purple-500 h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm">1</div>
                   <div>
                     <p className="font-medium">Dashboard Overview</p>
                     <p className="text-sm text-muted-foreground">Access your health summary, recent analyses, and quick actions directly from the home screen.</p>
                   </div>
                </li>
                 <li className="flex gap-3">
                   <div className="bg-purple-500/20 text-purple-500 h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm">2</div>
                   <div>
                     <p className="font-medium">Upload Analysis</p>
                     <p className="text-sm text-muted-foreground">Use the "Start Analysis" card to upload high-quality images of your eye (conjunctiva) or fingernails.</p>
                   </div>
                </li>
                 <li className="flex gap-3">
                   <div className="bg-purple-500/20 text-purple-500 h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm">3</div>
                   <div>
                     <p className="font-medium">Detailed Reports</p>
                     <p className="text-sm text-muted-foreground">View comprehensive breakdowns of your risk factors and track historical trends via the "Full History" section.</p>
                   </div>
                </li>
              </ul>
            </div>

            {/* Mobile Usage */}
            <div className="glass-card p-8 border-l-4 border-l-orange-500 space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <Smartphone className="h-8 w-8 text-orange-500" />
                <h3 className="text-2xl font-bold">Mobile Experience</h3>
              </div>
               <ul className="space-y-4">
                <li className="flex gap-3">
                   <div className="bg-orange-500/20 text-orange-500 h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm">1</div>
                   <div>
                     <p className="font-medium">Responsive Design</p>
                     <p className="text-sm text-muted-foreground">Anemo is fully optimized for touch. Navigate using the bottom menu or hamburger menu on smaller screens.</p>
                   </div>
                </li>
                 <li className="flex gap-3">
                   <div className="bg-orange-500/20 text-orange-500 h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm">2</div>
                   <div>
                     <p className="font-medium">Camera Integration</p>
                     <p className="text-sm text-muted-foreground">Take photos directly within the app for analysis. Ensure good lighting for the best results.</p>
                   </div>
                </li>
                 <li className="flex gap-3">
                   <div className="bg-orange-500/20 text-orange-500 h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm">3</div>
                   <div>
                     <p className="font-medium">On-the-Go Monitoring</p>
                     <p className="text-sm text-muted-foreground">Check your status, find nearby clinics using GPS, and chat with the AI assistant anywhere.</p>
                   </div>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div variants={itemVariants} className="text-center py-12">
          <p className="text-2xl font-light mb-8">Ready to take control of your health?</p>
          <div className="flex justify-center gap-4">
             <Button size="lg" className="rounded-full text-lg px-8" asChild>
               <Link href="/dashboard/analysis">Start Analysis Now</Link>
             </Button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
