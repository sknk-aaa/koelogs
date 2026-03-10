import type { ReactNode } from "react";

const BADGE_SHORT_NAMES: Record<string, string> = {
  first_log: "First Log",
  streak_3: "3-Day",
  streak_7: "7-Day",
  streak_30: "30-Day",
  measurement_master: "Measure",
  ai_user_1: "First AI",
  ai_user_3: "AI 3",
  ai_user_5: "AI 5",
  ai_user_10: "AI 10",
  community_post_1: "Post 1",
  community_post_5: "Post 5",
  community_post_10: "Post 10",
  xp_100: "XP 100",
  xp_500: "XP 500",
  xp_1000: "XP 1K",
};

export const BADGE_DISPLAY_TOTAL = 24;

export function getBadgeShortName(badge: { key: string; name: string }): string {
  return BADGE_SHORT_NAMES[badge.key] ?? badge.name;
}

export function renderBadgeIcon(key: string): ReactNode {
  if (key === "first_log") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <rect x="6" y="4.5" width="12" height="15" rx="2.5" />
        <path d="M9 9h6" />
        <path d="M9 12.5h6" />
        <path className="accent" d="M9 16h4" />
      </svg>
    );
  }
  if (key.startsWith("streak_")) {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M7 5.5h10" />
        <path d="M8 3.8v3.4" />
        <path d="M16 3.8v3.4" />
        <rect x="5.5" y="6.5" width="13" height="12" rx="3" />
        <path className="accent" d="m9.3 12.3 1.9 1.9 3.6-4" />
      </svg>
    );
  }
  if (key.startsWith("xp_")) {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <circle cx="12" cy="12" r="6.8" />
        <path className="accent" d="M12 8.5v7" />
        <path className="accent" d="M8.5 12h7" />
      </svg>
    );
  }
  if (key === "measurement_master") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <rect x="9" y="4.5" width="6" height="9.5" rx="3" />
        <path d="M7.2 11.5a4.8 4.8 0 0 0 9.6 0" />
        <path className="accent" d="M12 16.4v2.8" />
        <path d="M9.5 19.2h5" />
      </svg>
    );
  }
  if (key.startsWith("ai_user_")) {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M6.5 7.2a2.2 2.2 0 0 1 2.2-2.2h6.6a2.2 2.2 0 0 1 2.2 2.2v4.8a2.2 2.2 0 0 1-2.2 2.2H12l-3 2.4v-2.4H8.7a2.2 2.2 0 0 1-2.2-2.2Z" />
        <path className="accent" d="M10 9.5h4" />
        <path className="accent" d="M12 7.5v4" />
      </svg>
    );
  }
  if (key.startsWith("community_post_")) {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <circle cx="9" cy="9" r="2.4" />
        <circle cx="15.4" cy="8" r="1.8" />
        <path d="M5.4 17.6c.5-2.4 2.5-4 4.8-4s4.2 1.6 4.7 4" />
        <path className="accent" d="M15.4 14.5v4.1" />
        <path className="accent" d="M13.35 16.55h4.1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <circle cx="12" cy="12" r="7.3" />
      <path className="accent" d="m9.1 12.4 1.9 1.9 3.9-4.2" />
    </svg>
  );
}
