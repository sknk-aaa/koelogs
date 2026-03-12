// frontend/src/features/training/components/TrackFilters.tsx
import type { ScaleRange, ScaleType } from "../../../api/scaleTracks";
import AppSelect from "../../../components/AppSelect";
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
  return (
    <div className="trackFilters">
      {/* スケール：プルダウン */}
      <div className="trackFilters__block">
        <div className="trackFilters__labelRow">
          <div className="trackFilters__label">スケール</div>
        </div>

        <div className="trackFilters__selectWrap">
          <div
            className={`trackFilters__selectSurface${disabled ? " is-disabled" : ""}`}
          >
            <AppSelect
              value={scaleType}
              disabled={disabled}
              onChange={(value) => onChangeScaleType(value as ScaleType)}
              className="trackFilters__select"
              buttonClassName="trackFilters__selectButton"
              menuClassName="trackFilters__selectMenu"
              ariaLabel="scale type"
              options={scaleTypes.map((t) => ({ value: t, label: labelScale(t) }))}
            />
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
