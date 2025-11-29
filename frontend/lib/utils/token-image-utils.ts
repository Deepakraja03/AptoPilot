/**
 * Utility functions for handling token images with fallbacks
 */

export interface TokenImageProps {
  symbol: string;
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Generate a consistent color for a token symbol
 */
export function getTokenColor(symbol: string): string {
  const colors = [
    '#FF6B35', '#F7931E', '#FFD23F', '#06FFA5', '#1B9CFC',
    '#3742FA', '#A55EEA', '#FF3838', '#FF9FF3', '#54A0FF',
    '#5F27CD', '#00D2D3', '#FF9F43', '#10AC84', '#EE5A24'
  ];
  
  // Use symbol to generate consistent color index
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Get size classes for token images
 */
export function getTokenImageSize(size: 'sm' | 'md' | 'lg' = 'md'): string {
  switch (size) {
    case 'sm':
      return 'h-6 w-6';
    case 'md':
      return 'h-8 w-8';
    case 'lg':
      return 'h-10 w-10';
    default:
      return 'h-8 w-8';
  }
}

/**
 * Get font size for fallback text
 */
export function getFallbackTextSize(size: 'sm' | 'md' | 'lg' = 'md'): string {
  switch (size) {
    case 'sm':
      return 'text-xs';
    case 'md':
      return 'text-sm';
    case 'lg':
      return 'text-base';
    default:
      return 'text-sm';
  }
}