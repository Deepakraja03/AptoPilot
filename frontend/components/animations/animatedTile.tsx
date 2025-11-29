"use client";
import { useState, useEffect, useCallback, ReactNode } from "react";

interface AnimatedTitleProps {
  text: string;
  className?: string;
  children?: ReactNode; // Accept children as a prop
}

const greekSymbols = "αβγδεζηθικλμνξοπρστυφχψω∑∆ΩΛΞ∇ΠΦΨΖ";
const randomCharacters =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=<>?/[]{}|";

const getRandomCharacter = (originalChar: string) => {
  if (originalChar === " ") return " ";
  return Math.random() > 0.5
    ? greekSymbols[Math.floor(Math.random() * greekSymbols.length)]
    : randomCharacters[Math.floor(Math.random() * randomCharacters.length)];
};

const AnimatedTitle: React.FC<AnimatedTitleProps> = ({ text, className = "", children }) => {
  const [displayText, setDisplayText] = useState<string>(text);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [hasAnimatedOnce, setHasAnimatedOnce] = useState<boolean>(false);
  const [isSmaller, setIsSmaller] = useState<boolean>(false);
  const [cooldownActive, setCooldownActive] = useState<boolean>(false);
  
  // Extract base classes that will remain unchanged
  const baseClasses = className.split(" ").filter(cls => !cls.includes("text-8xl")).join(" ");

  const animateJumble = useCallback(() => {
    if (isAnimating || cooldownActive) return;

    setIsAnimating(true);
    // Set smaller text size during animation
    setIsSmaller(true);
    
    let iterations = 0;
    const maxIterations = 10;
    const intervalTime = 50; 
    const originalText = text.split("");

    let tempText = Array(originalText.length).fill(" ");

    const interval = setInterval(() => {
      if (iterations < maxIterations) {
        tempText = tempText.map((char, index) =>
          index < iterations
            ? originalText[index]
            : getRandomCharacter(originalText[index])
        );

        setDisplayText(tempText.join(""));
        iterations++;
      } else {
        clearInterval(interval);
        setDisplayText(text);
        setIsAnimating(false);
        setHasAnimatedOnce(true);
        // Restore original size after animation completes
        setIsSmaller(false);
        
        // Start cooldown period
        setCooldownActive(true);
        setTimeout(() => {
          setCooldownActive(false);
        }, 500); // 3-second cooldown
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [text, isAnimating, cooldownActive]);

  useEffect(() => {
    if (!hasAnimatedOnce) {
      animateJumble();
    }
  }, [hasAnimatedOnce, animateJumble]);

  const handleMouseEnter = () => {
    if (!isAnimating && !cooldownActive) {
      animateJumble();
    }
  };

  // Determine which text size class to use
  const textSizeClass = isSmaller ? "text-6xl" : className.includes("text-8xl") ? "text-8xl" : "";
  
  // Combine all classes
  const combinedClasses = `inline-block transition-all duration-500 ${baseClasses} ${textSizeClass}`;

  return (
    <span
      className={combinedClasses}
      onMouseEnter={handleMouseEnter}
    >
      {displayText} {children} 
    </span>
  );
};

export default AnimatedTitle;