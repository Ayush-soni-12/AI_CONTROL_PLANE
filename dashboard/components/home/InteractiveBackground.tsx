"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface InteractiveBackgroundProps {
  children: React.ReactNode;
}

/**
 * Client component for interactive background effects
 * Handles mouse tracking and glitch effects
 */
export function InteractiveBackground({
  children,
}: InteractiveBackgroundProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [glitchEffect, setGlitchEffect] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Random glitch effect
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.95) {
        setGlitchEffect(true);
        setTimeout(() => setGlitchEffect(false), 100);
      }
    }, 3000);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearInterval(glitchInterval);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-950">
      {/* Animated background */}
      <div
        className="fixed inset-0 opacity-20"
        style={{
          background: `radial-gradient(600px at ${mousePosition.x}px ${mousePosition.y}px, rgba(120, 119, 198, 0.15), transparent 80%)`,
        }}
      />

      {/* Grid pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[50px_50px]" />

      {/* Glitch effect overlay */}
      {glitchEffect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.05 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-white mix-blend-overlay"
        />
      )}

      {/* Floating elements */}
      <div className="absolute top-1/4 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
