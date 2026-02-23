// frontend/src/features/training/components/TrackFilters.tsx
import { useState } from "react";
import type { ScaleType, Tempo } from "../../../api/scaleTracks";
import "./TrackFilters.css";

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

  return (
    <div className="trackFilters">
      {/* スケール：プルダウン */}
      <div className="trackFilters__block">
        <div className="trackFilters__labelRow">
          <div className="trackFilters__label">スケール</div>
        </div>

        <div className="trackFilters__selectWrap">
          <div
            className={`trackFilters__selectSurface${selectFocused ? " is-focused" : ""}${
              disabled ? " is-disabled" : ""
            }`}
          >
            <select
              value={scaleType}
              disabled={disabled}
              onChange={(e) => onChangeScaleType(e.target.value as ScaleType)}
              onFocus={() => setSelectFocused(true)}
              onBlur={() => setSelectFocused(false)}
              className="trackFilters__select"
              aria-label="scale type"
            >
              {scaleTypes.map((t) => (
                <option key={t} value={t}>
                  {labelScale(t)}
                </option>
              ))}
            </select>

            <div className="trackFilters__selectChevron" aria-hidden="true">
              <ChevronDown />
            </div>
          </div>
        </div>
      </div>

      {/* テンポ：ボタン（使いやすさ優先で維持） */}
      <div className="trackFilters__block">
        <div className="trackFilters__labelRow">
          <div className="trackFilters__label">テンポ</div>
        </div>

        <div className="trackFilters__grid3">
          {tempos.map((t) => {
            const active = t === tempo;
            return (
              <button
                key={t}
                type="button"
                disabled={disabled}
                onClick={() => onChangeTempo(t)}
                className={`trackFilters__tempoBtn${active ? " is-active" : ""}`}
                aria-pressed={active}
              >
                {t} BPM
              </button>
            );
          })}
        </div>
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
