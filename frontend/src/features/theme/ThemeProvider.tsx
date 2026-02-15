import { useEffect, useMemo, useState } from "react";
import { ThemeContext, type ThemeState } from "./ThemeContext";
import { THEMES, type ThemeKey } from "./themes";
import { loadThemeKey, saveThemeKey } from "./themeStorage";

function applyThemeToRoot(key: ThemeKey) {
  const def = THEMES.find((t) => t.key === key) ?? THEMES[0];
  const root = document.documentElement;

  // data-theme も付与（将来CSS側で分岐したくなったら使える）
  root.dataset.theme = def.key;

  Object.entries(def.vars).forEach(([k, v]) => {
    root.style.setProperty(k, v);
  });
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeKey, setThemeKeyState] = useState<ThemeKey>(() => {
    return loadThemeKey() ?? "rose";
  });

  useEffect(() => {
    applyThemeToRoot(themeKey);
    saveThemeKey(themeKey);
  }, [themeKey]);

  const setThemeKey = (k: ThemeKey) => setThemeKeyState(k);

  const value: ThemeState = useMemo(() => ({ themeKey, setThemeKey }), [themeKey]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
