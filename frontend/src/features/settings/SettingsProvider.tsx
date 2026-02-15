import { useEffect, useMemo, useState } from "react";
import { SettingsContext, type SettingsState } from "./SettingsContext";
import { loadSettings, saveSettings } from "./settingsStorage";
import { normalizeSettings, type AppSettings } from "./settings";

function applyFontScale(scale: "normal" | "large") {
  // CSS変数にしておくと後で拡張しやすい
  const v = scale === "large" ? "1.12" : "1";
  document.documentElement.style.setProperty("--fontScale", v);
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<AppSettings>(() => loadSettings());

  useEffect(() => {
    const normalized = normalizeSettings(settings);
    saveSettings(normalized);
    applyFontScale(normalized.fontScale);
  }, [settings]);

  const setSettings = (next: AppSettings) => setSettingsState(normalizeSettings(next));
  const patchSettings = (patch: Partial<AppSettings>) =>
    setSettingsState((prev) => normalizeSettings({ ...prev, ...patch }));

  const value: SettingsState = useMemo(
    () => ({ settings, setSettings, patchSettings }),
    [settings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
