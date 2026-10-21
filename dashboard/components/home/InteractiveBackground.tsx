"use client";

import React, { useEffect, useRef } from "react";

interface InteractiveBackgroundProps {
  children: React.ReactNode;
}

interface GridBeam {
  type: "horizontal" | "vertical";
  lineIndex: number;
  position: number;
  length: number;
  speed: number;
  direction: 1 | -1;
  opacity: number;
  delay: number;
}

interface IntersectionFlare {
  col: number;
  row: number;
  phase: number;
  speed: number;
  baseSize: number;
}

/**
 * Design 4: Interactive Grid + Running Beams (Vercel Black & White Aesthetic)
 * - Precision 48px monochromatic grid matrix
 * - Autonomous white laser beams traveling across horizontal & vertical grid lines
 * - Interactive grid box & cell illumination reacting to mouse movement
 * - Crosshair 4-point starburst flares at grid intersections
 * - Smooth 60fps hardware-accelerated HTML5 Canvas with zero React re-render overhead
 */
export function InteractiveBackground({ children }: InteractiveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const GRID_SIZE = 48; // Standard Vercel matrix cell size
    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      active: false,
    };

    // Check for reduced motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Resize handler with HiDPI support capped at DPR 2 for optimal GPU performance
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Mouse tracking via event listener without triggering React renders
    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.targetX = -1000;
      mouse.targetY = -1000;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    // Generate autonomous grid beams
    const totalCols = Math.ceil(width / GRID_SIZE) + 1;
    const totalRows = Math.ceil(height / GRID_SIZE) + 1;

    const createBeam = (type?: "horizontal" | "vertical"): GridBeam => {
      const isHorizontal = type
        ? type === "horizontal"
        : Math.random() > 0.45;
      const numLines = isHorizontal
        ? Math.ceil(window.innerHeight / GRID_SIZE) + 2
        : Math.ceil(window.innerWidth / GRID_SIZE) + 2;

      const maxDim = isHorizontal ? window.innerWidth : window.innerHeight;
      const direction = Math.random() > 0.5 ? 1 : -1;
      const length = Math.floor(Math.random() * 80 + 70); // 70px - 150px beam

      return {
        type: isHorizontal ? "horizontal" : "vertical",
        lineIndex: Math.floor(Math.random() * numLines),
        position: direction === 1 ? -length : maxDim + length,
        length,
        speed: (Math.random() * 1.8 + 1.2) * (prefersReducedMotion ? 0 : 1),
        direction,
        opacity: Math.random() * 0.35 + 0.55,
        delay: Math.random() * 60,
      };
    };

    // 8 concurrent autonomous beams
    const beams: GridBeam[] = Array.from({ length: 8 }, (_, i) =>
      createBeam(i % 2 === 0 ? "horizontal" : "vertical")
    );

    // Persistent ambient crosshair flares at sparse key intersections
    const flares: IntersectionFlare[] = [];
    const flareCount = 6;
    for (let i = 0; i < flareCount; i++) {
      flares.push({
        col: Math.floor(Math.random() * (totalCols - 2)) + 1,
        row: Math.floor(Math.random() * (totalRows - 2)) + 1,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.02 + 0.015,
        baseSize: Math.random() * 6 + 10,
      });
    }

    // Helper to draw a crisp 4-point starburst crosshair flare
    const drawCrosshairFlare = (
      x: number,
      y: number,
      size: number,
      alpha: number
    ) => {
      if (alpha <= 0.01) return;

      ctx.save();
      ctx.globalAlpha = Math.min(alpha, 1);

      // Horizontal specular ray
      const hGrad = ctx.createLinearGradient(x - size, y, x + size, y);
      hGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
      hGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.95)");
      hGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = hGrad;
      ctx.fillRect(x - size, y - 0.75, size * 2, 1.5);

      // Vertical specular ray
      const vGrad = ctx.createLinearGradient(x, y - size, x, y + size);
      vGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
      vGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.95)");
      vGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = vGrad;
      ctx.fillRect(x - 0.75, y - size, 1.5, size * 2);

      // Core center spark
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.restore();
    };

    let lastTime = performance.now();

    // Main 60fps render loop
    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 16.667, 2.5); // normalized frame step
      lastTime = time;

      // Smooth mouse interpolation (lerp)
      mouse.x += (mouse.targetX - mouse.x) * 0.15;
      mouse.y += (mouse.targetY - mouse.y) * 0.15;

      // 1. Clear with Pitch Black
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      // 2. Base Grid Matrix Lines (Crisp Cyan-Tinted Matrix)
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(0, 240, 255, 0.04)";

      // Vertical lines
      ctx.beginPath();
      for (let x = 0; x <= width; x += GRID_SIZE) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
      }
      // Horizontal lines
      for (let y = 0; y <= height; y += GRID_SIZE) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
      }
      ctx.stroke();

      // 3. Interactive Mouse Grid Box Illumination
      if (mouse.x > -500 && mouse.y > -500) {
        const hoveredCol = Math.floor(mouse.x / GRID_SIZE);
        const hoveredRow = Math.floor(mouse.y / GRID_SIZE);

        // Highlight active hovered cell and adjacent neighbors with radial falloff
        const radius = 2; // 2 cells radius around cursor
        for (let dx = -radius; dx <= radius; dx++) {
          for (let dy = -radius; dy <= radius; dy++) {
            const cellCol = hoveredCol + dx;
            const cellRow = hoveredRow + dy;

            if (cellCol < 0 || cellRow < 0) continue;

            const cellX = cellCol * GRID_SIZE;
            const cellY = cellRow * GRID_SIZE;

            const dist = Math.hypot(
              mouse.x - (cellX + GRID_SIZE / 2),
              mouse.y - (cellY + GRID_SIZE / 2)
            );

            const maxDist = GRID_SIZE * 2.2;
            if (dist < maxDist) {
              const intensity = Math.pow(1 - dist / maxDist, 1.8);

              // Soft translucent cell fill
              ctx.fillStyle = `rgba(0, 240, 255, ${0.04 * intensity})`;
              ctx.fillRect(cellX + 1, cellY + 1, GRID_SIZE - 1, GRID_SIZE - 1);

              // Crisp cell perimeter highlight
              ctx.strokeStyle = `rgba(0, 240, 255, ${0.2 * intensity})`;
              ctx.strokeRect(cellX + 0.5, cellY + 0.5, GRID_SIZE, GRID_SIZE);
            }
          }
        }

        // Ambient cyber cursor spotlight
        const spotlight = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          360
        );
        spotlight.addColorStop(0, "rgba(0, 240, 255, 0.05)");
        spotlight.addColorStop(0.4, "rgba(0, 240, 255, 0.01)");
        spotlight.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = spotlight;
        ctx.fillRect(
          Math.max(0, mouse.x - 360),
          Math.max(0, mouse.y - 360),
          720,
          720
        );

        // Nearest intersection flare to the mouse
        const nearestIntersectX = Math.round(mouse.x / GRID_SIZE) * GRID_SIZE;
        const nearestIntersectY = Math.round(mouse.y / GRID_SIZE) * GRID_SIZE;
        const distToIntersection = Math.hypot(
          mouse.x - nearestIntersectX,
          mouse.y - nearestIntersectY
        );

        if (distToIntersection < GRID_SIZE * 0.9) {
          const flareAlpha = 1 - distToIntersection / (GRID_SIZE * 0.9);
          drawCrosshairFlare(
            nearestIntersectX,
            nearestIntersectY,
            16,
            flareAlpha * 0.9
          );
        }
      }

      // 4. Autonomous Running Grid Beams
      beams.forEach((beam) => {
        if (beam.delay > 0) {
          beam.delay -= dt;
          return;
        }

        const isHorizontal = beam.type === "horizontal";
        const maxBound = isHorizontal ? width : height;

        // Advance position along grid line
        beam.position += beam.speed * beam.direction * dt;

        // Reset if past viewport
        const isOffscreen =
          beam.direction === 1
            ? beam.position - beam.length > maxBound
            : beam.position + beam.length < 0;

        if (isOffscreen) {
          Object.assign(beam, createBeam(beam.type));
          return;
        }

        // Draw laser beam streak
        const lineCoord = beam.lineIndex * GRID_SIZE + 0.5;

        if (isHorizontal) {
          const headX = beam.position;
          const tailX = beam.position - beam.length * beam.direction;

          const grad = ctx.createLinearGradient(tailX, lineCoord, headX, lineCoord);
          grad.addColorStop(0, "rgba(0, 240, 255, 0)");
          grad.addColorStop(0.7, `rgba(0, 240, 255, ${beam.opacity * 0.5})`);
          grad.addColorStop(1, `rgba(255, 255, 255, ${beam.opacity})`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(tailX, lineCoord);
          ctx.lineTo(headX, lineCoord);
          ctx.stroke();

          // Luminous head glowing spark
          ctx.fillStyle = `rgba(255, 255, 255, ${beam.opacity})`;
          ctx.beginPath();
          ctx.arc(headX, lineCoord, 1.75, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const headY = beam.position;
          const tailY = beam.position - beam.length * beam.direction;

          const grad = ctx.createLinearGradient(lineCoord, tailY, lineCoord, headY);
          grad.addColorStop(0, "rgba(0, 240, 255, 0)");
          grad.addColorStop(0.7, `rgba(0, 240, 255, ${beam.opacity * 0.5})`);
          grad.addColorStop(1, `rgba(255, 255, 255, ${beam.opacity})`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(lineCoord, tailY);
          ctx.lineTo(lineCoord, headY);
          ctx.stroke();

          // Luminous head glowing spark
          ctx.fillStyle = `rgba(255, 255, 255, ${beam.opacity})`;
          ctx.beginPath();
          ctx.arc(lineCoord, headY, 1.75, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 5. Ambient Twinkling Crosshair Flares
      flares.forEach((flare) => {
        flare.phase += flare.speed * dt;
        const pulse = (Math.sin(flare.phase) + 1) / 2; // 0 to 1
        const flareAlpha = pulse * 0.45 + 0.15;
        const flareSize = flare.baseSize + pulse * 4;

        drawCrosshairFlare(
          flare.col * GRID_SIZE,
          flare.row * GRID_SIZE,
          flareSize,
          flareAlpha
        );
      });

      // 6. Top Ambient Cone Spotlight
      const topCone = ctx.createRadialGradient(
        width / 2,
        0,
        0,
        width / 2,
        0,
        height * 0.75
      );
      topCone.addColorStop(0, "rgba(0, 240, 255, 0.04)");
      topCone.addColorStop(0.5, "rgba(0, 240, 255, 0.008)");
      topCone.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = topCone;
      ctx.fillRect(0, 0, width, height * 0.75);

      animationFrameId = requestAnimationFrame(render);
    };

    // Pause animation when tab is inactive to preserve 100% battery & CPU
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else {
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(render);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-slate-100">
      {/* Hardware-Accelerated 60fps Interactive Grid + Running Beams Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        aria-hidden="true"
      />

      {/* Main Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
