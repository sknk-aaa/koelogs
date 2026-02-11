import type { ScaleType, Tempo } from "../../../api/scaleTracks";
import { styles } from "../styles";

type Props = {
  scaleType: ScaleType;
  tempo: Tempo;
  scaleTypes: ScaleType[];
  tempos: Tempo[];
  disabled: boolean;
  onChangeScaleType: (v: ScaleType) => void;
  onChangeTempo: (v: Tempo) => void;
};

export default function TrackFilters({
  scaleType,
  tempo,
  scaleTypes,
  tempos,
  disabled,
  onChangeScaleType,
  onChangeTempo,
}: Props) {
  return (
    <>

      <div style={styles.field}>
        <label style={styles.label}>スケール</label>
        <select
          style={styles.select}
          value={scaleType}
          disabled={disabled}
          onChange={(e) => onChangeScaleType(e.target.value as ScaleType)}
        >
          {scaleTypes.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>テンポ</label>
        <div style={styles.segmentWrap} aria-disabled={disabled}>
          {tempos.map((tp) => {
            const active = tp === tempo;
            return (
              <button
                key={tp}
                type="button"
                disabled={disabled}
                onClick={() => onChangeTempo(tp)}
                style={{
                  ...styles.segmentBtn,
                  ...(active ? styles.segmentBtnActive : null),
                }}
              >
                {tp}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}