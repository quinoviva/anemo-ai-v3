'use client';

import React from 'react';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Eye, Hand, Microscope, Activity, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const insights = [
  {
    title: 'The Ocular Connection',
    description: 'Physicians have used the color of the palpebral conjunctiva (the inner eyelid) for decades to screen for anemia. A pale interior suggests low hemoglobin levels.',
    icon: <Eye className="text-primary" />,
  },
  {
    title: 'Why AI Analysis?',
    description: 'Image analysis for anemia is a growing field in telemedicine. It provides a non-invasive, cost-effective way to screen populations where blood tests are not immediately available.',
    icon: <Microscope className="text-blue-500" />,
  },
  {
    title: 'Medical Validity',
    description: 'Studies show that palpebral pallor has a high specificity for detecting severe anemia. AI enhances this by removing human subjectivity and lighting variations.',
    icon: <ShieldCheck className="text-green-500" />,
  },
];

export function MedicalInsights() {
  return (
    <div className="py-12 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">The Science Behind Anemo Check</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Understanding why visual indicators are a powerful first line of defense against anemia.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {insights.map((insight, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.2 }}
          >
            <GlassSurface intensity="low" className="h-full border-primary/5 hover:border-primary/20 transition-all p-6 space-y-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                {insight.icon}
              </div>
              <h3 className="text-xl font-bold">{insight.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {insight.description}
              </p>
            </GlassSurface>
          </motion.div>
        ))}
      </div>

      <GlassSurface intensity="medium" className="p-8 border-yellow-500/20 bg-yellow-500/5">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="bg-yellow-500/20 p-4 rounded-full">
            <AlertCircle className="h-8 w-8 text-yellow-600" />
          </div>
          <div className="space-y-2">
            <h4 className="text-lg font-bold">Important Medical Disclaimer</h4>
            <p className="text-sm text-muted-foreground">
              Anemo Check is a screening tool, not a diagnostic one. While visual indicators like pallor are clinically recognized, they cannot replace a formal Complete Blood Count (CBC) test. Always consult with a licensed medical professional for a final diagnosis.
            </p>
          </div>
        </div>
      </GlassSurface>
    </div>
  );
}
