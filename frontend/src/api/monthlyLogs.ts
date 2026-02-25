import type { MonthlyLogData, MonthlyLogResponse } from "../types/monthlyLog";
import type { SaveRewards } from "../types/gamification";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export async function fetchMonthlyLog(month: string): Promise<MonthlyLogResponse> {
  const url = `${API_BASE}/api/monthly_logs?month=${encodeURIComponent(month)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  const json = (await res.json().catch(() => null)) as MonthlyLogResponse | null;
  if (!res.ok) {
    return { data: null, error: json?.error ?? `Request failed: ${res.status}` };
  }
  return json ?? { data: null, error: "Response is empty" };
}

export type UpsertMonthlyLogInput = {
  month: string;
  notes: string | null;
};

export type UpsertMonthlyLogResult =
  | {
      ok: true;
      data: Pick<MonthlyLogData, "month" | "month_start" | "notes"> & { id: number; updated_at?: string | null };
      rewards: SaveRewards | null;
    }
  | { ok: false; status: number; errors: string[] };

export async function upsertMonthlyLog(input: UpsertMonthlyLogInput): Promise<UpsertMonthlyLogResult> {
  const res = await fetch(`${API_BASE}/api/monthly_logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  const json = (await res.json().catch(() => null)) as
    | {
        data?: { id: number; month: string; month_start: string; notes: string | null; updated_at?: string | null };
        rewards?: SaveRewards | null;
        errors?: string[];
        error?: string;
      }
    | null;

  if (res.ok) {
    if (!json?.data) return { ok: false, status: 500, errors: [ "Response has no data" ] };
    return { ok: true, data: json.data, rewards: json.rewards ?? null };
  }

  const errs = json?.errors ?? (json?.error ? [ String(json.error) ] : []);
  return { ok: false, status: res.status, errors: errs.length ? errs : [ `Request failed: ${res.status}` ] };
}
