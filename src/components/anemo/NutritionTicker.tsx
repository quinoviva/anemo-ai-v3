'use client';

import React from 'react';
import './NutritionTicker.css';
import { Badge } from '@/components/ui/badge';

const foods = [
  { name: 'Spinach', iron: 'High Iron', icon: '🥬', color: '#4ade80' },
  { name: 'Beetroot', iron: 'Iron Booster', icon: '🍠', color: '#db2777' },
  { name: 'Red Meat', iron: 'Heme Iron', icon: '🥩', color: '#ef4444' },
  { name: 'Lentils', iron: 'Rich Iron', icon: '🍲', color: '#d97706' },
  { name: 'Pomegranate', iron: 'Iron + Vit C', icon: '🥗', color: '#be123c' },
  { name: 'Dark Chocolate', iron: 'Antioxidants', icon: '🍫', color: '#78350f' },
  { name: 'Liver', iron: 'Superfood', icon: '🍖', color: '#9f1239' },
  { name: 'Pumpkin Seeds', iron: 'Plant Iron', icon: '🎃', color: '#f97316' },
  { name: 'Quinoa', iron: 'Fiber + Iron', icon: '🥣', color: '#eab308' },
  { name: 'Broccoli', iron: 'Iron + Vit C', icon: '🥦', color: '#22c55e' },
  { name: 'Tofu', iron: 'Vegan Iron', icon: '🧊', color: '#f5f5f4' },
  { name: 'Shellfish', iron: 'Heme Iron', icon: '🦪', color: '#f43f5e' },
];

export const NutritionTicker = () => {
  return (
    /* Added nt-wrapper for scoping and extra top padding for the 'pop' space */
    <div className="nt-wrapper w-full pt-24 pb-16 overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-grid-white/[0.02] -z-10" />

      {/* Edge Fades for the Infinite Scroll illusion */}
      <div className="absolute left-0 top-0 bottom-0 w-40 bg-gradient-to-r from-background to-transparent z-20 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-background to-transparent z-20 pointer-events-none" />

      <div className="flex nt-scroll-track gap-10">
        {[...foods, ...foods].map((food, index) => (
          <div
            key={`${food.name}-${index}`}
            className="nt-card w-[240px] h-[320px] rounded-[3rem] flex flex-col items-center justify-center p-8 cursor-pointer group flex-shrink-0"
            style={{ 
              '--glow-color': food.color,
              '--food-accent': food.color 
            } as React.CSSProperties}
          >
            {/* The Glass Layer (The Blur) */}
            <div className="nt-glass-bg" />
            
            {/* The subtle glow behind the glass */}
            <div className="nt-food-glow" />
            
            {/* The Icon that pops up and out on hover */}
            <div className="relative z-10 text-9xl mb-8 nt-icon-pop">
              {food.icon}
            </div>
            
            <div className="space-y-3 text-center relative z-10 transition-all duration-500 group-hover:translate-y-1">
              <h4 className="text-2xl font-black tracking-tighter text-foreground nt-text-glow">
                {food.name}
              </h4>
              <Badge 
                variant="outline" 
                className="nt-badge-glass border-2 text-xs uppercase font-black px-4 py-1 tracking-widest transition-all duration-300"
              >
                {food.iron}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};