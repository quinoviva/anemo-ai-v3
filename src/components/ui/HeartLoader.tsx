import React from 'react';
import './HeartLoader.css';
import { cn } from '@/lib/utils';

interface HeartLoaderProps {
  size?: number;
  fullPage?: boolean;
  withBackground?: boolean;
  className?: string;
  strokeWidth?: number;
}

const HeartLoader: React.FC<HeartLoaderProps> = ({ 
  size = 200, 
  fullPage = false, 
  withBackground = false,
  className,
  strokeWidth = 8 // Slightly thinner for a more premium look
}) => {
  return (
    <div className={cn(
      "heart-loader-container", 
      fullPage && "full-page", 
      withBackground && "with-bg",
      !fullPage && !withBackground && "inline",
      className
    )}>
      <svg 
        className="heart-svg" 
        width={size} 
        height={size} 
        viewBox="0 0 200 200" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Premium Glow Filter */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          
          {/* Linear Gradient for the stroke */}
          <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff4770" />
            <stop offset="100%" stopColor="#ff7096" />
          </linearGradient>
        </defs>

        {/* Refined Heart Path: Smoother curves and balanced proportions */}
        <path 
          className="heart-path" 
          strokeWidth={strokeWidth}
          stroke="url(#heartGradient)"
          filter="url(#glow)"
          d="M100,175 
             C100,175 25,120 25,70 
             C25,40 55,25 80,45 
             C85,50 100,65 100,65 
             C100,65 115,50 120,45 
             C145,25 175,40 175,70 
             C175,120 100,175 100,175 Z" 
        />

        {/* Improved Pulse Path: More technically precise EKG rhythm */}
        <path 
          className="pulse-path" 
          strokeWidth={strokeWidth}
          stroke="#ffffff"
          filter="url(#glow)"
          d="M40,105 
             L75,105 
             L85,80 
             L95,135 
             L105,70 
             L115,105 
             L160,105" 
        />
      </svg>
    </div>
  );
};

export default HeartLoader;
