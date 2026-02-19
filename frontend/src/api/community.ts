const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

import type { CommunityPost, CommunityProfileDetail, CommunityRankings } from "../types/community";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function fetchCommunityPosts(opts?: { mineFirst?: boolean; limit?: number }): Promise<CommunityPost[]> {
  const qs = new URLSearchParams();
  if (opts?.mineFirst) qs.set("mine_first", "true");
  if (opts?.limit && opts.limit > 0) qs.set("limit", String(opts.limit));
  const query = qs.toString();

  const res = await fetch(`${API_BASE}/api/community/posts${query ? `?${query}` : ""}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((isRecord(json) && typeof json.error === "string" && json.error) || "Failed to fetch community posts");
  }
  const data = isRecord(json) && Array.isArray(json.data) ? json.data : [];
  return data as CommunityPost[];
}

export async function fetchFavoriteCommunityPosts(opts?: { limit?: number }): Promise<CommunityPost[]> {
  const qs = new URLSearchParams();
  if (opts?.limit && opts.limit > 0) qs.set("limit", String(opts.limit));
  const query = qs.toString();

  const res = await fetch(`${API_BASE}/api/community/favorites${query ? `?${query}` : ""}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((isRecord(json) && typeof json.error === "string" && json.error) || "Failed to fetch favorites");
  }
  const data = isRecord(json) && Array.isArray(json.data) ? json.data : [];
  return data as CommunityPost[];
}

export async function createCommunityPost(input: {
  training_menu_id: number;
  improvement_tags: string[];
  effect_level: number;
  comment?: string;
  published?: boolean;
}): Promise<CommunityPost> {
  const res = await fetch(`${API_BASE}/api/community/posts`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(input),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const errors =
      (isRecord(json) && Array.isArray(json.errors) && json.errors.filter((v): v is string => typeof v === "string")) ||
      [];
    throw new Error(errors.join(", ") || "Failed to create community post");
  }
  if (!isRecord(json) || !isRecord(json.data)) throw new Error("Unexpected response");
  return json.data as CommunityPost;
}

export async function fetchCommunityProfile(userId: number): Promise<CommunityProfileDetail> {
  const res = await fetch(`${API_BASE}/api/community/profiles/${userId}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((isRecord(json) && typeof json.error === "string" && json.error) || "Failed to fetch profile");
  }
  if (!isRecord(json) || !isRecord(json.data)) throw new Error("Unexpected response");
  return json.data as CommunityProfileDetail;
}

export async function favoriteCommunityPost(postId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/community/posts/${postId}/favorite`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((isRecord(json) && typeof json.error === "string" && json.error) || "Failed to favorite");
  }
}

export async function unfavoriteCommunityPost(postId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/community/posts/${postId}/favorite`, {
    method: "DELETE",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((isRecord(json) && typeof json.error === "string" && json.error) || "Failed to unfavorite");
  }
}

export async function fetchCommunityRankings(): Promise<CommunityRankings> {
  const res = await fetch(`${API_BASE}/api/community/rankings`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((isRecord(json) && typeof json.error === "string" && json.error) || "Failed to fetch rankings");
  }
  if (!isRecord(json) || !isRecord(json.data)) throw new Error("Unexpected response");
  return json.data as CommunityRankings;
}
