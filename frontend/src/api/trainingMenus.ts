const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export type TrainingMenu = {
  id: number;
  name: string;
  archived: boolean;
  created_at: string;
};

export async function fetchTrainingMenus(): Promise<TrainingMenu[]> {
  const res = await fetch(`${API_BASE}/api/training_menus`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.error ?? "Failed to fetch menus");
  }

  return json.data ?? [];
}

export async function createTrainingMenu(name: string): Promise<TrainingMenu> {
  const res = await fetch(`${API_BASE}/api/training_menus`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ name }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.errors?.join(", ") ?? "Failed to create menu");
  }

  return json.data;
}

export async function updateTrainingMenu(
  id: number,
  payload: { name?: string; archived?: boolean }
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

  if (!res.ok) {
    throw new Error(json?.errors?.join(", ") ?? "Failed to update menu");
  }

  return json.data;
}
