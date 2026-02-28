const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export type AiLongTermProfileCustomItem = {
  title: string;
  content: string;
};

export type AiLongTermProfile = {
  strengths: string[];
  challenges: string[];
  growth_journey: string[];
  custom_items: AiLongTermProfileCustomItem[];
  meta?: {
    profile_version?: string;
    source_window_days?: number;
    computed_at?: string | null;
    overrides_updated_at?: string | null;
    has_overrides?: boolean;
  };
};

export type Me = {
  id: number;
  email: string;
  display_name: string | null;
  avatar_icon: string;
  avatar_image_url: string | null;
  goal_text: string | null;
  ai_custom_instructions: string | null;
  ai_improvement_tags: string[];
  ai_long_term_profile?: AiLongTermProfile;
  public_profile_enabled: boolean;
  public_goal_enabled: boolean;
  ranking_participation_enabled: boolean;
  ai_contribution_count: number;
  created_at: string;
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
  return updateMe({ display_name: displayName });
}

export async function updateMeGoalText(goalText: string): Promise<Me> {
  return updateMe({ goal_text: goalText });
}

export async function updateMe(input: {
  display_name?: string;
  avatar_icon?: string;
  avatar_image_url?: string;
  goal_text?: string;
  ai_custom_instructions?: string;
  ai_improvement_tags?: string[];
  ai_long_term_profile?: {
    strengths?: string[];
    challenges?: string[];
    growth_journey?: string[];
    custom_items?: Array<{ title: string; content: string }>;
  };
  public_profile_enabled?: boolean;
  public_goal_enabled?: boolean;
  ranking_participation_enabled?: boolean;
  current_password?: string;
  password?: string;
  password_confirmation?: string;
}): Promise<Me> {
  const res = await fetch(`${API_BASE}/api/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ me: input }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error ?? `updateMe failed: ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
  }

  return json as Me;
}

export async function recalculateAiLongTermProfile(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/me/ai_profile/recalculate`, {
    method: "POST",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`recalculateAiLongTermProfile failed: ${res.status}`);
  }
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

export async function requestPasswordReset(email: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/password_reset_requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error ?? `password_reset_request failed: ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
  }
}

export async function resetPassword(
  token: string,
  password: string,
  passwordConfirmation: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/password_resets`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify({
      token,
      password,
      password_confirmation: passwordConfirmation,
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error ?? `password_reset failed: ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
  }
}
