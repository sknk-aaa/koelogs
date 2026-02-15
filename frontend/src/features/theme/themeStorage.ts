import type { ThemeKey } from "./themes";

const KEY = "voice-app.theme";

export function loadThemeKey(): ThemeKey | null {
  try {
    const v = localStorage.getItem(KEY);
    return (v as ThemeKey) || null;
  } catch {
    return null;
  }
}

export function saveThemeKey(key: ThemeKey) {
  try {
    localStorage.setItem(KEY, key);
  } catch {
    // storage不可環境でも落とさない
  }
}
