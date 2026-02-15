// frontend/src/features/menus/components/MenuTag.tsx
import React from "react";

function isValidHexColor(c: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(c);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!isValidHexColor(hex)) return null;
  const v = hex.slice(1);
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return { r, g, b };
}

// relative luminance (sRGB)
function luminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const srgb = [r, g, b].map((x) => {
    const c = x / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function pickTextColor(bgHex: string): string {
  const rgb = hexToRgb(bgHex);
  if (!rgb) return "#111111";
  // ざっくり：明るい背景なら黒、暗い背景なら白
  return luminance(rgb) > 0.6 ? "#111111" : "#FFFFFF";
}

function rgbaBorder(bgHex: string): string {
  const rgb = hexToRgb(bgHex);
  if (!rgb) return "rgba(0,0,0,0.12)";
  // 背景に対して少しだけ濃いめの枠（固定の透明黒でもOKだが、色が濃いと沈むので軽く）
  return `rgba(0,0,0,0.12)`;
}

export type MenuTagProps = {
  label: string;
  color?: string | null;
  fallbackColor?: string;
  title?: string;
};

export default function MenuTag({
  label,
  color,
  fallbackColor = "#E7E7EA",
  title,
}: MenuTagProps) {
  const bg = color && isValidHexColor(color) ? color : fallbackColor;
  const fg = pickTextColor(bg);

  return (
    <span
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        background: bg,
        color: fg,
        border: `1px solid ${rgbaBorder(bg)}`,
        fontSize: 12,
        fontWeight: 800,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
