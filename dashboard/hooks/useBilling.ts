'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE_URL = process.env.NEXT_PUBLIC_CONTROL_PLANE_URL || 'http://localhost:8000';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface BillingStatus {
  plan: string;
  plan_name: string;
  subscription_status: string;
  billing_period_start: string | null;
  plan_expires_at: string | null;
  signals_used_month: number;
  signals_quota: number | null;
  services_count: number;
  services_quota: number | null;
  seats: number;
}

export interface Plan {
  name: string;
  amount_inr: number;
  signals_quota: number | null;
  services_quota: number | null;
  seats: number;
}

export interface PlansResponse {
  cloud_mode: boolean;
  plans: Record<string, Plan>;
}

interface CreateOrderResponse {
  order_id: string;
  key_id: string;
  amount: number;
  amount_inr: number;
  plan_tier: string;
  plan_name: string;
  currency: string;
}

// ── Razorpay checkout.js global types ─────────────────────────────────────────

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  theme?: { color?: string };
  prefill?: { name?: string; email?: string };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open(): void;
}

// ── Helper: load Razorpay checkout.js ─────────────────────────────────────────

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ── Queries ────────────────────────────────────────────────────────────────────

export const useBillingStatus = () => {
  return useQuery<BillingStatus>({
    queryKey: ['billing', 'status'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/billing/status`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch billing status');
      return res.json();
    },
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
};

export const usePlans = () => {
  return useQuery<PlansResponse>({
    queryKey: ['billing', 'plans'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/billing/plans`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch plans');
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });
};

// ── Mutations ──────────────────────────────────────────────────────────────────

/**
 * Full Razorpay Order payment flow:
 *  1. Creates Order on backend (one-time payment, no autopay)
 *  2. Loads checkout.js
 *  3. Opens Razorpay modal — works with any card/UPI
 *  4. On success, verifies payment with backend
 *  5. Backend sets plan_expires_at = now + 30 days
 *  6. Invalidates billing status so UI refreshes
 */
export const useUpgradePlan = (userInfo?: { name?: string; email?: string }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planTier: 'pro' | 'business') => {
      // Step 1: Create order on backend
      const res = await fetch(`${API_BASE_URL}/api/billing/create-order`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planTier }),
      });
      if (!res.ok) throw new Error('Failed to create payment order');
      const data: CreateOrderResponse = await res.json();

      // Step 2: Load checkout.js
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Failed to load Razorpay checkout.');

      // Step 3: Open modal
      return new Promise<void>((resolve, reject) => {
        const options: RazorpayOptions = {
          key: data.key_id,
          order_id: data.order_id,
          amount: data.amount,
          currency: data.currency,
          name: 'Neural Control',
          description: `${data.plan_name} — 30 days`,
          theme: { color: '#9333ea' },
          prefill: { name: userInfo?.name, email: userInfo?.email },
          handler: async (response) => {
            try {
              // Step 4: Verify payment on backend
              const verifyRes = await fetch(`${API_BASE_URL}/api/billing/verify-payment`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  plan_tier: planTier,
                }),
              });
              if (!verifyRes.ok) throw new Error('Payment verification failed');
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'status'] });
    },
  });
};

/**
 * Cancel the user's plan immediately (downgrade to Free).
 * No autopay means there's nothing to "cancel" with Razorpay — just update our DB.
 */
export const useCancelPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/billing/cancel-plan`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to cancel plan');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'status'] });
    },
  });
};
