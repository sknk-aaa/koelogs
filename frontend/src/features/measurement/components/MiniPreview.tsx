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
      <rect x="10" y="12" width="76" height="32" rx="7" className="miniPreview__keyboardBody" />

      {/* white keys */}
      <rect x="12" y="14" width="10" height="28" rx="2" className="miniPreview__keyWhite" />
      <rect x="22" y="14" width="10" height="28" rx="2" className="miniPreview__keyWhite" />
      <rect x="32" y="14" width="10" height="28" rx="2" className="miniPreview__keyWhite" />
      <rect x="42" y="14" width="10" height="28" rx="2" className="miniPreview__keyWhite" />
      <rect x="52" y="14" width="10" height="28" rx="2" className="miniPreview__keyWhite" />
      <rect x="62" y="14" width="10" height="28" rx="2" className="miniPreview__keyWhite" />
      <rect x="72" y="14" width="10" height="28" rx="2" className="miniPreview__keyWhite" />

      {/* black keys (2-3 pattern) */}
      <rect x="19" y="14" width="6" height="14" rx="2" className="miniPreview__blackKey" />
      <rect x="29" y="14" width="6" height="14" rx="2" className="miniPreview__blackKey" />
      <rect x="49" y="14" width="6" height="14" rx="2" className="miniPreview__blackKey" />
      <rect x="59" y="14" width="6" height="14" rx="2" className="miniPreview__blackKey" />
      <rect x="69" y="14" width="6" height="14" rx="2" className="miniPreview__blackKey" />

      {/* measured range overlay on keyboard */}
      <rect x="25" y="30" width="38" height="9" rx="4.5" className="miniPreview__overlayBand" />
      <circle cx="25" cy="34.5" r="2.7" className="miniPreview__rangeMarker" />
      <circle cx="63" cy="34.5" r="2.7" className="miniPreview__rangeMarker" />
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
      <rect x="6" y="10" width="84" height="36" rx="8" className="miniPreview__pitchPanel" />

      {/* pitch space guides */}
      <line x1="14" y1="17" x2="82" y2="17" className="miniPreview__pitchGuideLine" />
      <line x1="14" y1="28" x2="82" y2="28" className="miniPreview__pitchGuideLine" />
      <line x1="14" y1="39" x2="82" y2="39" className="miniPreview__pitchGuideLine" />

      {/* timeline pills (single layer, staggered) */}
      <rect x="14" y="32" width="14" height="7" rx="3.5" className="miniPreview__pitchPill" />
      <rect x="31" y="14" width="22" height="7" rx="3.5" className="miniPreview__pitchPill" />
      <rect x="55" y="20" width="12" height="7" rx="3.5" className="miniPreview__pitchPill" />
      <rect x="69" y="25" width="20" height="7" rx="3.5" className="miniPreview__pitchPill" />
    </svg>
  );
}
