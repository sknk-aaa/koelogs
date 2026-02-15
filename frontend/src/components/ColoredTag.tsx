// frontend/src/components/ColoredTag.tsx
import React from "react";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.trim().match(/^#([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const v = m[1];
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return { r, g, b };
}

// WCAG相対輝度（実用に十分）
function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }) {
  const srgb = [r, g, b]
    .map((x) => x / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function pickTextColor(bgHex: string): string {
  const rgb = hexToRgb(bgHex);
  if (!rgb) return "#111111";
  const L = relativeLuminance(rgb);
  // 明るい背景なら黒、暗い背景なら白
  return L > 0.55 ? "#111111" : "#FFFFFF";
}

type Props = {
  label: string;
  color?: string | null; // 背景色
  fallbackColor?: string; // 未一致/不正時
  muted?: boolean;
  title?: string;
  style?: React.CSSProperties;
};

export default function ColoredTag({
  label,
  color,
  fallbackColor = "#E5E7EB", // グレー（未一致用）
  muted = false,
  title,
  style,
}: Props) {
  const bg = typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallbackColor;
  const fg = pickTextColor(bg);

  return (
    <span
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 800,
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid rgba(0,0,0,0.08)",
        background: bg,
        color: fg,
        opacity: muted ? 0.65 : 1,
        userSelect: "none",
        ...style,
      }}
    >
      {label}
    </span>
  );
}
