"use client";

import { useEffect, useState, useMemo } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface TTLCountdownRingProps {
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  size?: number;
  showLabel?: boolean;
}

export function TTLCountdownRing({
  createdAt,
  expiresAt,
  isActive,
  size = 54,
  showLabel = true,
}: TTLCountdownRingProps) {
  const [now, setNow] = useState(Date.now());

  // Tick every second when active
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  const { totalSeconds, remainingSeconds, percent, isExpiringSoon, isExpired, formattedTime } =
    useMemo(() => {
      const createdTime = new Date(createdAt).getTime();
      const expiresTime = new Date(expiresAt).getTime();
      const total = Math.max(1, Math.round((expiresTime - createdTime) / 1000));
      const remaining = Math.max(0, Math.round((expiresTime - now) / 1000));
      const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
      const expiringSoon = remaining > 0 && remaining / total <= 0.15;
      const expired = remaining <= 0 || !isActive;

      // Format time string
      let timeStr = "Expired";
      if (!expired && remaining > 0) {
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = remaining % 60;

        if (hours > 0) {
          timeStr = `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
          timeStr = `${minutes}m ${seconds}s`;
        } else {
          timeStr = `${seconds}s`;
        }
      }

      return {
        totalSeconds: total,
        remainingSeconds: remaining,
        percent: pct,
        isExpiringSoon: expiringSoon,
        isExpired: expired,
        formattedTime: timeStr,
      };
    }, [createdAt, expiresAt, now, isActive]);

  // SVG Geometry
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  // Dynamic color configuration
  const color = useMemo(() => {
    if (isExpired) return { stroke: "#475569", text: "text-slate-500", glow: "none" };
    if (isExpiringSoon)
      return {
        stroke: "#f43f5e",
        text: "text-rose-400",
        glow: "0 0 10px rgba(244, 63, 94, 0.4)",
      };
    if (percent <= 50)
      return {
        stroke: "#f59e0b",
        text: "text-amber-400",
        glow: "0 0 8px rgba(245, 158, 11, 0.3)",
      };
    return {
      stroke: "#10b981",
      text: "text-emerald-400",
      glow: "0 0 10px rgba(16, 185, 129, 0.3)",
    };
  }, [isExpired, isExpiringSoon, percent]);

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="rotate-[-90deg] transform"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
          />
          {/* Animated remaining circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-linear"
            style={{
              filter: isExpiringSoon ? "drop-shadow(0 0 4px rgba(244,63,94,0.6))" : "none",
            }}
          />
        </svg>

        {/* Center icon or percentage */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isExpiringSoon ? (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          ) : isExpired ? (
            <Clock className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <span className={`text-[10px] font-mono font-bold ${color.text} tabular-nums`}>
              {Math.round(percent)}%
            </span>
          )}
        </div>
      </div>

      {/* Label beside ring */}
      {showLabel && (
        <div className="flex flex-col">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
            {isExpired ? "Status" : "Remaining TTL"}
          </span>
          <span
            className={`text-xs font-mono font-bold ${color.text} tabular-nums flex items-center gap-1`}
          >
            {!isExpired && <span className={`w-1.5 h-1.5 rounded-full ${isExpiringSoon ? "bg-rose-400 animate-ping" : "bg-emerald-400 animate-pulse"}`} />}
            {formattedTime}
          </span>
        </div>
      )}
    </div>
  );
}
