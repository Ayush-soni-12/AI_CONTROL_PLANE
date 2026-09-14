"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface InteractiveBackgroundProps {
  children: React.ReactNode;
}

/**
 * Client component for interactive obsidian cyber background
 * Handles mouse tracking spotlights and high-contrast matrix grid
 */
export function InteractiveBackground({
  children,
}: InteractiveBackgroundProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070a13] text-slate-100">
      {/* Interactive dynamic cursor spotlight */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40 transition-opacity duration-300"
        style={{
          background: `radial-gradient(650px at ${mousePosition.x}px ${mousePosition.y}px, rgba(6, 182, 212, 0.12), rgba(99, 102, 241, 0.05) 40%, transparent 80%)`,
        }}
      />

      {/* Cyber Grid pattern */}
      <div className="fixed inset-0 pointer-events-none cyber-grid opacity-70" />

      {/* Ambient Cyber Neon Orbs */}
      <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 right-10 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-[450px] h-[450px] bg-emerald-500/8 rounded-full blur-[100px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
