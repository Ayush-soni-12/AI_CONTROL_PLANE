"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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

export function isSameFlag(a: FeatureFlag, b: FeatureFlag): boolean {
  if (a.id && b.id && String(a.id) === String(b.id)) return true;
  if (
    a.name &&
    b.name &&
    a.name.trim().toLowerCase() === b.name.trim().toLowerCase() &&
    (!a.service_name ||
      !b.service_name ||
      a.service_name.trim().toLowerCase() === b.service_name.trim().toLowerCase())
  ) {
    return true;
  }
  return false;
}

function upsertFlag(prev: FeatureFlag[], incoming: FeatureFlag): FeatureFlag[] {
  const filtered = prev.filter((f) => !isSameFlag(f, incoming));
  return [incoming, ...filtered];
}

export function useFlags(serviceName: string) {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const cleanService = serviceName.trim() || "demo-service";

  const fetchFlags = useCallback(async () => {
    if (!cleanService) return;
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/api/flags/${encodeURIComponent(cleanService)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to load flags: HTTP ${res.status}`);
      const data = await res.json();
      const rawFlags: FeatureFlag[] = data.flags || [];
      const seen = new Set<string>();
      const deduped: FeatureFlag[] = [];
      for (const f of rawFlags) {
        const k = `${f.id || ""}:${f.service_name?.trim().toLowerCase() || ""}:${f.name?.trim().toLowerCase() || ""}`;
        if (!seen.has(k)) {
          seen.add(k);
          deduped.push(f);
        }
      }
      setFlags(deduped);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [cleanService]);

  // Initial fetch on service change
  useEffect(() => {
    setIsLoading(true);
    fetchFlags();
  }, [fetchFlags]);

  // Live SSE stream for real-time multi-operator & AI auto-rollback updates
  useEffect(() => {
    if (!cleanService) return;

    try {
      const sseUrl = `${API_BASE}/api/flags/stream/${encodeURIComponent(cleanService)}`;
      const es = new EventSource(sseUrl, { withCredentials: true });
      eventSourceRef.current = es;

      es.addEventListener("flag_update", (event) => {
        try {
          const updatedFlag: FeatureFlag = JSON.parse(event.data);
          if (updatedFlag.status === ("deleted" as unknown)) {
            setFlags((prev) => prev.filter((f) => !isSameFlag(f, updatedFlag)));
          } else {
            setFlags((prev) => upsertFlag(prev, updatedFlag));
          }
        } catch (err) {
          console.error("Failed to parse SSE flag update:", err);
        }
      });

      es.onerror = () => {
        es.close();
      };

      return () => {
        es.close();
        eventSourceRef.current = null;
      };
    } catch (err) {
      console.warn("SSE stream unavailable for flags:", err);
    }
  }, [cleanService]);

  const updateFlag = useCallback(
    async (flagName: string, rolloutPercent: number, reason?: string): Promise<boolean> => {
      const previousFlags = [...flags];
      const trimmedName = flagName.trim().toLowerCase();

      // Optimistic update
      setFlags((prev) =>
        prev.map((f) =>
          f.name.trim().toLowerCase() === trimmedName
            ? {
                ...f,
                rollout_percent: rolloutPercent,
                status: rolloutPercent === 0 ? "disabled" : "enabled",
                updated_by: "Operator",
                updated_at: new Date().toISOString(),
              }
            : f
        )
      );

      try {
        const res = await fetch(
          `${API_BASE}/api/flags/${encodeURIComponent(cleanService)}/${encodeURIComponent(flagName.trim())}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              rollout_percent: rolloutPercent,
              status: rolloutPercent === 0 ? "disabled" : "enabled",
              reason: reason || "Manual canary adjustment",
            }),
          }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const updated: FeatureFlag = await res.json();
        setFlags((prev) => upsertFlag(prev, updated));
        return true;
      } catch (e: unknown) {
        // Rollback on failure
        setFlags(previousFlags);
        setError(e instanceof Error ? e.message : "Failed to update feature flag");
        return false;
      }
    },
    [cleanService, flags]
  );

  const killFlag = useCallback(
    async (flagName: string): Promise<boolean> => {
      return updateFlag(flagName, 0, "Emergency operator kill switch");
    },
    [updateFlag]
  );

  const createFlag = useCallback(
    async (name: string, rolloutPercent: number, targetService?: string): Promise<FeatureFlag | null> => {
      const sName = targetService?.trim() || cleanService;
      try {
        const res = await fetch(`${API_BASE}/api/flags`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: name.trim(),
            service_name: sName,
            rollout_percent: rolloutPercent,
            status: rolloutPercent > 0 ? "enabled" : "disabled",
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `HTTP ${res.status}`);
        }

        const created: FeatureFlag = await res.json();
        if (sName.toLowerCase() === cleanService.toLowerCase()) {
          setFlags((prev) => upsertFlag(prev, created));
        }
        return created;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to create feature flag");
        return null;
      }
    },
    [cleanService]
  );

  return {
    flags,
    isLoading,
    error,
    updateFlag,
    killFlag,
    createFlag,
    refetch: fetchFlags,
  };
}

export function useFlagAuditLog(serviceName: string, flagName?: string) {
  const [logs, setLogs] = useState<FlagAuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const cleanService = serviceName.trim() || "demo-service";

  const fetchAudit = useCallback(async () => {
    if (!cleanService) return;
    setIsLoading(true);
    try {
      const params = flagName ? `?flag_name=${encodeURIComponent(flagName)}` : "";
      const res = await fetch(
        `${API_BASE}/api/flags/${encodeURIComponent(cleanService)}/audit${params}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const d = await res.json();
        setLogs(d.logs || []);
      }
    } catch {
      // Graceful fallback on audit fetch error
    } finally {
      setIsLoading(false);
    }
  }, [cleanService, flagName]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  return { logs, isLoading, refetch: fetchAudit };
}

export function useFlagServices() {
  const [services, setServices] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/flags/meta/services`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
      }
    } catch {
      // Fallback on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return { services, isLoading, refetch: fetchServices };
}

