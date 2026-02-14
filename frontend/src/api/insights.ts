// frontend/src/api/insights.ts
import type { InsightsResponse } from "../types/insights";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export async function fetchInsights(days: number = 30): Promise<InsightsResponse> {
  const url = `${API_BASE}/api/insights?days=${encodeURIComponent(String(days))}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  const json = (await res.json().catch(() => null)) as InsightsResponse | null;

  if (!res.ok) {
    const msg =
      (json && "error" in json && typeof json.error === "string" && json.error) ||
      `Request failed: ${res.status}`;
    return { data: null, error: msg };
  }

  if (!json || !("data" in json)) {
    return { data: null, error: "Invalid response format" };
  }

  return json;
}
