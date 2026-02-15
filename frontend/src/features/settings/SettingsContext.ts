import { createContext } from "react";
import type { AppSettings } from "./settings";

export type SettingsState = {
  settings: AppSettings;
  setSettings: (next: AppSettings) => void;
  patchSettings: (patch: Partial<AppSettings>) => void;
};

export const SettingsContext = createContext<SettingsState | null>(null);
