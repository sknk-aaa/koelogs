import "./MiniPreview.css";

export type MeasurementPreviewKind = "range" | "sustain" | "loudness" | "pitch";

type Props = {
  kind: MeasurementPreviewKind;
  size?: "sm" | "md";
};

export default function MiniPreview({ kind, size = "md" }: Props) {
  return (
    <div className={`miniPreview miniPreview--${size} miniPreview--${kind}`} aria-hidden="true">
      {kind === "range" && <RangePreview />}
      {kind === "sustain" && <SustainPreview />}
      {kind === "loudness" && <LoudnessPreview />}
      {kind === "pitch" && <PitchPreview />}
    </div>
  );
}

function RangePreview() {
  return (
    <svg viewBox="0 0 96 56" className="miniPreview__svg">
      <line x1="16" y1="14" x2="16" y2="43" className="miniPreview__lineFaint" />
      <line x1="16" y1="43" x2="82" y2="43" className="miniPreview__lineFaint" />
      <line x1="22" y1="19" x2="78" y2="19" className="miniPreview__lineFaint" />
      <line x1="22" y1="29" x2="78" y2="29" className="miniPreview__lineFaint" />
      <line x1="22" y1="38" x2="78" y2="38" className="miniPreview__lineFaint" />
      <line x1="28" y1="35" x2="68" y2="17" className="miniPreview__path" />
      <line x1="28" y1="35" x2="68" y2="17" className="miniPreview__lineStrong" />
      <circle cx="28" cy="35" r="3" className="miniPreview__point" />
      <circle cx="68" cy="17" r="3" className="miniPreview__point" />
    </svg>
  );
}

function SustainPreview() {
  return (
    <svg viewBox="0 0 96 56" className="miniPreview__svg">
      <circle cx="26" cy="28" r="14" className="miniPreview__ring" />
      <line x1="26" y1="28" x2="26" y2="20" className="miniPreview__lineStrong" />
      <line x1="26" y1="28" x2="33" y2="30" className="miniPreview__lineStrong" />
      <line x1="46" y1="33" x2="80" y2="33" className="miniPreview__lineStrong" />
      <line x1="54" y1="27" x2="54" y2="39" className="miniPreview__lineFaint" />
      <line x1="66" y1="27" x2="66" y2="39" className="miniPreview__lineFaint" />
      <line x1="78" y1="27" x2="78" y2="39" className="miniPreview__lineFaint" />
    </svg>
  );
}

function LoudnessPreview() {
  return (
    <svg viewBox="0 0 96 56" className="miniPreview__svg">
      <text x="14" y="23" className="miniPreview__dbText">dB</text>
      <line x1="40" y1="28" x2="84" y2="28" className="miniPreview__lineFaint" />
      <path d="M40 29 L48 24 L56 31 L64 25 L72 30 L80 27" className="miniPreview__path" />
      <line x1="44" y1="38" x2="44" y2="46" className="miniPreview__lineStrong" />
      <line x1="52" y1="35" x2="52" y2="46" className="miniPreview__lineStrong" />
      <line x1="60" y1="33" x2="60" y2="46" className="miniPreview__lineStrong" />
    </svg>
  );
}

function PitchPreview() {
  return (
    <svg viewBox="0 0 96 56" className="miniPreview__svg">
      <line x1="14" y1="14" x2="14" y2="42" className="miniPreview__lineFaint" />
      <line x1="14" y1="42" x2="82" y2="42" className="miniPreview__lineFaint" />
      <line x1="18" y1="18" x2="80" y2="18" className="miniPreview__pitchGuideLine" />
      <line x1="18" y1="27" x2="80" y2="27" className="miniPreview__pitchGuideLine" />
      <line x1="18" y1="36" x2="80" y2="36" className="miniPreview__pitchGuideLine" />
      <path d="M20 31 L28 29 L36 24 L44 20 L52 23 L60 21 L68 25 L76 23" className="miniPreview__path" />
      <line x1="20" y1="23" x2="76" y2="23" className="miniPreview__pitchGuideLine" />
      <circle cx="44" cy="20" r="2.7" className="miniPreview__point" />
    </svg>
  );
}
