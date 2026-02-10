'use client';

import React from 'react';
import './NutritionTicker.css';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

const foods = [
  { name: 'Spinach', iron: 'High Iron', icon: '🥬', color: '#4ade80' }, // Green
  { name: 'Beetroot', iron: 'Iron Booster', icon: '🍠', color: '#db2777' }, // Pink/Red
  { name: 'Red Meat', iron: 'Heme Iron', icon: '🥩', color: '#ef4444' }, // Red
  { name: 'Lentils', iron: 'Rich Iron', icon: '🍲', color: '#d97706' }, // Amber
  { name: 'Pomegranate', iron: 'Iron + Vit C', icon: '🥗', color: '#be123c' }, // Deep Red
  { name: 'Dark Chocolate', iron: 'Antioxidants', icon: '🍫', color: '#78350f' }, // Brown
  { name: 'Liver', iron: 'Superfood', icon: '🍖', color: '#9f1239' }, // Dark Red
  { name: 'Pumpkin Seeds', iron: 'Plant Iron', icon: '🎃', color: '#f97316' }, // Orange
  { name: 'Quinoa', iron: 'Fiber + Iron', icon: '🥣', color: '#eab308' }, // Yellow
  { name: 'Broccoli', iron: 'Iron + Vit C', icon: '🥦', color: '#22c55e' }, // Green
  { name: 'Tofu', iron: 'Vegan Iron', icon: '🧊', color: '#f5f5f4' }, // White/Off-white
  { name: 'Shellfish', iron: 'Heme Iron', icon: '🦪', color: '#f43f5e' }, // Rose
];

export const NutritionTicker = () => {
  return (
    <div className="w-full py-12 overflow-hidden nutrition-ticker-container relative">
      {/* Fade Gradients for infinite scroll illusion */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-20 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-20 pointer-events-none" />

      <div className="flex animate-infinite-scroll gap-8 py-4">
        {[...foods, ...foods].map((food, index) => (
          <div
            key={`${food.name}-${index}`}
            className="food-card w-[220px] h-[280px] rounded-[2rem] flex flex-col items-center justify-center p-6 cursor-pointer group flex-shrink-0"
            style={{ '--glow-color': food.color } as React.CSSProperties}
          >
            <div className="food-glow rounded-full" />
            
            <div className="relative z-10 text-8xl mb-6 transition-transform duration-500 group-hover:scale-110 drop-shadow-2xl filter saturate-[1.2]">
              {food.icon}
            </div>
            
            <div className="space-y-2 text-center relative z-10">
              <h4 className="text-xl font-bold tracking-tight text-foreground premium-text-shadow">
                {food.name}
              </h4>
              <Badge 
                variant="outline" 
                className="bg-white/10 backdrop-blur-md border-white/20 text-xs uppercase tracking-widest font-bold px-3 py-1 text-muted-foreground group-hover:text-primary group-hover:border-primary/30 transition-colors"
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
