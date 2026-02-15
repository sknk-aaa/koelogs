export type FontScale = "normal" | "large";

export type AppSettings = {
  defaultVolume: number; // 0.0 - 1.0
  loopEnabled: boolean;
  aiRangeDays: 7 | 14;
  fontScale: FontScale;
};

export const DEFAULT_SETTINGS: AppSettings = {
  defaultVolume: 0.75,
  loopEnabled: false,
  aiRangeDays: 7,
  fontScale: "normal",
};

// 入力が壊れてても安全にする
export function normalizeSettings(input: Partial<AppSettings>): AppSettings {
  const vol =
    typeof input.defaultVolume === "number" ? input.defaultVolume : DEFAULT_SETTINGS.defaultVolume;

  const defaultVolume = Math.min(1, Math.max(0, vol));

  const loopEnabled =
    typeof input.loopEnabled === "boolean" ? input.loopEnabled : DEFAULT_SETTINGS.loopEnabled;

  const aiRangeDays = input.aiRangeDays === 14 ? 14 : 7;

  const fontScale = input.fontScale === "large" ? "large" : "normal";

  return { defaultVolume, loopEnabled, aiRangeDays, fontScale };
}
