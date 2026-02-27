import { THEMES, type ThemeDef } from "./themes";

const LAST_SEEN_LEVEL_KEY = "last_seen_level";

export function readLastSeenLevel(): number {
  if (typeof window === "undefined") return 1;
  const raw = window.localStorage.getItem(LAST_SEEN_LEVEL_KEY);
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
}

export function isThemeUnlocked(theme: ThemeDef, level: number): boolean {
  const required = theme.unlockLevel ?? 1;
  return level >= required;
}

export function unlockLabel(theme: ThemeDef): string | null {
  if (!theme.unlockLevel || theme.unlockLevel <= 1) return null;
  return `Lv${theme.unlockLevel}で開放`;
}

export function firstUnlockedThemeKey(level: number) {
  const first = THEMES.find((theme) => isThemeUnlocked(theme, level)) ?? THEMES[0];
  return first.key;
}
