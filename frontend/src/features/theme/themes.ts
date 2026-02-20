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
      "--accent": "#d84a7f",
      "--accentSoft": "rgba(216, 74, 127, 0.24)",
      "--accentText": "#ffffff",
      "--bgTop": "#ffe0eb",
      "--bgMid": "#f9eff4",
      "--bgBottom": "#eef1f7",
    },
  },
  {
    key: "sky",
    name: "Sky",
    vars: {
      "--accent": "#0e91d8",
      "--accentSoft": "rgba(14, 145, 216, 0.24)",
      "--accentText": "#ffffff",
      "--bgTop": "#dcefff",
      "--bgMid": "#edf3fb",
      "--bgBottom": "#e5ebf5",
    },
  },
  {
    key: "emerald",
    name: "Emerald",
    vars: {
      "--accent": "#0f9c84",
      "--accentSoft": "rgba(15, 156, 132, 0.24)",
      "--accentText": "#ffffff",
      "--bgTop": "#d6f5ec",
      "--bgMid": "#ebf6f2",
      "--bgBottom": "#e4eef0",
    },
  },
  {
    key: "amber",
    name: "Amber",
    vars: {
      "--accent": "#d58a1e",
      "--accentSoft": "rgba(213, 138, 30, 0.26)",
      "--accentText": "#111111",
      "--bgTop": "#f8e3c3",
      "--bgMid": "#f4efe3",
      "--bgBottom": "#e9e6e1",
    },
  },
  {
    key: "violet",
    name: "Violet",
    vars: {
      "--accent": "#6f56d9",
      "--accentSoft": "rgba(111, 86, 217, 0.24)",
      "--accentText": "#ffffff",
      "--bgTop": "#e8e2ff",
      "--bgMid": "#f0eff9",
      "--bgBottom": "#e6e8f4",
    },
  },
];
