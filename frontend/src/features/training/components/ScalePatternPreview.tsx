import type { ScaleType } from "../../../api/scaleTracks";
import "./ScalePatternPreview.css";

export type ScalePatternKey = "5tone" | "1oct" | "oct_repeat" | "down_5tone" | "broken" | "triad";

const SCALE_PATTERN_POINTS: Record<ScalePatternKey, number[]> = {
  "5tone": [0, 1, 2, 3, 4, 3, 2, 1, 0],
  "down_5tone": [4, 3, 2, 1, 0],
  "1oct": [0, 1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1, 0],
  "triad": [0, 2, 4, 2, 0],
  "broken": [0, 4, 2, 7, 4, 2, 0],
  "oct_repeat": [0, 2, 4, 7, 7, 7, 7, 4, 2, 0],
};

type Props = {
  pattern: ScalePatternKey;
  size?: "sm" | "md" | "lg";
  active?: boolean;
  className?: string;
};

export function scalePatternFromScaleType(scaleType: ScaleType): ScalePatternKey {
  return scaleType === "5tone" ? "5tone" : "1oct";
}

export default function ScalePatternPreview({ pattern, size = "md", active = false, className = "" }: Props) {
  const points = SCALE_PATTERN_POINTS[pattern] ?? SCALE_PATTERN_POINTS["5tone"];
  const w = 180;
  const h = 96;
  const padX = 14;
  const padY = 14;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1, max - min);
  const noteCount = points.length;
  const stepX = noteCount > 1 ? innerW / (noteCount - 1) : 0;
  const pillW = Math.max(10, Math.min(18, innerW / Math.max(7, noteCount)));
  const pillH = 8;
  const pillR = 4;
  const guides = [0.12, 0.36, 0.62, 0.88];

  return (
    <div className={`scalePattern scalePattern--${size}${active ? " is-active" : ""} ${className}`.trim()} aria-hidden="true">
      <svg viewBox={`0 0 ${w} ${h}`} className="scalePattern__svg">
        <rect x="4" y="4" width={w - 8} height={h - 8} rx="14" className="scalePattern__bg" />
        {guides.map((v, idx) => (
          <line
            key={`guide-${idx}`}
            x1={padX}
            y1={padY + innerH * v}
            x2={w - padX}
            y2={padY + innerH * v}
            className="scalePattern__guide"
          />
        ))}
        {points.map((p, idx) => {
          const x = padX + stepX * idx;
          const norm = (p - min) / range;
          const y = padY + innerH - norm * innerH;
          return (
            <rect
              key={`note-${idx}`}
              x={x - pillW / 2}
              y={y - pillH / 2}
              width={pillW}
              height={pillH}
              rx={pillR}
              className="scalePattern__note"
            />
          );
        })}
      </svg>
    </div>
  );
}

