import { useEffect, useMemo, useState } from "react";
import { ThemeContext, type ThemeState } from "./ThemeContext";
import { THEMES, type ThemeKey } from "./themes";
import { loadThemeKey, loadThemeMode, saveThemeKey, saveThemeMode, type ThemeMode } from "./themeStorage";

function applyThemeToRoot(key: ThemeKey, mode: "light" | "dark") {
  const def = THEMES.find((t) => t.key === key) ?? THEMES[0];
  const root = document.documentElement;

  root.dataset.theme = def.key;
  root.dataset.themeMode = mode;
  root.style.colorScheme = mode;

  // Reset inline vars first so stylesheet-based dark tokens can take over.
  Object.keys(def.vars).forEach((k) => {
    root.style.removeProperty(k);
  });

  // Light mode uses selected theme colors.
  // Dark mode intentionally ignores theme variants (rose/sky/etc).
  if (mode === "light") {
    Object.entries(def.vars).forEach(([k, v]) => {
      root.style.setProperty(k, v);
    });
  }
}

function systemPrefersDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeKey, setThemeKeyState] = useState<ThemeKey>(() => {
    return loadThemeKey() ?? "rose";
  });
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => loadThemeMode() ?? "system");
  const [systemDark, setSystemDark] = useState<boolean>(() => systemPrefersDark());

  const resolvedMode: "light" | "dark" = themeMode === "system" ? (systemDark ? "dark" : "light") : themeMode;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      setSystemDark(e.matches);
    };
    setSystemDark(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    applyThemeToRoot(themeKey, resolvedMode);
    saveThemeKey(themeKey);
    saveThemeMode(themeMode);
  }, [themeKey, themeMode, resolvedMode]);

  const setThemeKey = (k: ThemeKey) => setThemeKeyState(k);
  const setThemeMode = (m: ThemeMode) => setThemeModeState(m);

  const value: ThemeState = useMemo(
    () => ({ themeKey, setThemeKey, themeMode, resolvedMode, setThemeMode }),
    [resolvedMode, themeKey, themeMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
