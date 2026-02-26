import type { MissionsResponseData } from "../types/missions";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export async function fetchMissions(): Promise<{ data: MissionsResponseData | null; error?: string }> {
  const res = await fetch(`${API_BASE}/api/missions`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const json = (await res.json().catch(() => null)) as { data?: MissionsResponseData; error?: string } | null;
  if (!res.ok) {
    return { data: null, error: json?.error ?? `Request failed: ${res.status}` };
  }

  return { data: json?.data ?? null };
}
