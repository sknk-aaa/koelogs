import { useEffect, useMemo, useState } from "react";
import { ThemeContext, type ThemeState } from "./ThemeContext";
import { loadThemeMode, saveThemeMode, type ThemeMode } from "./themeStorage";

const FIXED_LIGHT_VARS = {
  "--accent": "#0e91d8",
  "--accentSoft": "rgba(14, 145, 216, 0.2)",
  "--accentText": "#ffffff",
  "--accentTextSoft": "#0f324f",
  "--bgTop": "#c8def5",
  "--bgMid": "#d9e4f2",
  "--bgBottom": "#cfd9e8",
  "--text": "#0f1d2e",
  "--muted": "rgba(16, 30, 48, 0.68)",
  "--border": "rgba(29, 58, 94, 0.18)",
  "--card": "#ffffff",
  "--surface": "#ffffff",
  "--surfaceStrong": "#ffffff",
  "--surface-strong": "#ffffff",
  "--pageText": "#0f1d2e",
  "--cardText": "#0f1d2e",
  "--headerTitleText": "#1f4e6d",
  "--headerBg": "#ffffff",
  "--headerBorder": "rgba(0, 0, 0, 0.06)",
  "--drawerBackdrop": "rgba(0, 0, 0, 0.35)",
  "--drawerSheet": "rgba(255, 255, 255, 0.92)",
  "--drawerBorder": "rgba(0, 0, 0, 0.08)",
  "--drawerCard": "#ffffff",
  "--drawerText": "#111111",
  "--bg-glow-1": "rgba(0, 0, 0, 0)",
  "--bg-glow-2": "rgba(0, 0, 0, 0)",
  "--card-tint": "#ffffff",
} as const;

const FIXED_DARK_VARS = {
  "--accent": "#2f9fff",
  "--accentSoft": "rgba(47, 159, 255, 0.2)",
  "--accentText": "#ffffff",
  "--accentTextSoft": "#10273d",
  "--bg": "#0a111d",
  "--bgTop": "#101a2d",
  "--bgMid": "#0b1220",
  "--bgBottom": "#0a0f1a",
  "--text": "#e7eefb",
  "--muted": "rgba(231, 238, 251, 0.78)",
  "--border": "rgba(255, 255, 255, 0.08)",
  "--card": "#141f33",
  "--surface": "#111a2b",
  "--surfaceStrong": "#162238",
  "--surface-strong": "#162238",
  "--pageText": "#e7eefb",
  "--cardText": "#e7eefb",
  "--headerTitleText": "#baeef4",
  "--headerBg": "#0c101b",
  "--headerBorder": "rgba(255, 255, 255, 0.08)",
  "--drawerBackdrop": "rgba(4, 8, 16, 0.7)",
  "--drawerSheet": "#141f33",
  "--drawerBorder": "rgba(255, 255, 255, 0.08)",
  "--drawerCard": "#141f33",
  "--drawerText": "#e6edf8",
  "--bg-glow-1": "rgba(90, 161, 242, 0.18)",
  "--bg-glow-2": "rgba(155, 123, 255, 0.16)",
  "--card-tint": "#1d2a45",
} as const;

function applyThemeToRoot(mode: "light" | "dark") {
  const root = document.documentElement;
  const vars = mode === "dark" ? FIXED_DARK_VARS : FIXED_LIGHT_VARS;

  root.dataset.theme = "default";
  root.dataset.themeMode = mode;
  root.style.colorScheme = mode;
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => loadThemeMode() ?? "light");
  const resolvedMode: "light" | "dark" = themeMode;

  useEffect(() => {
    applyThemeToRoot(resolvedMode);
    saveThemeMode(themeMode);
  }, [themeMode, resolvedMode]);

  const setThemeMode = (m: ThemeMode) => setThemeModeState(m);

  const value: ThemeState = useMemo(
    () => ({ themeMode, resolvedMode, setThemeMode }),
    [resolvedMode, themeMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
