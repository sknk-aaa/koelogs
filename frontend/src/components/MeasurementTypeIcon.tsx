type MeasurementTypeIconKey = "range" | "volume_stability" | "long_tone" | "pitch_accuracy" | "measure";

type Props = {
  kind: MeasurementTypeIconKey;
  className?: string;
};

export default function MeasurementTypeIcon({ kind, className }: Props) {
  if (kind === "measure") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M4 5v14h11" />
        <path d="m7 14 3-3 2.5 2.5 4-5" />
        <circle className="accent" cx="18" cy="16" r="3.2" />
        <path className="accent" d="m20.3 18.3 2 2" />
      </svg>
    );
  }

  if (kind === "range") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M6 18h12" />
        <path className="accent" d="M8 15.5V8.5" />
        <path className="accent" d="M16 15.5V6.5" />
        <path d="M8 8.5 6.5 10" />
        <path d="M8 8.5 9.5 10" />
        <path d="M16 6.5 14.5 8" />
        <path d="M16 6.5 17.5 8" />
      </svg>
    );
  }

  if (kind === "volume_stability") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M5.5 14.5h3l4 4v-13l-4 4h-3Z" />
        <path className="accent" d="M16 10a3 3 0 0 1 0 4" />
        <path d="M18 8a6 6 0 0 1 0 8" />
      </svg>
    );
  }

  if (kind === "long_tone") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M6 18V9.5" />
        <path className="accent" d="M12 18V6.5" />
        <path d="M18 18V11.5" />
        <path d="M4.5 18h15" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 4.5v12" />
      <path className="accent" d="M8 8.5a4 4 0 0 1 8 0" />
      <path d="M9 17.5h6" />
      <path d="M10.5 20h3" />
    </svg>
  );
}
