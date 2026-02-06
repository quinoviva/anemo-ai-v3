'use client';

import { useState } from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Button } from '@/components/ui/button';
import { Lightbulb, RefreshCw } from 'lucide-react';

const healthTips = [
  "Stay hydrated! Drinking enough water can improve energy levels and brain function.",
  "Incorporate iron-rich foods like spinach, lentils, and beans into your diet.",
  "A short 10-minute walk can boost your mood and energy.",
  "Ensure you get enough Vitamin C, as it helps with iron absorption.",
  "Prioritize 7-9 hours of quality sleep per night for overall health.",
  "Listen to your body. Rest when you feel tired.",
  "Cooking in cast-iron pans can add a small amount of iron to your meals.",
  "Limit processed foods and sugary drinks.",
  "Practice mindfulness or meditation for a few minutes each day to reduce stress.",
  "Red meat is a great source of heme iron, which is easily absorbed by the body."
];

// Simple hashing function to get a consistent "random" index for the day
const getDailyIndex = () => {
    const date = new Date();
    const day = date.getFullYear() * 365 + date.getMonth() * 30 + date.getDate();
    return day % healthTips.length;
}

export function HealthTipCard({ variant = 'default' }: { variant?: 'default' | 'minimal' }) {
  const [tipIndex, setTipIndex] = useState(getDailyIndex());

  const getNewTip = () => {
    // Get a new random index that is different from the current one
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * healthTips.length);
    } while (newIndex === tipIndex);
    setTipIndex(newIndex);
  };

  if (variant === 'minimal') {
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium leading-relaxed italic opacity-90">
          "{healthTips[tipIndex]}"
        </p>
        <Button onClick={getNewTip} variant="ghost" size="sm" className="h-6 px-2 text-xs opacity-70 hover:opacity-100">
          <RefreshCw className="mr-1 h-3 w-3" />
          New Tip
        </Button>
      </div>
    );
  }

  return (
    <GlassSurface intensity="low">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="text-yellow-400" />
          Health Tip of the Day
        </CardTitle>
        <CardDescription>A small tip to help you on your wellness journey.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-lg font-medium text-foreground">
          "{healthTips[tipIndex]}"
        </p>
        <Button onClick={getNewTip} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Get Another Tip
        </Button>
      </CardContent>
    </GlassSurface>
  );
}
