const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export type Me = { id: number; email: string };

export async function fetchMe(): Promise<Me | null> {
  const res = await fetch(`${API_BASE}/api/me`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include", // ★必須：Cookieを送る
  });

  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`fetchMe failed: ${res.status}`);

  return (await res.json()) as Me;
}

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include", // ★必須
    body: JSON.stringify({ email, password }),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = json?.error ?? `login failed: ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
  }
}

export async function logout(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  if (!res.ok) throw new Error(`logout failed: ${res.status}`);
}
