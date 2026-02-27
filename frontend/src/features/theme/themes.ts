export type ThemeKey =
  | "rose"
  | "sky"
  | "violet"
  | "ocean"
  | "sunset"
  | "canary"
  | "umber";

export type ThemeDef = {
  key: ThemeKey;
  name: string;
  unlockLevel?: number;
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
      "--accent": "#E11D73",
      "--accentSoft": "rgba(225, 29, 115, 0.32)",
      "--accentText": "#ffffff",
      "--bgTop": "#FFE5F1",
      "--bgMid": "#FFF3F8",
      "--bgBottom": "#F7F4F8",
    },
  },
  {
    key: "sky",
    name: "Sky",
    vars: {
      "--accent": "#0284FF",
      "--accentSoft": "rgba(2, 132, 255, 0.32)",
      "--accentText": "#ffffff",
      "--bgTop": "#E2F1FF",
      "--bgMid": "#F3F8FF",
      "--bgBottom": "#EEF3FA",
    },
  },
  {
    key: "ocean",
    name: "Graphite",
    vars: {
      "--accent": "#334155",
      "--accentSoft": "rgba(51, 65, 85, 0.34)",
      "--accentText": "#ffffff",
      "--bgTop": "#E8EDF4",
      "--bgMid": "#F6F8FB",
      "--bgBottom": "#EEF1F6",
    },
  },
  {
    key: "sunset",
    name: "Lime",
    vars: {
      "--accent": "#65C11A",
      "--accentSoft": "rgba(101, 193, 26, 0.34)",
      "--accentText": "#ffffff",
      "--bgTop": "#EEFACF",
      "--bgMid": "#F7FDE8",
      "--bgBottom": "#EDF4DD",
    },
  },
  {
    key: "violet",
    name: "Violet",
    unlockLevel: 5,
    vars: {
      "--accent": "#7C3AED",
      "--accentSoft": "rgba(124, 58, 237, 0.32)",
      "--accentText": "#ffffff",
      "--bgTop": "#EEE6FF",
      "--bgMid": "#F6F3FF",
      "--bgBottom": "#EFEFFC",
    },
  },
  {
    key: "canary",
    name: "Canary",
    unlockLevel: 10,
    vars: {
      "--accent": "#EAB308",
      "--accentSoft": "rgba(234, 179, 8, 0.34)",
      "--accentText": "#111111",
      "--bgTop": "#FFF3BA",
      "--bgMid": "#FFFBE2",
      "--bgBottom": "#F4EED6",
    },
  },
  {
    key: "umber",
    name: "Umber",
    unlockLevel: 20,
    vars: {
      "--accent": "#A16207",
      "--accentSoft": "rgba(161, 98, 7, 0.34)",
      "--accentText": "#ffffff",
      "--bgTop": "#F5E2CC",
      "--bgMid": "#FBF0E3",
      "--bgBottom": "#F1E3D4",
    },
  },
];
