import type { WeeklyLog, WeeklyLogResponse, WeeklyLogSummary } from "../types/weeklyLog";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export async function fetchWeeklyLogByWeekStart(weekStart: string): Promise<WeeklyLogResponse> {
  const url = `${API_BASE}/api/weekly_logs?week_start=${encodeURIComponent(weekStart)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  const json = (await res.json().catch(() => null)) as WeeklyLogResponse | null;

  if (!res.ok) {
    return { data: null, summary: null, error: json?.error ?? `Request failed: ${res.status}` };
  }

  if (!json) {
    return { data: null, summary: null, error: "Response is empty" };
  }

  return json;
}

export type UpsertWeeklyLogInput = {
  week_start: string;
  notes: string | null;
  effect_feedbacks: Array<{ menu_id: number; improvement_tags: string[] }>;
};

export type UpsertWeeklyLogResult =
  | { ok: true; data: WeeklyLog; summary: WeeklyLogSummary }
  | { ok: false; status: number; errors: string[] };

export async function upsertWeeklyLog(input: UpsertWeeklyLogInput): Promise<UpsertWeeklyLogResult> {
  const res = await fetch(`${API_BASE}/api/weekly_logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  const json = (await res.json().catch(() => null)) as
    | { data?: WeeklyLog; summary?: WeeklyLogSummary; errors?: string[]; error?: string }
    | null;

  if (res.ok) {
    if (!json?.data || !json?.summary) return { ok: false, status: 500, errors: ["Response has no data"] };
    return { ok: true, data: json.data, summary: json.summary };
  }

  if (res.status === 422) {
    const errs = json?.errors ?? (json?.error ? [String(json.error)] : []);
    return { ok: false, status: 422, errors: errs.length ? errs : ["Validation failed"] };
  }

  const fallback = json?.error ? [String(json.error)] : [`Request failed: ${res.status}`];
  return { ok: false, status: res.status, errors: fallback };
}
