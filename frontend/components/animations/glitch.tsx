"use client";
import React, { useState, useEffect } from 'react';

interface GlitchTextProps {
  text: string;
  className?: string;
  children?: React.ReactNode;
}

const GlitchText: React.FC<GlitchTextProps> = ({ text, className, children }) => {
  const content = children || text;
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsGlitching(true);
      // Glitch lasts for 500ms
      setTimeout(() => {
        setIsGlitching(false);
      }, 500);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Determine the base text class based on the parent's text color.
  // If the parent's className includes "text-[#ADFEB9]", use "glitch-text-white" for the base text.
  const baseTextClass = className?.includes("text-[#ADFEB9]") ? "glitch-text-white" : "glitch-text";

  // Determine the proper glitch overlay style.
  // If the parent's text color is "text-[#ADFEB9]", use the white glitch overlay.
  const glitchClass = className?.includes("text-[#ADFEB9]") ? "glitch-active-white" : "glitch-active";

  return (
    <div className={`glitch-container ${className || ''}`}>
      <span className={baseTextClass} data-text={content as string}>
        {content}
      </span>
      {isGlitching && (
        <span className={`${baseTextClass} ${glitchClass}`} data-text={content as string}>
          {content}
        </span>
      )}
    </div>
  );
};

export default GlitchText;