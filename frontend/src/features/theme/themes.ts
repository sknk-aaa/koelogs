export type ThemeKey = "rose" | "sky" | "emerald" | "amber" | "violet";

export type ThemeDef = {
  key: ThemeKey;
  name: string;
  // CSS変数に入れる値
  vars: {
    "--accent": string;
    "--accentSoft": string;
    "--accentText": string;
    "--bgTop": string;
    "--bgMid": string;
    "--bgBottom": string;
  };
};

export const THEMES: ThemeDef[] = [
  {
    key: "rose",
    name: "Rose",
    vars: {
      "--accent": "#ff2d6d",
      "--accentSoft": "rgba(255, 45, 109, 0.24)",
      "--accentText": "#ffffff",
      "--bgTop": "#ffd2dc",
      "--bgMid": "#fff6f8",
      "--bgBottom": "#f7f2f7",
    },
  },
  {
    key: "sky",
    name: "Sky",
    vars: {
      "--accent": "#0072ff",
      "--accentSoft": "rgba(0, 114, 255, 0.24)",
      "--accentText": "#ffffff",
      "--bgTop": "#cfe6ff",
      "--bgMid": "#f2f7ff",
      "--bgBottom": "#eef3ff",
    },
  },
  {
    key: "emerald",
    name: "Emerald",
    vars: {
      "--accent": "#00b68f",
      "--accentSoft": "rgba(0, 182, 143, 0.24)",
      "--accentText": "#ffffff",
      "--bgTop": "#c7f6ee",
      "--bgMid": "#effdf8",
      "--bgBottom": "#edf8f4",
    },
  },
  {
    key: "amber",
    name: "Amber",
    vars: {
      "--accent": "#ff9f0a",
      "--accentSoft": "rgba(255, 159, 10, 0.26)",
      "--accentText": "#111111",
      "--bgTop": "#ffe4b8",
      "--bgMid": "#fff7ea",
      "--bgBottom": "#f6f0e6",
    },
  },
  {
    key: "violet",
    name: "Violet",
    vars: {
      "--accent": "#7c3cff",
      "--accentSoft": "rgba(124, 60, 255, 0.24)",
      "--accentText": "#ffffff",
      "--bgTop": "#e0d4ff",
      "--bgMid": "#f6f2ff",
      "--bgBottom": "#f1edff",
    },
  },
];