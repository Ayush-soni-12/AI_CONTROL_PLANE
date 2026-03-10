"use client";

import { useQuery } from "@tanstack/react-query";
import { AdaptiveTimeoutStatus } from "@/lib/types";

const API_BASE =
  process.env.NEXT_PUBLIC_CONTROL_PLANE_URL || "http://localhost:8000";

export const useAdaptiveTimeout = () => {
  return useQuery<AdaptiveTimeoutStatus[]>({
    queryKey: ["adaptive-timeout-status"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/adaptive-timeout/status`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch adaptive timeout status");
      }
      return res.json();
    },
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
};
