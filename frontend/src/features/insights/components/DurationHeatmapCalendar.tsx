import { useMemo, useRef, useState, type PointerEventHandler } from "react";

import type { DailyDurationPoint } from "../../../types/insights";
import "./DurationHeatmapCalendar.css";

type Cell = {
  key: string;
  date: Date | null;
  iso: string | null;
  duration: number;
  level: 0 | 1 | 2 | 3 | 4;
  isToday: boolean;
};

function toLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function durationLevel(duration: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (duration <= 0 || max <= 0) return 0;
  const r = duration / max;
  if (r >= 0.75) return 4;
  if (r >= 0.5) return 3;
  if (r >= 0.25) return 2;
  return 1;
}

function formatTooltip(iso: string, duration: number): string {
  return `${iso}: ${duration} 分`;
}

export default function DurationHeatmapCalendar({ points }: { points: DailyDurationPoint[] }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragStateRef = useRef<{ startX: number; startScrollLeft: number } | null>(null);

  const max = useMemo(() => points.reduce((m, p) => Math.max(m, p.duration_min || 0), 0), [points]);
  const todayISO = useMemo(() => toISO(new Date()), []);
  const CELL_SIZE = 14;
  const GRID_GAP = 4;

  const { cells, weeks, monthTicks, gridWidth } = useMemo(() => {
    if (points.length === 0) {
      return {
        cells: [] as Cell[],
        weeks: 0,
        monthTicks: [] as Array<{ col: number; label: string }>,
        gridWidth: 0,
      };
    }

    const byDate = new Map<string, number>();
    points.forEach((p) => byDate.set(p.date, p.duration_min || 0));

    const start = toLocalDate(points[0].date);
    const end = toLocalDate(points[points.length - 1].date);

    const startPad = addDays(start, -start.getDay());
    const endPad = addDays(end, 6 - end.getDay());

    const out: Cell[] = [];
    for (let cur = new Date(startPad); cur <= endPad; cur = addDays(cur, 1)) {
      const iso = toISO(cur);
      const inRange = cur >= start && cur <= end;
      const duration = inRange ? byDate.get(iso) || 0 : 0;
      out.push({
        key: iso,
        date: inRange ? new Date(cur) : null,
        iso: inRange ? iso : null,
        duration,
        level: inRange ? durationLevel(duration, max) : 0,
        isToday: inRange && iso === todayISO,
      });
    }

    const totalWeeks = Math.ceil(out.length / 7);
    const ticks: Array<{ col: number; label: string }> = [];

    let prevMonth: number | null = null;
    for (let w = 0; w < totalWeeks; w += 1) {
      const weekStart = addDays(startPad, w * 7);
      const m = weekStart.getMonth();
      if (prevMonth !== m) {
        ticks.push({
          col: w,
          label: weekStart.toLocaleString("en-US", { month: "short" }),
        });
        prevMonth = m;
      }
    }

    const width = totalWeeks > 0 ? totalWeeks * CELL_SIZE + (totalWeeks - 1) * GRID_GAP : 0;

    return {
      cells: out,
      weeks: totalWeeks,
      monthTicks: ticks,
      gridWidth: width,
    };
  }, [max, points, todayISO]);

  if (points.length === 0) {
    return <div className="durationHeatmap__empty">データがありません</div>;
  }

  const onPointerDown: PointerEventHandler<HTMLDivElement> = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    dragStateRef.current = {
      startX: e.clientX,
      startScrollLeft: el.scrollLeft,
    };
    setDragging(true);
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove: PointerEventHandler<HTMLDivElement> = (e) => {
    const el = scrollRef.current;
    const s = dragStateRef.current;
    if (!el || !s) return;
    const dx = e.clientX - s.startX;
    el.scrollLeft = s.startScrollLeft - dx;
  };

  const onPointerEnd: PointerEventHandler<HTMLDivElement> = (e) => {
    const el = scrollRef.current;
    if (el && el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    dragStateRef.current = null;
    setDragging(false);
  };

  return (
    <div className="durationHeatmap">
      <div className="durationHeatmap__meta">最大: {max} 分</div>

      <div className="durationHeatmap__wrap">
        <div className="durationHeatmap__dow" aria-hidden="true">
          <span>日</span>
          <span>月</span>
          <span>火</span>
          <span>水</span>
          <span>木</span>
          <span>金</span>
          <span>土</span>
        </div>

        <div
          ref={scrollRef}
          className={`durationHeatmap__scroll${dragging ? " is-dragging" : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onPointerLeave={onPointerEnd}
        >
          <div className="durationHeatmap__inner" style={{ width: `${Math.max(gridWidth, 280)}px` }}>
            <div className="durationHeatmap__months">
              {monthTicks.map((t) => (
                <span
                  key={`${t.label}-${t.col}`}
                  className="durationHeatmap__month"
                  style={{ left: `${t.col * (CELL_SIZE + GRID_GAP)}px` }}
                >
                  {t.label}
                </span>
              ))}
            </div>

            <div
              className="durationHeatmap__grid"
              style={{ gridTemplateColumns: `repeat(${weeks}, ${CELL_SIZE}px)` }}
            >
              {cells.map((c, idx) => (
                <div
                  key={`${c.key}-${idx}`}
                  className={`durationHeatmap__cell level-${c.level}${c.date ? "" : " is-pad"}${c.isToday ? " is-today" : ""}`}
                  style={{ gridColumn: Math.floor(idx / 7) + 1, gridRow: (idx % 7) + 1 }}
                  title={c.iso ? formatTooltip(c.iso, c.duration) : ""}
                  aria-label={c.iso ? formatTooltip(c.iso, c.duration) : undefined}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="durationHeatmap__legend" aria-hidden="true">
        <span>少</span>
        <i className="durationHeatmap__cell level-0" />
        <i className="durationHeatmap__cell level-1" />
        <i className="durationHeatmap__cell level-2" />
        <i className="durationHeatmap__cell level-3" />
        <i className="durationHeatmap__cell level-4" />
        <span>多</span>
      </div>
    </div>
  );
}
