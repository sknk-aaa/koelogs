import { useMemo } from "react";

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

function buildPath(points: DailyNotePoint[], minMidi: number, maxMidi: number, w: number, h: number, pad: number): string {
  let d = "";
  let started = false;

  points.forEach((p, i) => {
    if (p.midi == null) {
      return;
    }

    const x = pad + ((w - pad * 2) * i) / Math.max(1, points.length - 1);
    const y = yFromMidi(p.midi, minMidi, maxMidi, h, pad);

    if (!started) {
      d += `M ${x} ${y}`;
      started = true;
      return;
    }

    d += ` L ${x} ${y}`;
  });

  return d;
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
}: {
  falsetto: DailyNotePoint[];
  chest: DailyNotePoint[];
  showXAxis?: boolean;
}) {
  const H = 210;
  const PAD = 18;

  const points = falsetto.length > 0 ? falsetto : chest;

  const { minMidi, maxMidi, ticks } = useMemo(() => {
    const all = [...falsetto, ...chest].map((x) => x.midi).filter((x): x is number => x != null);

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
  }, [chest, falsetto]);

  const width = Math.max(640, points.length * 10);
  const labelStep = useMemo(() => {
    if (points.length >= 300) return 30;
    if (points.length >= 120) return 14;
    if (points.length >= 60) return 7;
    if (points.length >= 30) return 5;
    return Math.max(1, Math.floor(points.length / 6));
  }, [points.length]);

  const falPath = useMemo(
    () => buildPath(falsetto, minMidi, maxMidi, width, H, PAD),
    [falsetto, minMidi, maxMidi, width]
  );
  const chestPath = useMemo(
    () => buildPath(chest, minMidi, maxMidi, width, H, PAD),
    [chest, minMidi, maxMidi, width]
  );

  return (
    <div className="notePitchChart">
      <div className="notePitchChart__legend">
        <span className="notePitchChart__chip notePitchChart__chip--fal">裏声</span>
        <span className="notePitchChart__chip notePitchChart__chip--chest">地声</span>
      </div>

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

        <div className="notePitchChart__scroll">
          <div style={{ width, minWidth: 0 }}>
            <svg viewBox={`0 0 ${width} ${H}`} className="notePitchChart__svg" preserveAspectRatio="none">
              {ticks.map((m) => {
                const y = yFromMidi(m, minMidi, maxMidi, H, PAD);
                return (
                  <line
                    key={`grid-${m}`}
                    x1={PAD}
                    x2={width - PAD}
                    y1={y}
                    y2={y}
                    stroke="rgba(0,0,0,0.12)"
                    strokeDasharray="4 4"
                  />
                );
              })}

              <path d={falPath} fill="none" stroke="color-mix(in srgb, #f472b6 70%, #111)" strokeWidth="2.8" />
              <path d={chestPath} fill="none" stroke="color-mix(in srgb, #60a5fa 72%, #111)" strokeWidth="2.8" />

              {falsetto.map((p, i) => {
                if (p.midi == null) return null;
                const x = PAD + ((width - PAD * 2) * i) / Math.max(1, falsetto.length - 1);
                const y = yFromMidi(p.midi, minMidi, maxMidi, H, PAD);
                return <circle key={`f-${p.date}`} cx={x} cy={y} r="2.8" fill="color-mix(in srgb, #f472b6 78%, #111)" />;
              })}

              {chest.map((p, i) => {
                if (p.midi == null) return null;
                const x = PAD + ((width - PAD * 2) * i) / Math.max(1, chest.length - 1);
                const y = yFromMidi(p.midi, minMidi, maxMidi, H, PAD);
                return <circle key={`c-${p.date}`} cx={x} cy={y} r="2.8" fill="color-mix(in srgb, #60a5fa 82%, #111)" />;
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
