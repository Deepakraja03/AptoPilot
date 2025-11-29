"use client";

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { getTokenColor, getTokenImageSize, getFallbackTextSize } from '@/lib/utils/token-image-utils';

export interface ChainImageProps {
  name: string;
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showRing?: boolean;
  ringColor?: string;
}

export function ChainImage({ 
  name, 
  logoUrl, 
  size = 'md', 
  className,
  showRing = true,
  ringColor = 'ring-gray-700/50'
}: ChainImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Show fallback if no logoUrl provided or if image failed to load
  const showFallback = !logoUrl || imageError || logoUrl.trim() === '';

  const sizeClasses = getTokenImageSize(size);
  const textSizeClasses = getFallbackTextSize(size);
  const chainColor = getTokenColor(name);

  if (showFallback) {
    return (
      <div 
        className={cn(
          'rounded-full flex items-center justify-center transition-all duration-300',
          sizeClasses,
          showRing && `ring-2 ${ringColor} group-hover:ring-[#FA4C15]/30`,
          'group-hover:scale-110 transform',
          className
        )}
        style={{ 
          background: `linear-gradient(135deg, ${chainColor}, ${chainColor}dd)` 
        }}
      >
        <span className={cn('font-bold text-white', textSizeClasses)}>
          {name.slice(0, 1).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      <img
        src={logoUrl}
        alt={name}
        className={cn(
          'rounded-full transition-all duration-300',
          sizeClasses,
          showRing && `ring-2 ${ringColor} group-hover:ring-[#FA4C15]/30`,
          'group-hover:scale-110 transform',
          !imageLoaded && 'opacity-0',
          className
        )}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
      />
      
      {/* Loading placeholder */}
      {!imageLoaded && !imageError && (
        <div 
          className={cn(
            'absolute inset-0 rounded-full flex items-center justify-center animate-pulse',
            sizeClasses,
            showRing && `ring-2 ${ringColor}`,
            'bg-gray-700'
          )}
        >
          <span className={cn('font-bold text-gray-400', textSizeClasses)}>
            {name.slice(0, 1).toUpperCase()}
          </span>
        </div>
      )}
      
      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
}