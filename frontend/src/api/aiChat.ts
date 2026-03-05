import type { AiChatMessage, AiChatProject, AiChatThread } from "../types/aiChat";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

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

function isProject(v: unknown): v is AiChatProject {
  return (
    isRecord(v) &&
    typeof v.id === "number" &&
    typeof v.name === "string" &&
    typeof v.created_at === "string" &&
    typeof v.updated_at === "string"
  );
}

function isThread(v: unknown): v is AiChatThread {
  return (
    isRecord(v) &&
    typeof v.id === "number" &&
    (typeof v.project_id === "number" || v.project_id === null) &&
    (typeof v.project_name === "string" || v.project_name === null) &&
    typeof v.title === "string" &&
    typeof v.model_name === "string" &&
    typeof v.system_prompt_version === "string" &&
    typeof v.user_prompt_version === "string" &&
    (v.source_kind === "ai_recommendation" || v.source_kind === null) &&
    (typeof v.source_date === "string" || v.source_date === null) &&
    typeof v.last_message_at === "string" &&
    typeof v.created_at === "string"
  );
}

function isMessage(v: unknown): v is AiChatMessage {
  return (
    isRecord(v) &&
    typeof v.id === "number" &&
    (v.role === "user" || v.role === "assistant") &&
    typeof v.content === "string" &&
    typeof v.created_at === "string"
  );
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

function parseErrors(json: unknown, status: number): { ok: false; status: number; errors: string[] } {
  const { error, errors } = extractErrorShape(json);
  return { ok: false, status, errors: errors ?? (error ? [error] : [`Request failed: ${status}`]) };
}

export async function fetchAiChatProjects(): Promise<
  | { ok: true; data: AiChatProject[] }
  | { ok: false; status: number; errors: string[] }
> {
  const res = await fetch(`${API_BASE}/api/ai_chat/projects`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  const json = await safeJson(res);
  if (!res.ok) return parseErrors(json, res.status);
  if (!isRecord(json) || !Array.isArray(json.data) || !json.data.every((v) => isProject(v))) {
    return { ok: false, status: res.status, errors: ["Invalid response format"] };
  }
  return { ok: true, data: json.data };
}

export async function createAiChatProject(name: string): Promise<
  | { ok: true; data: AiChatProject }
  | { ok: false; status: number; errors: string[] }
> {
  const res = await fetch(`${API_BASE}/api/ai_chat/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify({ name }),
  });
  const json = await safeJson(res);
  if (!res.ok) return parseErrors(json, res.status);
  if (!isRecord(json) || !isProject(json.data)) {
    return { ok: false, status: res.status, errors: ["Invalid response format"] };
  }
  return { ok: true, data: json.data };
}

export async function updateAiChatProject(projectId: number, name: string): Promise<
  | { ok: true; data: AiChatProject }
  | { ok: false; status: number; errors: string[] }
> {
  const res = await fetch(`${API_BASE}/api/ai_chat/projects/${projectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify({ name }),
  });
  const json = await safeJson(res);
  if (!res.ok) return parseErrors(json, res.status);
  if (!isRecord(json) || !isProject(json.data)) {
    return { ok: false, status: res.status, errors: ["Invalid response format"] };
  }
  return { ok: true, data: json.data };
}

export async function deleteAiChatProject(projectId: number): Promise<
  | { ok: true; data: { id: number } }
  | { ok: false; status: number; errors: string[] }
> {
  const res = await fetch(`${API_BASE}/api/ai_chat/projects/${projectId}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  const json = await safeJson(res);
  if (!res.ok) return parseErrors(json, res.status);
  if (!isRecord(json) || !isRecord(json.data) || typeof json.data.id !== "number") {
    return { ok: false, status: res.status, errors: ["Invalid response format"] };
  }
  return { ok: true, data: { id: json.data.id } };
}

export async function fetchAiChatThreads(projectId?: number | "none"): Promise<
  | { ok: true; data: AiChatThread[] }
  | { ok: false; status: number; errors: string[] }
> {
  const params = new URLSearchParams();
  if (projectId === "none") params.set("project_id", "none");
  else if (typeof projectId === "number") params.set("project_id", String(projectId));

  const suffix = params.toString();
  const res = await fetch(`${API_BASE}/api/ai_chat/threads${suffix ? `?${suffix}` : ""}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  const json = await safeJson(res);
  if (!res.ok) return parseErrors(json, res.status);
  if (!isRecord(json) || !Array.isArray(json.data) || !json.data.every((v) => isThread(v))) {
    return { ok: false, status: res.status, errors: ["Invalid response format"] };
  }
  return { ok: true, data: json.data };
}

export async function createAiChatThread(payload?: {
  project_id?: number | null;
  title?: string;
  seed_assistant_message?: string;
  source_kind?: "ai_recommendation";
  source_date?: string;
}): Promise<
  | { ok: true; data: AiChatThread }
  | { ok: false; status: number; errors: string[] }
> {
  const res = await fetch(`${API_BASE}/api/ai_chat/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify(payload ?? {}),
  });
  const json = await safeJson(res);
  if (!res.ok) return parseErrors(json, res.status);
  if (!isRecord(json) || !isThread(json.data)) {
    return { ok: false, status: res.status, errors: ["Invalid response format"] };
  }
  return { ok: true, data: json.data };
}

export async function fetchAiChatThread(threadId: number): Promise<
  | { ok: true; data: { thread: AiChatThread; messages: AiChatMessage[] } }
  | { ok: false; status: number; errors: string[] }
> {
  const res = await fetch(`${API_BASE}/api/ai_chat/threads/${threadId}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  const json = await safeJson(res);
  if (!res.ok) return parseErrors(json, res.status);
  if (
    !isRecord(json) ||
    !isRecord(json.data) ||
    !isThread(json.data.thread) ||
    !Array.isArray(json.data.messages) ||
    !json.data.messages.every((v) => isMessage(v))
  ) {
    return { ok: false, status: res.status, errors: ["Invalid response format"] };
  }
  return { ok: true, data: { thread: json.data.thread, messages: json.data.messages } };
}

export async function updateAiChatThread(
  threadId: number,
  payload: { title?: string; project_id?: number | null }
): Promise<
  | { ok: true; data: AiChatThread }
  | { ok: false; status: number; errors: string[] }
> {
  const res = await fetch(`${API_BASE}/api/ai_chat/threads/${threadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const json = await safeJson(res);
  if (!res.ok) return parseErrors(json, res.status);
  if (!isRecord(json) || !isThread(json.data)) {
    return { ok: false, status: res.status, errors: ["Invalid response format"] };
  }
  return { ok: true, data: json.data };
}

export async function deleteAiChatThread(threadId: number): Promise<
  | { ok: true; data: { id: number } }
  | { ok: false; status: number; errors: string[] }
> {
  const res = await fetch(`${API_BASE}/api/ai_chat/threads/${threadId}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  const json = await safeJson(res);
  if (!res.ok) return parseErrors(json, res.status);
  if (!isRecord(json) || !isRecord(json.data) || typeof json.data.id !== "number") {
    return { ok: false, status: res.status, errors: ["Invalid response format"] };
  }
  return { ok: true, data: { id: json.data.id } };
}

export async function postAiChatMessage(threadId: number, message: string): Promise<
  | { ok: true; data: { thread: AiChatThread; user_message: AiChatMessage; assistant_message: AiChatMessage } }
  | { ok: false; status: number; errors: string[] }
> {
  const res = await fetch(`${API_BASE}/api/ai_chat/threads/${threadId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify({ message }),
  });
  const json = await safeJson(res);
  if (!res.ok) return parseErrors(json, res.status);
  if (
    !isRecord(json) ||
    !isRecord(json.data) ||
    !isThread(json.data.thread) ||
    !isMessage(json.data.user_message) ||
    !isMessage(json.data.assistant_message)
  ) {
    return { ok: false, status: res.status, errors: ["Invalid response format"] };
  }
  return {
    ok: true,
    data: {
      thread: json.data.thread,
      user_message: json.data.user_message,
      assistant_message: json.data.assistant_message,
    },
  };
}
