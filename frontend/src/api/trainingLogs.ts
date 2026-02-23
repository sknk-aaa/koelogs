// frontend/src/api/trainingLogs.ts
import type {
  TrainingLog,
  TrainingLogMonthResponse,
  TrainingLogResponse,
} from "../types/trainingLog";
import type { SaveRewards } from "../types/gamification";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export async function fetchTrainingLogByDate(date: string): Promise<TrainingLogResponse> {
  const url = `${API_BASE}/api/training_logs?date=${encodeURIComponent(date)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  const json = (await res.json().catch(() => null)) as TrainingLogResponse | null;

  if (!res.ok) {
    return { data: null, error: json?.error ?? `Request failed: ${res.status}` };
  }
  return json ?? { data: null };
}

export async function fetchTrainingLogsByMonth(month: string): Promise<TrainingLogMonthResponse> {
  const url = `${API_BASE}/api/training_logs?month=${encodeURIComponent(month)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  const json = (await res.json().catch(() => null)) as TrainingLogMonthResponse | null;

  if (!res.ok) {
    return { data: null, error: json?.error ?? `Request failed: ${res.status}` };
  }
  return json ?? { data: [] };
}

export type UpsertTrainingLogInput = {
  practiced_on: string; // YYYY-MM-DD
  duration_min: number | null;
  menu_ids: number[]; // ✅ menus(string[]) -> menu_ids(number[])
  notes: string | null;
  effect_feedbacks: Array<{ menu_id: number; improvement_tags: string[] }>;
};

export type UpsertTrainingLogResult =
  | { ok: true; data: TrainingLog; rewards: SaveRewards | null }
  | { ok: false; status: number; errors: string[] };

export async function upsertTrainingLog(input: UpsertTrainingLogInput): Promise<UpsertTrainingLogResult> {
  const res = await fetch(`${API_BASE}/api/training_logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  const json = (await res.json().catch(() => null)) as
    | { data?: TrainingLog; rewards?: SaveRewards | null; errors?: string[]; error?: string }
    | null;

  if (res.ok) {
    if (!json?.data) return { ok: false, status: 500, errors: ["Response has no data"] };
    return { ok: true, data: json.data, rewards: json.rewards ?? null };
  }

  if (res.status === 422) {
    const errs = json?.errors ?? (json?.error ? [String(json.error)] : []);
    return { ok: false, status: 422, errors: errs.length ? errs : ["Validation failed"] };
  }

  const fallback = json?.error ? [String(json.error)] : [`Request failed: ${res.status}`];
  return { ok: false, status: res.status, errors: fallback };
}
