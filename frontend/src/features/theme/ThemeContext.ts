import { createContext } from "react";
import type { ThemeMode } from "./themeStorage";

export type ThemeState = {
  themeMode: ThemeMode;
  resolvedMode: "light" | "dark";
  setThemeMode: (mode: ThemeMode) => void;
};

export const ThemeContext = createContext<ThemeState | null>(null);
