import { useEffect, useMemo, useRef } from "react";

import type { DailyNotePoint } from "../../../types/insights";
import "./NotePitchChart.css";

function noteNameFromMidi(midi: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const note = names[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

function yFromMidi(midi: number, minMidi: number, maxMidi: number, h: number, pad: number): number {
  const innerH = h - pad * 2;
  const range = Math.max(1, maxMidi - minMidi);
  const ratio = (midi - minMidi) / range;
  return pad + innerH - innerH * ratio;
}

type PlotPoint = { x: number; y: number; key: string };

function toPlotPoints(
  points: DailyNotePoint[],
  minMidi: number,
  maxMidi: number,
  w: number,
  h: number,
  pad: number
): PlotPoint[] {
  const plot: PlotPoint[] = [];
  points.forEach((p, i) => {
    if (p.midi == null) return;
    const x = pad + ((w - pad * 2) * i) / Math.max(1, points.length - 1);
    const y = yFromMidi(p.midi, minMidi, maxMidi, h, pad);
    plot.push({ x, y, key: p.date });
  });
  return plot;
}

function buildSmoothPath(points: PlotPoint[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }

  return d;
}

function buildAreaPath(points: PlotPoint[], baselineY: number): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${baselineY} L ${p.x} ${p.y} L ${p.x} ${baselineY} Z`;
  }

  const first = points[0];
  const last = points[points.length - 1];
  const line = buildSmoothPath(points);
  return `${line} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

function tickLabel(dateISO: string) {
  const m = dateISO.slice(5, 7);
  const d = dateISO.slice(8, 10);
  return `${m}/${d}`;
}

export default function NotePitchChart({
  falsetto,
  chest,
  showXAxis = false,
  variant = "both",
}: {
  falsetto: DailyNotePoint[];
  chest: DailyNotePoint[];
  showXAxis?: boolean;
  variant?: "both" | "falsetto" | "chest";
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const H = 210;
  const PAD = 18;

  const visibleFalsetto = variant === "chest" ? [] : falsetto;
  const visibleChest = variant === "falsetto" ? [] : chest;
  const points = visibleFalsetto.length > 0 ? visibleFalsetto : visibleChest;

  const { minMidi, maxMidi, ticks } = useMemo(() => {
    const all = [...visibleFalsetto, ...visibleChest].map((x) => x.midi).filter((x): x is number => x != null);

    if (all.length === 0) {
      const min = 60;
      const max = 72;
      return {
        minMidi: min,
        maxMidi: max,
        ticks: [max, max - 3, max - 6, min],
      };
    }

    const min = Math.min(...all);
    const max = Math.max(...all);
    const pad = Math.max(1, Math.ceil((max - min) * 0.12));
    const floor = min - pad;
    const ceil = max + pad;

    const step = Math.max(1, Math.round((ceil - floor) / 3));
    return {
      minMidi: floor,
      maxMidi: ceil,
      ticks: [ceil, ceil - step, ceil - step * 2, floor],
    };
  }, [visibleChest, visibleFalsetto]);

  const width = Math.max(640, points.length * 18);
  const labelStep = useMemo(() => {
    if (points.length >= 300) return 30;
    if (points.length >= 120) return 14;
    if (points.length >= 60) return 7;
    if (points.length >= 30) return 5;
    return Math.max(1, Math.floor(points.length / 6));
  }, [points.length]);

  const falPlot = useMemo(
    () => toPlotPoints(visibleFalsetto, minMidi, maxMidi, width, H, PAD),
    [minMidi, maxMidi, visibleFalsetto, width]
  );
  const chestPlot = useMemo(
    () => toPlotPoints(visibleChest, minMidi, maxMidi, width, H, PAD),
    [minMidi, maxMidi, visibleChest, width]
  );
  const baselineY = H - PAD;

  const falPath = useMemo(() => buildSmoothPath(falPlot), [falPlot]);
  const chestPath = useMemo(() => buildSmoothPath(chestPlot), [chestPlot]);
  const falAreaPath = useMemo(() => buildAreaPath(falPlot, baselineY), [falPlot, baselineY]);
  const chestAreaPath = useMemo(() => buildAreaPath(chestPlot, baselineY), [chestPlot, baselineY]);
  const guidePlot = useMemo(() => {
    if (variant === "falsetto") return falPlot;
    if (variant === "chest") return chestPlot;
    return falPlot.length > 0 ? falPlot : chestPlot;
  }, [chestPlot, falPlot, variant]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const raf = requestAnimationFrame(() => {
      el.scrollLeft = el.scrollWidth;
    });

    return () => cancelAnimationFrame(raf);
  }, [width, showXAxis, visibleFalsetto.length, visibleChest.length]);

  return (
    <div className="notePitchChart">
      {variant === "both" && (
        <div className="notePitchChart__legend">
          <span className="notePitchChart__chip notePitchChart__chip--fal">裏声</span>
          <span className="notePitchChart__chip notePitchChart__chip--chest">地声</span>
        </div>
      )}

      <div className="notePitchChart__plot">
        <div className="notePitchChart__yAxis" aria-hidden="true">
          {ticks.map((m) => {
            const y = yFromMidi(m, minMidi, maxMidi, H, PAD);
            return (
              <div key={`tick-${m}`} className="notePitchChart__yTick" style={{ top: `${y}px` }}>
                {noteNameFromMidi(m)}
              </div>
            );
          })}
        </div>

        <div className="notePitchChart__scroll" ref={scrollRef}>
          <div style={{ width, minWidth: 0 }}>
            <svg viewBox={`0 0 ${width} ${H}`} className="notePitchChart__svg" preserveAspectRatio="none">
              <defs>
                <linearGradient id="noteChestArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(37, 99, 235, 0.46)" />
                  <stop offset="70%" stopColor="rgba(96, 165, 250, 0.24)" />
                  <stop offset="100%" stopColor="rgba(255, 255, 255, 0.95)" />
                </linearGradient>
                <linearGradient id="noteFalArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(20, 184, 166, 0.44)" />
                  <stop offset="70%" stopColor="rgba(45, 212, 191, 0.22)" />
                  <stop offset="100%" stopColor="rgba(255, 255, 255, 0.95)" />
                </linearGradient>
              </defs>

              {guidePlot.map((p) => {
                return (
                  <line
                    key={`v-guide-${p.key}`}
                    x1={p.x}
                    x2={p.x}
                    y1={H - PAD}
                    y2={p.y}
                    stroke="rgba(37, 99, 235, 0.24)"
                  />
                );
              })}

              {ticks.map((m) => {
                const y = yFromMidi(m, minMidi, maxMidi, H, PAD);
                return (
                  <line
                    key={`grid-${m}`}
                    x1={PAD}
                    x2={width - PAD}
                    y1={y}
                    y2={y}
                    stroke="rgba(56, 124, 205, 0.2)"
                  />
                );
              })}

              {falAreaPath && <path d={falAreaPath} fill="url(#noteFalArea)" />}
              {chestAreaPath && <path d={chestAreaPath} fill="url(#noteChestArea)" />}

              {falPlot.map((p) => {
                return <circle key={`f-halo-${p.key}`} cx={p.x} cy={p.y} r="6.2" fill="rgba(45, 212, 191, 0.28)" />;
              })}
              {chestPlot.map((p) => {
                return <circle key={`c-halo-${p.key}`} cx={p.x} cy={p.y} r="6.8" fill="rgba(59, 130, 246, 0.3)" />;
              })}

              {falPath && (
                <path
                  d={falPath}
                  fill="none"
                  stroke="color-mix(in srgb, #2dd4bf 88%, #0f766e)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {chestPath && (
                <path
                  d={chestPath}
                  fill="none"
                  stroke="color-mix(in srgb, #3b82f6 88%, #1d4ed8)"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {falPlot.map((p) => {
                return (
                  <circle
                    key={`f-core-${p.key}`}
                    cx={p.x}
                    cy={p.y}
                    r="3.8"
                    fill="color-mix(in srgb, #67e8f9 78%, white)"
                    stroke="color-mix(in srgb, #2dd4bf 88%, #0f766e)"
                    strokeWidth="0.8"
                  />
                );
              })}

              {chestPlot.map((p) => {
                return (
                  <circle
                    key={`c-core-${p.key}`}
                    cx={p.x}
                    cy={p.y}
                    r="4.2"
                    fill="color-mix(in srgb, #93c5fd 78%, white)"
                    stroke="color-mix(in srgb, #3b82f6 88%, #1d4ed8)"
                    strokeWidth="0.8"
                  />
                );
              })}
            </svg>

            {showXAxis && (
              <div className="notePitchChart__labels" style={{ width }}>
                {points.map((p, i) => {
                  if (i % labelStep !== 0 && i !== points.length - 1) return null;
                  const leftPct = (i / Math.max(1, points.length - 1)) * 100;
                  return (
                    <div
                      key={`x-${p.date}`}
                      className="notePitchChart__label"
                      style={{
                        left: `${leftPct}%`,
                        transform: "translateX(-50%)",
                      }}
                    >
                      {tickLabel(p.date)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
