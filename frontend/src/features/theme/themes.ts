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
      "--accent": "#ff3b7a",
      "--accentSoft": "rgba(255, 59, 122, 0.14)",
      "--accentText": "#ffffff",
      "--bgTop": "#ffd1d6",
      "--bgMid": "#f7f7fb",
      "--bgBottom": "#f2f2f7",
    },
  },
  {
    key: "sky",
    name: "Sky",
    vars: {
      "--accent": "#007aff",
      "--accentSoft": "rgba(0, 122, 255, 0.14)",
      "--accentText": "#ffffff",
      "--bgTop": "#cfe7ff",
      "--bgMid": "#f6f9ff",
      "--bgBottom": "#f2f6ff",
    },
  },
  {
    key: "emerald",
    name: "Emerald",
    vars: {
      "--accent": "#00b894",
      "--accentSoft": "rgba(0, 184, 148, 0.14)",
      "--accentText": "#ffffff",
      "--bgTop": "#c9f7ee",
      "--bgMid": "#f6fffb",
      "--bgBottom": "#f2fbf8",
    },
  },
  {
    key: "amber",
    name: "Amber",
    vars: {
      "--accent": "#ff9f0a",
      "--accentSoft": "rgba(255, 159, 10, 0.16)",
      "--accentText": "#111111",
      "--bgTop": "#ffe7c2",
      "--bgMid": "#fffaf2",
      "--bgBottom": "#f7f4ee",
    },
  },
  {
    key: "violet",
    name: "Violet",
    vars: {
      "--accent": "#7d3cff",
      "--accentSoft": "rgba(125, 60, 255, 0.14)",
      "--accentText": "#ffffff",
      "--bgTop": "#e2d7ff",
      "--bgMid": "#fbf9ff",
      "--bgBottom": "#f4f2ff",
    },
  },
];
