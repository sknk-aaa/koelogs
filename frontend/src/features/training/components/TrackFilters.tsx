// frontend/src/features/training/components/TrackFilters.tsx
import { useState } from "react";
import type { ScaleRange, ScaleType } from "../../../api/scaleTracks";
import "./TrackFilters.css";

type Props = {
  scaleType: ScaleType;
  rangeType: ScaleRange;
  scaleTypes: readonly ScaleType[];
  rangeTypes: readonly ScaleRange[];
  disabled?: boolean;
  onChangeScaleType: (v: ScaleType) => void;
  onChangeRangeType: (v: ScaleRange) => void;
};

function labelScale(t: ScaleType) {
  if (t === "5tone") return "5tone";
  if (t === "Descending5tone") return "下降5tone";
  if (t === "triad") return "トライアド";
  if (t === "Risingoctave") return "上昇オクターブ";
  return "オクターブ+1";
}

function labelRange(r: ScaleRange) {
  if (r === "low") return "低";
  if (r === "mid") return "中";
  return "高";
}

export default function TrackFilters({
  scaleType,
  rangeType,
  scaleTypes,
  rangeTypes,
  disabled = false,
  onChangeScaleType,
  onChangeRangeType,
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

      {/* 音域タイプ：ボタン */}
      <div className="trackFilters__block">
        <div className="trackFilters__labelRow">
          <div className="trackFilters__label">音域タイプ</div>
        </div>

        <div className="trackFilters__grid3">
          {rangeTypes.map((r) => {
            const active = r === rangeType;
            return (
              <button
                key={r}
                type="button"
                disabled={disabled}
                onClick={() => onChangeRangeType(r)}
                className={`trackFilters__rangeBtn${active ? " is-active" : ""}`}
                aria-pressed={active}
              >
                {labelRange(r)}
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
