import "./MetronomeLoader.css";

export default function MetronomeLoader({
  label = "読み込み中...",
  compact = false,
  className = "",
}: {
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  const classes = `metronomeLoader${compact ? " metronomeLoader--compact" : ""}${className ? ` ${className}` : ""}`;
  return (
    <div className={classes} role="status" aria-live="polite" aria-label={label || "読み込み中"}>
      <svg viewBox="0 0 120 120" className="metronomeLoader__svg" aria-hidden="true">
        <rect x="36" y="26" width="48" height="78" rx="10" className="metronomeLoader__body" />
        <line x1="60" y1="34" x2="60" y2="82" className="metronomeLoader__guide" />
        <g className="metronomeLoader__armWrap" style={{ transformOrigin: "60px 36px" }}>
          <line x1="60" y1="36" x2="60" y2="78" className="metronomeLoader__arm" />
          <circle cx="60" cy="58" r="6.5" className="metronomeLoader__weight" />
        </g>
        <circle cx="60" cy="36" r="4.5" className="metronomeLoader__pivot" />
        <rect x="52" y="96" width="16" height="5" rx="2.5" className="metronomeLoader__base" />
      </svg>
      {label && <div className="metronomeLoader__label">{label}</div>}
    </div>
  );
}
