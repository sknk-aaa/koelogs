const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export type ContactCategory = "bug" | "request" | "other";

export type SubmitHelpContactInput = {
  category: ContactCategory;
  email: string;
  subject: string;
  message: string;
};

export async function submitHelpContact(input: SubmitHelpContactInput): Promise<void> {
  const res = await fetch(`${API_BASE}/api/help/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error ?? `submit_help_contact failed: ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
  }
}
