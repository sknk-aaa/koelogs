const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export type Me = {
  id: number;
  email: string;
  display_name: string | null;
  goal_text: string | null;
};

export async function fetchMe(): Promise<Me | null> {
  const res = await fetch(`${API_BASE}/api/me`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`fetchMe failed: ${res.status}`);

  return (await res.json()) as Me;
}

export async function updateMeDisplayName(displayName: string): Promise<Me> {
  const res = await fetch(`${API_BASE}/api/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ me: { display_name: displayName } }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error ?? `updateMeDisplayName failed: ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
  }

  return json as Me;
}

export async function updateMeGoalText(goalText: string): Promise<Me> {
  const res = await fetch(`${API_BASE}/api/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ me: { goal_text: goalText } }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error ?? `updateMeGoalText failed: ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
  }

  return json as Me;
}

export async function signup(
  email: string,
  password: string,
  passwordConfirmation: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify({
      email,
      password,
      password_confirmation: passwordConfirmation,
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error ?? `signup failed: ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
  }
}

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
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
