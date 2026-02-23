import { createContext } from "react";
import type { ThemeKey } from "./themes";
import type { ThemeMode } from "./themeStorage";

export type ThemeState = {
  themeKey: ThemeKey;
  setThemeKey: (k: ThemeKey) => void;
  themeMode: ThemeMode;
  resolvedMode: "light" | "dark";
  setThemeMode: (mode: ThemeMode) => void;
};

export const ThemeContext = createContext<ThemeState | null>(null);
