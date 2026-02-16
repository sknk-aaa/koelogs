// frontend/src/features/training/components/TrackFilters.tsx
import { useMemo, useState } from "react";
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
  const [selectFocused, setSelectFocused] = useState(false);

  const selectStyle = useMemo(() => {
    return {
      ...styles.select,
      ...(selectFocused ? styles.selectFocused : null),
      ...(disabled ? styles.selectDisabled : null),
    } as React.CSSProperties;
  }, [selectFocused, disabled]);

  const chevronStyle = useMemo(() => {
    return {
      ...styles.selectChevron,
      ...(disabled ? styles.selectChevronDisabled : null),
    } as React.CSSProperties;
  }, [disabled]);

  return (
    <div style={styles.wrap}>
      {/* スケール：プルダウン */}
      <div style={styles.block}>
        <div style={styles.labelRow}>
          <div style={styles.label}>スケール</div>
          <div style={styles.valuePill}>選択中: {labelScale(scaleType)}</div>
        </div>

        <div style={styles.selectWrap}>
          <div
            style={{
              ...styles.selectSurface,
              ...(selectFocused ? styles.selectSurfaceFocused : null),
              ...(disabled ? styles.selectSurfaceDisabled : null),
            }}
          >
            <select
              value={scaleType}
              disabled={disabled}
              onChange={(e) => onChangeScaleType(e.target.value as ScaleType)}
              onFocus={() => setSelectFocused(true)}
              onBlur={() => setSelectFocused(false)}
              style={selectStyle}
              aria-label="scale type"
            >
              {scaleTypes.map((t) => (
                <option key={t} value={t}>
                  {labelScale(t)}
                </option>
              ))}
            </select>

            <div style={chevronStyle} aria-hidden="true">
              <ChevronDown />
            </div>
          </div>

          <div style={styles.selectHint}>タップしてスケールを選択</div>
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
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path
        d="M6 9l6 6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
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
    opacity: 0.78,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(0,0,0,0.03)",
    borderRadius: 999,
    padding: "6px 10px",
    whiteSpace: "nowrap",
  },

  // ===== Select =====
  selectWrap: {
    display: "grid",
    gap: 6,
    minWidth: 0,
  },

  // 外側の“カード”部分（ここでおしゃれ感を作る）
  selectSurface: {
    position: "relative",
    minWidth: 0,
    borderRadius: 16,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(255,255,255,0.88)",
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
    overflow: "hidden",
    transition: "transform 80ms ease, box-shadow 120ms ease, border-color 120ms ease",
  },

  selectSurfaceFocused: {
    border: "1px solid rgba(0,0,0,0.22)",
    boxShadow: "0 10px 24px rgba(0,0,0,0.10)",
    transform: "translateY(-1px)",
  },

  selectSurfaceDisabled: {
    opacity: 0.6,
    boxShadow: "none",
    transform: "none",
  },

  // select本体（透明にして“カード”の見た目を活かす）
  select: {
    width: "100%",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    border: "none",
    background: "transparent",
    borderRadius: 0,
    padding: "14px 48px 14px 14px",
    fontSize: 15,
    fontWeight: 900,
    minHeight: 48, // タップしやすい
    outline: "none",
    color: "rgba(0,0,0,0.92)",
    cursor: "pointer",
  },

  // focus時は“文字”もほんの少し締める（好み）
  selectFocused: {
    color: "rgba(0,0,0,1)",
  },

  selectDisabled: {
    cursor: "not-allowed",
  },

  selectChevron: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
    opacity: 0.7,
  },

  selectChevronDisabled: {
    opacity: 0.45,
  },

  selectHint: {
    fontSize: 12,
    opacity: 0.6,
    lineHeight: 1.4,
    paddingLeft: 2,
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
    minHeight: 44,
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
