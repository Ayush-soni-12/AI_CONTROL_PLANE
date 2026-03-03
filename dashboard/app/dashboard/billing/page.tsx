"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCheckAuth } from "@/hooks/useSignals";
import { useBillingStatus, useUpgradePlan } from "@/hooks/useBilling";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import {
  CreditCard,
  Zap,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Server,
  Activity,
} from "lucide-react";
import type { BillingStatus } from "@/hooks/useBilling";

// ── Sub-components ─────────────────────────────────────────────────────────────

function UsageBar({
  used,
  quota,
  label,
  icon: Icon,
}: {
  used?: number | null;
  quota?: number | null;
  label: string;
  icon: React.ElementType;
}) {
  const safeUsed = used ?? 0;
  const isUnlimited = quota === null;
  const safeQuota = quota ?? 0;

  const exactPct = isUnlimited
    ? 0
    : Math.min((safeUsed / (safeQuota || 1)) * 100, 100);
  // Give it a minimum of 1% if there's *any* usage, so it's not invisible at 0.03%
  const pct = safeUsed > 0 && exactPct < 1 ? 1 : exactPct;
  const isWarning = !isUnlimited && exactPct >= 80;
  const isDanger = !isUnlimited && exactPct >= 100;

  return (
    <div className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800/60 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 shrink-0">
            <Icon className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-sm font-medium text-gray-300 line-clamp-1">
            {label}
          </span>
        </div>
        <span className="text-sm font-mono text-gray-400 sm:text-right">
          {safeUsed.toLocaleString()} /{" "}
          {isUnlimited ? "∞" : safeQuota.toLocaleString()}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
        {isUnlimited ? (
          <div className="h-full w-full bg-linear-to-r from-purple-500 to-pink-500 opacity-40" />
        ) : (
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isDanger
                ? "bg-linear-to-r from-red-500 to-red-400"
                : isWarning
                  ? "bg-linear-to-r from-yellow-500 to-orange-400"
                  : "bg-linear-to-r from-purple-500 to-pink-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      {isUnlimited && (
        <p className="text-xs text-purple-400 font-medium">
          Unlimited on your plan
        </p>
      )}
      {isDanger && (
        <p className="text-xs text-red-400 font-medium">
          Quota reached — upgrade to continue.
        </p>
      )}
      {isWarning && !isDanger && (
        <p className="text-xs text-yellow-400 font-medium">
          {Math.round(100 - exactPct)}% remaining — consider upgrading.
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    { label: string; className: string; Icon: React.ElementType }
  > = {
    active: {
      label: "Active",
      className: "bg-green-500/10 border-green-500/30 text-green-400",
      Icon: CheckCircle2,
    },
    authenticated: {
      label: "Authenticated",
      className: "bg-blue-500/10 border-blue-500/30 text-blue-400",
      Icon: Clock,
    },
    created: {
      label: "Pending",
      className: "bg-gray-500/10 border-gray-500/30 text-gray-400",
      Icon: Clock,
    },
    past_due: {
      label: "Past Due",
      className: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
      Icon: AlertCircle,
    },
  };
  const entry = map[status] ?? map["active"];
  const { label, className, Icon } = entry;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${className}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

const PLAN_DISPLAY: Record<string, { label: string; gradient: string }> = {
  free: { label: "Free", gradient: "from-gray-500 to-gray-400" },
  pro: { label: "Pro", gradient: "from-purple-500 to-pink-500" },
  business: { label: "Business", gradient: "from-yellow-500 to-orange-400" },
};

// ── Plan Card ──────────────────────────────────────────────────────────────────

interface PlanCardProps {
  billing: BillingStatus | undefined;
  userName?: string;
  userEmail?: string;
}

function PlanCard({ billing, userName, userEmail }: PlanCardProps) {
  const upgrade = useUpgradePlan({ name: userName, email: userEmail });

  const planKey = billing?.plan ?? "free";
  const planDisplay = PLAN_DISPLAY[planKey] ?? PLAN_DISPLAY.free;

  return (
    <div className="lg:col-span-1 p-6 rounded-2xl bg-gray-900/60 border border-gray-800/60 flex flex-col gap-4">
      <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
        Current Plan
      </p>

      <div>
        <h2
          className={`text-4xl font-black bg-linear-to-r ${planDisplay.gradient} bg-clip-text text-transparent`}
        >
          {planDisplay.label}
        </h2>
        {billing && planKey !== "free" && (
          <div className="mt-2">
            <StatusBadge status={billing.subscription_status} />
          </div>
        )}
      </div>

      {billing?.plan_expires_at && (
        <p className="text-xs text-gray-500">
          Active until{" "}
          {new Date(billing.plan_expires_at).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      )}

      {/* Error message */}
      {upgrade.isError && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {upgrade.error instanceof Error
            ? upgrade.error.message
            : "Payment failed. Please try again."}
        </p>
      )}

      {/* Success message */}
      {upgrade.isSuccess && (
        <p className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
          ✅ Plan upgraded successfully!
        </p>
      )}

      <div className="mt-auto space-y-3">
        {planKey === "free" && (
          <>
            <button
              onClick={() => upgrade.mutate("pro")}
              disabled={upgrade.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
            >
              <Zap className="w-4 h-4" />
              {upgrade.isPending && upgrade.variables === "pro"
                ? "Opening checkout..."
                : "Upgrade to Pro"}
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => upgrade.mutate("business")}
              disabled={upgrade.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-linear-to-r from-yellow-600 to-orange-500 hover:from-yellow-500 hover:to-orange-400 text-white font-semibold text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/20"
            >
              <Zap className="w-4 h-4" />
              {upgrade.isPending && upgrade.variables === "business"
                ? "Opening checkout..."
                : "Upgrade to Business"}
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </>
        )}

        {planKey === "pro" && (
          <button
            onClick={() => upgrade.mutate("business")}
            disabled={upgrade.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-linear-to-r from-yellow-600 to-orange-500 hover:from-yellow-500 hover:to-orange-400 text-white font-semibold text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Zap className="w-4 h-4" />
            {upgrade.isPending && upgrade.variables === "business"
              ? "Opening checkout..."
              : "Upgrade to Business"}
            <ArrowUpRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const router = useRouter();
  const { data: user, isLoading: isAuthLoading } = useCheckAuth();
  const { data: billing, isLoading: isBillingLoading } = useBillingStatus();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_IS_CLOUD_MODE !== "true") {
      router.replace("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isAuthLoading, router]);

  if (isAuthLoading || isBillingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-purple-950/5 to-background">
        <div className="text-center">
          <div className="inline-block p-4 rounded-2xl bg-purple-500/10 mb-4">
            <CreditCard className="w-12 h-12 text-purple-400 animate-pulse" />
          </div>
          <p className="text-gray-400 text-lg">Loading billing...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const planKey = billing?.plan ?? "free";

  return (
    <>
      <DashboardSidebar />
      <div className="2xl:ml-64 min-h-screen p-8 bg-linear-to-br from-background via-purple-950/5 to-background">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 mt-12 2xl:mt-0">
            <div className="p-3 rounded-xl bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 w-max">
              <CreditCard className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-linear-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                Billing &amp; Plan
              </h1>
              <p className="text-gray-400 mt-1">
                Manage your subscription and usage
              </p>
            </div>
          </div>

          <div className="h-px w-full bg-linear-to-r from-purple-500/50 via-pink-500/50 to-transparent mb-8" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <PlanCard
              billing={billing}
              userName={(user as { name?: string }).name}
              userEmail={(user as { email?: string }).email}
            />

            {/* Usage */}
            <div className="lg:col-span-2 space-y-4">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
                Usage This Month
              </p>

              {billing ? (
                <>
                  <UsageBar
                    used={billing.signals_used_month}
                    quota={billing.signals_quota}
                    label="Signals"
                    icon={Activity}
                  />
                  <UsageBar
                    used={billing.services_count}
                    quota={billing.services_quota}
                    label="Monitored Services"
                    icon={Server}
                  />
                </>
              ) : (
                <div className="space-y-4">
                  <div className="h-24 rounded-2xl bg-gray-900/40 border border-gray-800/40 animate-pulse" />
                  <div className="h-24 rounded-2xl bg-gray-900/40 border border-gray-800/40 animate-pulse" />
                </div>
              )}

              {planKey === "free" && (
                <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Zap className="w-5 h-5 text-purple-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-300">
                      Need more capacity?
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="text-purple-400 font-semibold">Pro</span>{" "}
                      — 500K signals &amp; 10 services at ₹2,400/mo.{" "}
                      <span className="text-yellow-500 font-semibold">
                        Business
                      </span>{" "}
                      — unlimited signals &amp; services at ₹8,200/mo.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
