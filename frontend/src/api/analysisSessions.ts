const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

import type { AnalysisSession } from "../types/analysisSession";

export type AnalysisSessionsQuery = {
  analysis_menu_id?: number;
  days?: number;
  q?: string;
  tempo?: number;
  sort_by?: "created_at" | "pitch_stability_score" | "voice_consistency_score" | "range_semitones";
  sort_dir?: "asc" | "desc";
  page?: number;
  per_page?: number;
};

export type AnalysisSessionsPage = {
  data: AnalysisSession[];
  meta: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
  };
};

export async function fetchAnalysisSessions(analysisMenuId?: number): Promise<AnalysisSession[]> {
  const params = new URLSearchParams();
  params.set("per_page", "50");
  if (analysisMenuId) params.set("analysis_menu_id", String(analysisMenuId));
  const qs = params.toString();
  const res = await fetch(`${API_BASE}/api/analysis_sessions${qs ? `?${qs}` : ""}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch analysis sessions");
  return (json.data ?? []) as AnalysisSession[];
}

export async function fetchAnalysisSessionsPage(query: AnalysisSessionsQuery): Promise<AnalysisSessionsPage> {
  const params = new URLSearchParams();
  if (query.analysis_menu_id) params.set("analysis_menu_id", String(query.analysis_menu_id));
  if (query.days) params.set("days", String(query.days));
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.tempo) params.set("tempo", String(query.tempo));
  if (query.sort_by) params.set("sort_by", query.sort_by);
  if (query.sort_dir) params.set("sort_dir", query.sort_dir);
  if (query.page) params.set("page", String(query.page));
  if (query.per_page) params.set("per_page", String(query.per_page));
  const qs = params.toString();
  const res = await fetch(`${API_BASE}/api/analysis_sessions${qs ? `?${qs}` : ""}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch analysis sessions");
  return {
    data: (json.data ?? []) as AnalysisSession[],
    meta: {
      page: Number(json?.meta?.page ?? 1),
      per_page: Number(json?.meta?.per_page ?? 20),
      total_count: Number(json?.meta?.total_count ?? 0),
      total_pages: Number(json?.meta?.total_pages ?? 0),
    },
  };
}

export async function createAnalysisSession(input: {
  analysis_menu_id: number;
  duration_sec: number;
  peak_note?: string | null;
  pitch_stability_score?: number | null;
  voice_consistency_score?: number | null;
  range_semitones?: number | null;
  recorded_scale_type?: string | null;
  recorded_tempo?: number | null;
  raw_metrics?: Record<string, unknown>;
}): Promise<AnalysisSession> {
  const res = await fetch(`${API_BASE}/api/analysis_sessions`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(input),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.errors?.join(", ") ?? "Failed to create analysis session");
  return json.data as AnalysisSession;
}

export async function deleteAnalysisSession(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/analysis_sessions/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.errors?.join(", ") ?? "Failed to delete analysis session");
  }
}

export async function uploadAnalysisSessionAudio(id: number, file: Blob, filename = "recording.webm"): Promise<AnalysisSession> {
  const form = new FormData();
  form.append("audio", file, filename);
  const res = await fetch(`${API_BASE}/api/analysis_sessions/${id}/upload_audio`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
    body: form,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.errors?.join(", ") ?? "Failed to upload analysis audio");
  return json.data as AnalysisSession;
}
