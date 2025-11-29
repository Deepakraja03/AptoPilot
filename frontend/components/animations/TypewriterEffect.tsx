"use client";
import { useState, useEffect } from "react";

interface TypewriterProps {
  className?: string;
}

const TypewriterEffect: React.FC<TypewriterProps> = ({ className = "" }) => {
  const phrases = [
    " automated\n yield strategies.",
    " cross-chain\n lending actions.",
    " gasless borrow\n protocols.",
    " intent-powered\n execution."
  ];

  const [displayText, setDisplayText] = useState<string[]>([]);
  const [charIndex, setCharIndex] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pauseBeforeNext, setPauseBeforeNext] = useState(false);

  const currentPhrase = phrases[phraseIndex];

  // Initialize text structure on phrase change
  useEffect(() => {
    const initial = Array(currentPhrase.length)
      .fill(" ")
      .map((_, i) => (currentPhrase[i] === "\n" ? "\n" : " "));
    setDisplayText(initial);
    setCharIndex(0);
  }, [currentPhrase]);

  useEffect(() => {
    const typingSpeed = isDeleting ? 60 : 100;

    if (!isDeleting && charIndex === currentPhrase.length) {
      setPauseBeforeNext(true);
      setTimeout(() => {
        setPauseBeforeNext(false);
        setIsDeleting(true);
      }, 2000);
      return;
    }

    if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
      return;
    }

    if (pauseBeforeNext) return;

    const timer = setTimeout(() => {
      setDisplayText((prev) => {
        const updated = [...prev];
        if (isDeleting) {
          if (currentPhrase[charIndex - 1] !== "\n") {
            updated[charIndex - 1] = " ";
          }
        } else {
          updated[charIndex] = currentPhrase[charIndex];
        }
        return updated;
      });

      setCharIndex((prev) => (isDeleting ? prev - 1 : prev + 1));
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, pauseBeforeNext, currentPhrase]);

  return (
    <span
      className={`whitespace-pre-wrap transition-all duration-500 font-normal text-8xl ease-in-out leading-[0] ${className}`}
    >
      {displayText.join("")}
    </span>
  );
};

export default TypewriterEffect;