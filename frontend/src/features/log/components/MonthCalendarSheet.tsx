import { useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  selectedDate: string;
  month: string;
  onClose: () => void;
  onSelectDate: (date: string) => void;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseMonth(value: string): Date {
  const matched = value.match(/^(\d{4})-(\d{2})$/);
  if (!matched) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return new Date(Number.parseInt(matched[1], 10), Number.parseInt(matched[2], 10) - 1, 1);
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function addMonths(month: string, diff: number): string {
  const date = parseMonth(month);
  date.setMonth(date.getMonth() + diff);
  return toMonthKey(date);
}

function monthLabel(month: string): string {
  const date = parseMonth(month);
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function weekdayIndexMondayStart(day: number): number {
  return (day + 6) % 7;
}

function buildCalendarDays(month: string): Array<{ iso: string; day: number; inMonth: boolean }> {
  const firstDay = parseMonth(month);
  const startOffset = weekdayIndexMondayStart(firstDay.getDay());
  const start = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return {
      iso: toISODate(date),
      day: date.getDate(),
      inMonth: date.getMonth() === firstDay.getMonth(),
    };
  });
}

const WEEK_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

export default function MonthCalendarSheet({ open, selectedDate, month, onClose, onSelectDate }: Props) {
  const [visibleMonth, setVisibleMonth] = useState(month);

  useEffect(() => {
    if (!open) return;
    setVisibleMonth(month);
  }, [month, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  const today = useMemo(() => toISODate(new Date()), []);
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const selectedMonthKey = selectedDate.slice(0, 7);

  if (!open) return null;

  return (
    <div className="logMonthSheet" role="dialog" aria-modal="true" aria-label="月カレンダー">
      <button type="button" className="logMonthSheet__backdrop" aria-label="閉じる" onClick={onClose} />
      <section className="logMonthSheet__panel">
        <div className="logMonthSheet__grabber" aria-hidden="true" />
        <div className="logMonthSheet__head">
          <button type="button" className="logMonthSheet__nav" onClick={() => setVisibleMonth((prev) => addMonths(prev, -1))}>
            ‹
          </button>
          <div className="logMonthSheet__title">{monthLabel(visibleMonth)}</div>
          <button type="button" className="logMonthSheet__nav" onClick={() => setVisibleMonth((prev) => addMonths(prev, 1))}>
            ›
          </button>
        </div>
        <div className="logMonthSheet__weekdays" aria-hidden="true">
          {WEEK_LABELS.map((label) => (
            <span key={label} className="logMonthSheet__weekday">
              {label}
            </span>
          ))}
        </div>
        <div className="logMonthSheet__grid">
          {calendarDays.map((day) => {
            const isSelected = day.iso === selectedDate;
            const isToday = day.iso === today;
            const isDimmed = !day.inMonth;
            return (
              <button
                key={day.iso}
                type="button"
                className={[
                  "logMonthSheet__day",
                  isSelected ? "is-selected" : "",
                  isToday ? "is-today" : "",
                  isDimmed ? "is-dimmed" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onSelectDate(day.iso)}
                aria-pressed={isSelected}
              >
                {day.day}
              </button>
            );
          })}
        </div>
        <div className="logMonthSheet__footer">
          <button
            type="button"
            className="logMonthSheet__today"
            onClick={() => {
              const next = today;
              setVisibleMonth(`${next.slice(0, 7)}`);
              onSelectDate(next);
            }}
          >
            今日へ
          </button>
          {selectedMonthKey !== visibleMonth && (
            <button
              type="button"
              className="logMonthSheet__today logMonthSheet__today--subtle"
              onClick={() => setVisibleMonth(month)}
            >
              選択月へ戻る
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
