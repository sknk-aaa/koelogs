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
      {label && <div className="metronomeLoader__label">{label}</div>}
    </div>
  );
}
