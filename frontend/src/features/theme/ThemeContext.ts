import { createContext } from "react";
import type { ThemeKey } from "./themes";

export type ThemeState = {
  themeKey: ThemeKey;
  setThemeKey: (k: ThemeKey) => void;
};

export const ThemeContext = createContext<ThemeState | null>(null);
