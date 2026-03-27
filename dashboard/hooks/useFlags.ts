"use client";

import { useState, useEffect, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_CONTROL_PLANE_URL || "http://localhost:8000";

export interface FeatureFlag {
  id: number;
  name: string;
  service_name: string;
  tenant_id: string;
  rollout_percent: number;
  status: "enabled" | "disabled" | "auto-disabled";
  updated_by: string;
  updated_at: string;
  created_at: string;
}

export interface FlagAuditLogEntry {
  id: number;
  flag_name: string;
  service_name: string;
  old_rollout: number;
  new_rollout: number;
  changed_by: string;
  reason: string | null;
  trace_id: string | null;
  created_at: string;
}

export function useFlags(serviceName: string) {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    if (!serviceName) return;
    try {
      const res = await fetch(`${API_BASE}/api/flags/${encodeURIComponent(serviceName)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFlags(data.flags || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [serviceName]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const updateFlag = useCallback(
    async (flagName: string, rolloutPercent: number, reason?: string) => {
      try {
        const res = await fetch(
          `${API_BASE}/api/flags/${encodeURIComponent(serviceName)}/${encodeURIComponent(flagName)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              rollout_percent: rolloutPercent,
              status: rolloutPercent === 0 ? "disabled" : "enabled",
              reason: reason || "Manual dashboard update",
            }),
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const updated: FeatureFlag = await res.json();
        setFlags((prev) =>
          prev.map((f) => (f.name === flagName ? updated : f))
        );
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    },
    [serviceName]
  );

  const createFlag = useCallback(
    async (name: string, rolloutPercent: number) => {
      try {
        const res = await fetch(`${API_BASE}/api/flags`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name,
            service_name: serviceName,
            rollout_percent: rolloutPercent,
            status: rolloutPercent > 0 ? "enabled" : "disabled",
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const created: FeatureFlag = await res.json();
        setFlags((prev) => [...prev, created]);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    },
    [serviceName]
  );

  return { flags, isLoading, error, updateFlag, createFlag, refetch: fetchFlags };
}

export function useFlagAuditLog(serviceName: string, flagName?: string) {
  const [logs, setLogs] = useState<FlagAuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!serviceName) return;
    const params = flagName ? `?flag_name=${encodeURIComponent(flagName)}` : "";
    fetch(`${API_BASE}/api/flags/${encodeURIComponent(serviceName)}/audit${params}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => setLogs(d.logs || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [serviceName, flagName]);

  return { logs, isLoading };
}
