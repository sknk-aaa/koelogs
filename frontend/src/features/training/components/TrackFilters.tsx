// frontend/src/features/training/components/TrackFilters.tsx
import type { ScaleType, Tempo } from "../../../api/scaleTracks";

type Props = {
  scaleType: ScaleType;
  tempo: Tempo;
  scaleTypes: readonly ScaleType[];
  tempos: readonly Tempo[];
  disabled?: boolean;
  onChangeScaleType: (v: ScaleType) => void;
  onChangeTempo: (v: Tempo) => void;
};

function labelScale(t: ScaleType) {
  return t === "5tone" ? "5 tone" : "octave";
}

export default function TrackFilters({
  scaleType,
  tempo,
  scaleTypes,
  tempos,
  disabled = false,
  onChangeScaleType,
  onChangeTempo,
}: Props) {
  return (
    <div style={styles.wrap}>
      {/* スケール：プルダウン */}
      <div style={styles.block}>
        <div style={styles.labelRow}>
          <div style={styles.label}>スケール</div>
          <div style={styles.valuePill}>選択中: {labelScale(scaleType)}</div>
        </div>

        <div style={styles.selectWrap}>
          <select
            value={scaleType}
            disabled={disabled}
            onChange={(e) => onChangeScaleType(e.target.value as ScaleType)}
            style={styles.select}
            aria-label="scale type"
          >
            {scaleTypes.map((t) => (
              <option key={t} value={t}>
                {labelScale(t)}
              </option>
            ))}
          </select>

          <div style={styles.selectChevron} aria-hidden="true">
            <ChevronDown />
          </div>
        </div>
      </div>

      {/* テンポ：ボタン（使いやすさ優先で維持） */}
      <div style={styles.block}>
        <div style={styles.labelRow}>
          <div style={styles.label}>テンポ</div>
          <div style={styles.valuePill}>選択中: {tempo}</div>
        </div>

        <div style={styles.grid3}>
          {tempos.map((t) => {
            const active = t === tempo;
            return (
              <button
                key={t}
                type="button"
                disabled={disabled}
                onClick={() => onChangeTempo(t)}
                style={{
                  ...styles.segBtn,
                  ...(active ? styles.segBtnActive : null),
                  ...(disabled ? styles.segBtnDisabled : null),
                }}
                aria-pressed={active}
              >
                {t}
              </button>
            );
          })}
        </div>

        <div style={styles.helpText}>※ テンポは BPM の目安</div>
      </div>
    </div>
  );
}

function ChevronDown() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        d="M6 9l6 6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: "grid",
    gap: 14,
    minWidth: 0,
  },

  block: {
    display: "grid",
    gap: 10,
    minWidth: 0,
  },

  labelRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    minWidth: 0,
  },

  label: {
    fontSize: 13,
    fontWeight: 900,
    opacity: 0.9,
  },

  valuePill: {
    fontSize: 12,
    fontWeight: 900,
    opacity: 0.75,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(0,0,0,0.02)",
    borderRadius: 999,
    padding: "6px 10px",
    whiteSpace: "nowrap",
  },

  // ===== Select =====
  selectWrap: {
    position: "relative",
    minWidth: 0,
  },

  select: {
    width: "100%",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    border: "1px solid rgba(0,0,0,0.10)",
    background: "#fff",
    borderRadius: 14,
    padding: "12px 44px 12px 12px",
    fontSize: 14,
    fontWeight: 900,
    minHeight: 44, // ✅ タップしやすい
    outline: "none",
  },

  selectChevron: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
    opacity: 0.7,
  },

  // ===== Tempo buttons =====
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
  },

  segBtn: {
    appearance: "none",
    border: "1px solid rgba(0,0,0,0.10)",
    background: "#fff",
    borderRadius: 14,
    padding: "12px 10px",
    fontSize: 14,
    fontWeight: 900,
    cursor: "pointer",
    minHeight: 44, // ✅ タップしやすい
    transition: "transform 80ms ease, background 120ms ease, border-color 120ms ease",
  },

  segBtnActive: {
    background: "rgba(0,0,0,0.08)",
    border: "1px solid rgba(0,0,0,0.18)",
  },

  segBtnDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },

  helpText: {
    fontSize: 12,
    opacity: 0.65,
    lineHeight: 1.5,
  },
};
