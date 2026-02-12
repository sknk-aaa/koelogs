import type { TrainingLogResponse } from "../types/trainingLog";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ""; 

export async function fetchTrainingLogByDate(date: string): Promise<TrainingLogResponse> {
  const url = `${API_BASE}/api/training_logs?date=${encodeURIComponent(date)}`;

  const res = await fetch(url, {
    headers: { "Accept": "application/json" },
  });


  const json = (await res.json().catch(() => null)) as TrainingLogResponse | null;

  if (!res.ok) {
    return { data: null, error: json?.error ?? `Request failed: ${res.status}` };
  }

  return json ?? { data: null };
}