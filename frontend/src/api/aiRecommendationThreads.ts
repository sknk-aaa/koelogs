import type { AiRecommendationThread, AiRecommendationThreadMessage } from "../types/aiRecommendation";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

type ThreadShowResponse = {
  data: {
    recommendation_id: number;
    generated_for_date: string;
    can_post: boolean;
    remaining_messages: number;
    thread: AiRecommendationThread | null;
    messages: AiRecommendationThreadMessage[];
  };
};

type ThreadCreateMessageResponse = {
  data: {
    recommendation_id: number;
    thread: AiRecommendationThread;
    can_post: boolean;
    remaining_messages: number;
    user_message: AiRecommendationThreadMessage;
    assistant_message: AiRecommendationThreadMessage;
  };
};

type ErrorShape = { error?: string; errors?: string[] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function readStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== "string") return undefined;
    out.push(item);
  }
  return out;
}

async function safeJson(res: Response): Promise<unknown | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function extractErrorShape(json: unknown): ErrorShape {
  if (!isRecord(json)) return {};
  return {
    error: readString(json.error),
    errors: readStringArray(json.errors),
  };
}

function isThreadMessage(v: unknown): v is AiRecommendationThreadMessage {
  return (
    isRecord(v) &&
    typeof v.id === "number" &&
    (v.role === "user" || v.role === "assistant") &&
    typeof v.content === "string" &&
    typeof v.created_at === "string"
  );
}

function isThread(v: unknown): v is AiRecommendationThread {
  return (
    isRecord(v) &&
    typeof v.id === "number" &&
    typeof v.generated_for_date === "string" &&
    typeof v.model_name === "string" &&
    typeof v.system_prompt_version === "string" &&
    typeof v.user_prompt_version === "string" &&
    typeof v.created_at === "string"
  );
}

function isThreadShowResponse(v: unknown): v is ThreadShowResponse {
  if (!isRecord(v) || !isRecord(v.data)) return false;
  const data = v.data;
  return (
    typeof data.recommendation_id === "number" &&
    typeof data.generated_for_date === "string" &&
    typeof data.can_post === "boolean" &&
    typeof data.remaining_messages === "number" &&
    (data.thread === null || isThread(data.thread)) &&
    Array.isArray(data.messages) &&
    data.messages.every((m) => isThreadMessage(m))
  );
}

function isThreadCreateMessageResponse(v: unknown): v is ThreadCreateMessageResponse {
  if (!isRecord(v) || !isRecord(v.data)) return false;
  const data = v.data;
  return (
    typeof data.recommendation_id === "number" &&
    isThread(data.thread) &&
    typeof data.can_post === "boolean" &&
    typeof data.remaining_messages === "number" &&
    isThreadMessage(data.user_message) &&
    isThreadMessage(data.assistant_message)
  );
}

export async function fetchAiRecommendationThread(recommendationId: number): Promise<
  | { ok: true; data: ThreadShowResponse["data"] }
  | { ok: false; status: number; errors: string[] }
> {
  const res = await fetch(`${API_BASE}/api/ai_recommendations/${recommendationId}/thread`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  const json = await safeJson(res);

  if (!res.ok) {
    const { error, errors } = extractErrorShape(json);
    return { ok: false, status: res.status, errors: errors ?? (error ? [ error ] : [ `Request failed: ${res.status}` ]) };
  }
  if (!isThreadShowResponse(json)) {
    return { ok: false, status: res.status, errors: [ "Invalid response format" ] };
  }
  return { ok: true, data: json.data };
}

export async function postAiRecommendationThreadMessage(
  recommendationId: number,
  message: string
): Promise<
  | { ok: true; data: ThreadCreateMessageResponse["data"] }
  | { ok: false; status: number; errors: string[] }
> {
  const res = await fetch(`${API_BASE}/api/ai_recommendations/${recommendationId}/thread/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify({ message }),
  });
  const json = await safeJson(res);

  if (!res.ok) {
    const { error, errors } = extractErrorShape(json);
    return { ok: false, status: res.status, errors: errors ?? (error ? [ error ] : [ `Request failed: ${res.status}` ]) };
  }
  if (!isThreadCreateMessageResponse(json)) {
    return { ok: false, status: res.status, errors: [ "Invalid response format" ] };
  }
  return { ok: true, data: json.data };
}
