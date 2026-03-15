const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

import type {
  CommunityTopicCard,
  CommunityTopicCategory,
  CommunityTopicDetail,
  CommunityTopicSort,
} from "../types/communityTopics";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function fetchCommunityTopics(opts?: {
  sort?: CommunityTopicSort;
  category?: CommunityTopicCategory | "all";
  page?: number;
  per?: number;
}): Promise<{ items: CommunityTopicCard[]; nextPage: number | null }> {
  const qs = new URLSearchParams();
  if (opts?.sort) qs.set("sort", opts.sort);
  if (opts?.category) qs.set("category", opts.category);
  if (opts?.page) qs.set("page", String(opts.page));
  if (opts?.per) qs.set("per", String(opts.per));
  const query = qs.toString();

  const res = await fetch(`${API_BASE}/api/community/topics${query ? `?${query}` : ""}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((isRecord(json) && typeof json.error === "string" && json.error) || "Failed to fetch community topics");
  }
  const data = isRecord(json) && Array.isArray(json.data) ? json.data : [];
  const nextPage = isRecord(json) && typeof json.next_page === "number" ? json.next_page : null;
  return { items: data as CommunityTopicCard[], nextPage };
}

export async function fetchCommunityTopic(topicId: number): Promise<CommunityTopicDetail> {
  const res = await fetch(`${API_BASE}/api/community/topics/${topicId}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((isRecord(json) && typeof json.error === "string" && json.error) || "Failed to fetch community topic");
  }
  if (!isRecord(json) || !isRecord(json.data)) throw new Error("Unexpected response");
  return json.data as CommunityTopicDetail;
}

export async function createCommunityTopic(input: {
  category: CommunityTopicCategory;
  title: string;
  body: string;
}): Promise<CommunityTopicCard> {
  const res = await fetch(`${API_BASE}/api/community/topics`, {
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
    const errors = (isRecord(json) && Array.isArray(json.errors) ? json.errors.filter((v): v is string => typeof v === "string") : []);
    throw new Error(errors.join(", ") || "Failed to create community topic");
  }
  if (!isRecord(json) || !isRecord(json.data)) throw new Error("Unexpected response");
  return json.data as CommunityTopicCard;
}

export async function updateCommunityTopic(
  topicId: number,
  input: { category: CommunityTopicCategory; title: string; body: string }
): Promise<CommunityTopicCard> {
  const res = await fetch(`${API_BASE}/api/community/topics/${topicId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(input),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const errors = (isRecord(json) && Array.isArray(json.errors) ? json.errors.filter((v): v is string => typeof v === "string") : []);
    throw new Error(errors.join(", ") || "Failed to update community topic");
  }
  if (!isRecord(json) || !isRecord(json.data)) throw new Error("Unexpected response");
  return json.data as CommunityTopicCard;
}

export async function deleteCommunityTopic(topicId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/community/topics/${topicId}`, {
    method: "DELETE",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((isRecord(json) && typeof json.error === "string" && json.error) || "Failed to delete community topic");
  }
}

export async function likeCommunityTopic(topicId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/community/topics/${topicId}/like`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((isRecord(json) && typeof json.error === "string" && json.error) || "Failed to like community topic");
  }
}

export async function unlikeCommunityTopic(topicId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/community/topics/${topicId}/like`, {
    method: "DELETE",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((isRecord(json) && typeof json.error === "string" && json.error) || "Failed to unlike community topic");
  }
}

export async function createCommunityTopicComment(input: {
  topicId: number;
  body: string;
  parentId?: number | null;
}): Promise<void> {
  const res = await fetch(`${API_BASE}/api/community/topics/${input.topicId}/comments`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      body: input.body,
      parent_id: input.parentId ?? null,
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const errors = (isRecord(json) && Array.isArray(json.errors) ? json.errors.filter((v): v is string => typeof v === "string") : []);
    throw new Error(errors.join(", ") || "Failed to create comment");
  }
}

export async function deleteCommunityTopicComment(topicId: number, commentId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/community/topics/${topicId}/comments/${commentId}`, {
    method: "DELETE",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((isRecord(json) && typeof json.error === "string" && json.error) || "Failed to delete comment");
  }
}
