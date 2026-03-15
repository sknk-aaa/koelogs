const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export type BillingCycle = "monthly" | "quarterly";

function extractErrorMessage(json: unknown, fallback: string): string {
  if (json && typeof json === "object") {
    const record = json as { errors?: string[]; error?: string };
    if (Array.isArray(record.errors) && record.errors.length > 0) return record.errors.join(", ");
    if (typeof record.error === "string" && record.error.trim().length > 0) return record.error;
  }

  return fallback;
}

export async function createCheckoutSession(billingCycle: BillingCycle): Promise<string> {
  const res = await fetch(`${API_BASE}/api/billing/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ billing_cycle: billingCycle }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(extractErrorMessage(json, `createCheckoutSession failed: ${res.status}`));
  }

  const url = (json as { data?: { url?: string } } | null)?.data?.url;
  if (!url) throw new Error("決済URLの取得に失敗しました");
  return url;
}

export async function confirmCheckoutSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/billing/checkout/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ session_id: sessionId }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(extractErrorMessage(json, `confirmCheckoutSession failed: ${res.status}`));
  }
}

export async function createBillingPortalSession(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/billing/portal`, {
    method: "POST",
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(extractErrorMessage(json, `createBillingPortalSession failed: ${res.status}`));
  }

  const url = (json as { data?: { url?: string } } | null)?.data?.url;
  if (!url) throw new Error("契約管理URLの取得に失敗しました");
  return url;
}

export async function refreshBillingSubscription(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/billing/refresh`, {
    method: "POST",
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(extractErrorMessage(json, `refreshBillingSubscription failed: ${res.status}`));
  }
}
