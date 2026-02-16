import { useMemo, useRef } from "react";

type Props = {
  value: string; // YYYY-MM-DD
  onChange: (nextISO: string) => void;
};

const DOW = ["日", "月", "火", "水", "木", "金", "土"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 日付だけを安定して扱うため、ローカルTZの 12:00 固定で Date を作る
 */
function fromISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeekSunday(d: Date) {
  const day = d.getDay(); // 0..6 (Sun..Sat)
  return addDays(d, -day);
}

function sameISO(a: string, b: string) {
  return a === b;
}

export default function WeekCalendar({ value, onChange }: Props) {
  const selected = useMemo(() => fromISODate(value), [value]);
  const weekStart = useMemo(() => startOfWeekSunday(selected), [selected]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const todayISO = useMemo(() => {
    const n = new Date();
    return toISODate(new Date(n.getFullYear(), n.getMonth(), n.getDate(), 12));
  }, []);

  const selectedISO = toISODate(selected);

  // 表示月（選択日の月を基準）
  const title = `${selected.getFullYear()}/${selected.getMonth() + 1}`;

  const goPrevWeek = () => onChange(toISODate(addDays(selected, -7)));
  const goNextWeek = () => onChange(toISODate(addDays(selected, 7)));

  // ✅ タイトルクリックでネイティブ日付ピッカーを開く（隠し input）
  const hiddenDateRef = useRef<HTMLInputElement | null>(null);

  const openNativePicker = () => {
    const el = hiddenDateRef.current;
    if (!el) return;

    // Chrome系: showPicker が使えることが多い
    if (typeof (el as HTMLInputElement & { showPicker?: () => void }).showPicker === "function") {
    (el as HTMLInputElement & { showPicker: () => void }).showPicker();
    return;
    }

    // それ以外: focus + click でできる範囲で開く
    el.focus();
    el.click();
  };

  return (
    <div className="weekCal" role="group" aria-label="週カレンダー">
      {/* 隠し date input（タイトルクリックで開く） */}
      <input
        ref={hiddenDateRef}
        className="weekCal__hiddenDate"
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-hidden="true"
        tabIndex={-1}
        />

      <div className="weekCal__top">
        <button
          type="button"
          className="weekCal__navBtn"
          onClick={goPrevWeek}
          aria-label="前の週"
        >
          ‹
        </button>

        {/* ✅ ここをクリックで直接指定 */}
        <button
          type="button"
          className="weekCal__titleBtn"
          onClick={openNativePicker}
          aria-label="日付を直接指定"
        >
          {title}
          <span className="weekCal__titleHint" aria-hidden="true">▼</span>
        </button>

        <button
          type="button"
          className="weekCal__navBtn"
          onClick={goNextWeek}
          aria-label="次の週"
        >
          ›
        </button>
      </div>

      <div className="weekCal__dow" aria-hidden="true">
        {DOW.map((w) => (
          <div key={w} className="weekCal__dowItem">
            {w}
          </div>
        ))}
      </div>

      <div className="weekCal__grid">
        {days.map((d) => {
          const iso = toISODate(d);
          const isSelected = sameISO(iso, selectedISO);
          const isToday = sameISO(iso, todayISO);
          const isOtherMonth = d.getMonth() !== selected.getMonth();

          return (
            <button
              key={iso}
              type="button"
              className={[
                "weekCal__day",
                isSelected ? "is-selected" : "",
                isToday ? "is-today" : "",
                isOtherMonth ? "is-otherMonth" : "",
              ].join(" ")}
              onClick={() => onChange(iso)}
              aria-label={`${d.getMonth() + 1}月${d.getDate()}日`}
              aria-pressed={isSelected}
            >
              <span className="weekCal__dayNum">{d.getDate()}</span>
              {isToday && <span className="weekCal__todayDot" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
