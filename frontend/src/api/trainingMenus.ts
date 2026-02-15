// frontend/src/api/trainingMenus.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

import type { TrainingMenu } from "../types/trainingMenu";

export async function fetchTrainingMenus(includeArchived = false): Promise<TrainingMenu[]> {
  const qs = includeArchived ? "?include_archived=true" : "";
  const res = await fetch(`${API_BASE}/api/training_menus${qs}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Failed to fetch menus");
  return (json.data ?? []) as TrainingMenu[];
}

export async function createTrainingMenu(input: { name: string; color: string }): Promise<TrainingMenu> {
  const res = await fetch(`${API_BASE}/api/training_menus`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(input),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.errors?.join(", ") ?? "Failed to create menu");
  return json.data as TrainingMenu;
}

export async function updateTrainingMenu(
  id: number,
  payload: { name?: string; color?: string; archived?: boolean }
): Promise<TrainingMenu> {
  const res = await fetch(`${API_BASE}/api/training_menus/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.errors?.join(", ") ?? "Failed to update menu");
  return json.data as TrainingMenu;
}
