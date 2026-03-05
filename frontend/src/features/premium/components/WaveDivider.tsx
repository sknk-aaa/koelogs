import type { CSSProperties } from "react";

type Props = {
  topColor: string;
  bottomColor: string;
  flipped?: boolean;
};

export default function WaveDivider({ topColor, bottomColor, flipped = false }: Props) {
  const style = {
    "--wave-top": topColor,
    "--wave-bottom": bottomColor,
  } as CSSProperties;

  return (
    <div
      className={`premiumPlanPage__waveDivider${flipped ? " is-flipped" : ""}`}
      style={style}
      aria-hidden="true"
    >
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none" focusable="false" aria-hidden="true">
        <rect x="0" y="0" width="1440" height="120" fill="var(--wave-top)" />
        <path d="M0 34C170 94 346 98 530 58C692 22 862 20 1032 58C1184 92 1324 90 1440 50L1440 120L0 120Z" />
      </svg>
    </div>
  );
}
