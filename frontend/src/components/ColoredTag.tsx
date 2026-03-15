import type { CSSProperties } from "react";

type Props = {
  text: string;
  color: string; // HEX "#RRGGBB"
  title?: string;
  className?: string;
  style?: CSSProperties;
};

function emphasizeHexColor(input: string): string {
  const matched = input.trim().match(/^#([0-9a-fA-F]{6})$/);
  if (!matched) return input;
  const hex = matched[1];
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const mix = 0.44;
  const next = (value: number) => Math.max(0, Math.round(value * (1 - mix)));
  return `#${[next(r), next(g), next(b)].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export default function ColoredTag({ text, color, title, className, style }: Props) {
  const emphasizedColor = emphasizeHexColor(color);
  return (
    <span
      className={className}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 24,
        padding: "0 10px",
        borderRadius: 999,
        background: emphasizedColor,
        border: "1px solid rgba(0,0,0,0.14)",
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
        color: style?.color,
        ...style,
      }}
    >
      {text}
    </span>
  );
}
