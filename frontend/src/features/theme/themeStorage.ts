import type { ThemeKey } from "./themes";

export type ThemeMode = "light" | "dark" | "system";

const THEME_KEY = "voice-app.theme";
const MODE_KEY = "voice-app.themeMode";

export function loadThemeKey(): ThemeKey | null {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return (v as ThemeKey) || null;
  } catch {
    return null;
  }
}

export function saveThemeKey(key: ThemeKey) {
  try {
    localStorage.setItem(THEME_KEY, key);
  } catch {
    // storage不可環境でも落とさない
  }
}

export function loadThemeMode(): ThemeMode | null {
  try {
    const v = localStorage.getItem(MODE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
    return null;
  } catch {
    return null;
  }
}

export function saveThemeMode(mode: ThemeMode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // storage不可環境でも落とさない
  }
}
