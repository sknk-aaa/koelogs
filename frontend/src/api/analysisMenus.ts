const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

import type { AnalysisMenu } from "../types/analysisMenu";

export async function fetchAnalysisMenus(includeArchived = false): Promise<AnalysisMenu[]> {
  const qs = includeArchived ? "?include_archived=true" : "";
  const res = await fetch(`${API_BASE}/api/analysis_menus${qs}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch analysis menus");
  return (json.data ?? []) as AnalysisMenu[];
}

export async function createAnalysisMenu(input: {
  name: string;
  focus_points?: string | null;
  compare_by_scale?: boolean;
  compare_by_tempo?: boolean;
  fixed_scale_type?: string | null;
  fixed_tempo?: number | null;
  selected_metrics?: string[];
}): Promise<AnalysisMenu> {
  const res = await fetch(`${API_BASE}/api/analysis_menus`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(input),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.errors?.join(", ") ?? "Failed to create analysis menu");
  return json.data as AnalysisMenu;
}

export async function updateAnalysisMenu(
  id: number,
  payload: {
    name?: string;
    focus_points?: string | null;
    compare_by_scale?: boolean;
    compare_by_tempo?: boolean;
    fixed_scale_type?: string | null;
    fixed_tempo?: number | null;
    selected_metrics?: string[];
    archived?: boolean;
  }
): Promise<AnalysisMenu> {
  const res = await fetch(`${API_BASE}/api/analysis_menus/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.errors?.join(", ") ?? "Failed to update analysis menu");
  return json.data as AnalysisMenu;
}
