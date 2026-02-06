'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface GlassSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  intensity?: 'low' | 'medium' | 'high'; // Maps to elevation/shadow
  blur?: number; // Ignored in minimalist mode, kept for compatibility
  transparency?: number; // Ignored in minimalist mode, kept for compatibility
  borderOpacity?: number; // Ignored in minimalist mode, kept for compatibility
}

export function GlassSurface({
  children,
  className,
  intensity = 'low',
  style,
  ...props
}: GlassSurfaceProps) {
  
  // Minimalist Presets: Focus on Shadow and Border, not Blur
  const presets = {
    low: "bg-card border border-border/40 shadow-sm",
    medium: "bg-card border border-border/60 shadow-md",
    high: "bg-card border border-border/80 shadow-lg",
  };

  const presetClass = presets[intensity];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl transition-all duration-300',
        presetClass,
        className
      )}
      style={style}
      {...props}
    >
      {/* Content wrapper */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}
