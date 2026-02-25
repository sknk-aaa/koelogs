import type {
  AiRecommendation,
  AiRecommendationCreateResponse,
  AiRecommendationShowResponse,
} from "../types/aiRecommendation";
import type { SaveRewards } from "../types/gamification";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

/** ---------- helpers (no any) ---------- */

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
  for (const x of v) {
    if (typeof x !== "string") return undefined;
    out.push(x);
  }
  return out;
}

function extractErrorShape(json: unknown): ErrorShape {
  if (!isRecord(json)) return {};
  return {
    error: readString(json.error),
    errors: readStringArray(json.errors),
  };
}

function isAiRecommendation(v: unknown): v is AiRecommendation {
  // 最小限の実体チェック（必要なら厳格化できる）
  if (!isRecord(v)) return false;

  return (
    typeof v.id === "number" &&
    typeof v.generated_for_date === "string" &&
    typeof v.range_days === "number" &&
    typeof v.recommendation_text === "string" &&
    typeof v.created_at === "string"
  );
}

/** ShowResponse: { data: AiRecommendation } | { data: null } */
function isShowResponse(json: unknown): json is AiRecommendationShowResponse {
  if (!isRecord(json)) return false;
  if (!("data" in json)) return false;

  const d = json.data;
  return d === null || isAiRecommendation(d);
}

/** Create success shape only: { data: AiRecommendation } */
function isCreateSuccessResponse(
  json: unknown
): json is Extract<AiRecommendationCreateResponse, { data: AiRecommendation }> {
  if (!isRecord(json)) return false;
  if (!("data" in json)) return false;
  return isAiRecommendation(json.data);
}

async function safeJson(res: Response): Promise<unknown | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** ---------- API ---------- */

export async function fetchAiRecommendationByDate(
  date: string
): Promise<{
  data: AiRecommendation | null;
  error?: string;
  status?: number;
}> {
  const url = `${API_BASE}/api/ai_recommendations?date=${encodeURIComponent(date)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  const json = await safeJson(res);

  if (!res.ok) {
    const { error } = extractErrorShape(json);
    return {
      data: null,
      error: error ?? `Request failed: ${res.status}`,
      status: res.status,
    };
  }

  if (isShowResponse(json)) {
    return { data: json.data };
  }

  return { data: null, error: "Invalid response format", status: res.status };
}

export async function createAiRecommendation(
  payload?: { range_days?: number; date?: string }
): Promise<
  | { ok: true; data: AiRecommendation; rewards: SaveRewards | null; status: 200 | 201 }
  | { ok: false; status: number; errors: string[] }
> {
  const res = await fetch(`${API_BASE}/api/ai_recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify(payload ?? {}),
  });

  const json = await safeJson(res);

  if (res.ok) {
    if (isCreateSuccessResponse(json)) {
      const rewards =
        isRecord(json) && "rewards" in json ? (json.rewards as SaveRewards | null | undefined) ?? null : null;
      return { ok: true, data: json.data, rewards, status: res.status as 200 | 201 };
    }
    // 200/201なのに data が無い/壊れてる → バグ扱いで返す
    return { ok: false, status: res.status, errors: ["Invalid response format"] };
  }

  if (res.status === 422) {
    const { error, errors } = extractErrorShape(json);
    const out =
      errors && errors.length
        ? errors
        : error
          ? [error]
          : ["Validation failed"];
    return { ok: false, status: 422, errors: out };
  }

  const { error } = extractErrorShape(json);
  return {
    ok: false,
    status: res.status,
    errors: error ? [error] : [`Request failed: ${res.status}`],
  };
}
