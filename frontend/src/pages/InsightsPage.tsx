import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  fetchLatestMeasurements,
  fetchMeasurements,
  type MeasurementRun,
} from "../api/measurements";
import MetronomeLoader from "../components/MetronomeLoader";
import { useAuth } from "../features/auth/useAuth";
import InsightsCardHeader from "../features/insights/components/InsightsCardHeader";
import "./InsightsPages.css";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      latest: {
        range: MeasurementRun | null;
        long_tone: MeasurementRun | null;
        volume_stability: MeasurementRun | null;
        pitch_accuracy: MeasurementRun | null;
      };
      longToneRuns: MeasurementRun[];
      rangeRuns: MeasurementRun[];
      pitchAccuracyRuns: MeasurementRun[];
    };

const GUEST_LATEST: {
  range: MeasurementRun | null;
  long_tone: MeasurementRun | null;
  volume_stability: MeasurementRun | null;
  pitch_accuracy: MeasurementRun | null;
} = {
  range: {
    id: -1,
    measurement_type: "range",
    include_in_insights: true,
    recorded_at: "2026-04-29T08:00:00+09:00",
    created_at: "2026-04-29T08:00:00+09:00",
    result: { lowest_note: "A#1", highest_note: "A5", chest_top_note: "B4", falsetto_top_note: "A5", range_semitones: 47, range_octaves: 3.92 },
  },
  long_tone: {
    id: -2,
    measurement_type: "long_tone",
    include_in_insights: true,
    recorded_at: "2026-02-18T08:00:00+09:00",
    created_at: "2026-02-18T08:00:00+09:00",
    result: { sustain_sec: 12.8, sustain_note: "B3" },
  },
  volume_stability: {
    id: -3,
    measurement_type: "volume_stability",
    include_in_insights: true,
    recorded_at: "2026-02-19T08:00:00+09:00",
    created_at: "2026-02-19T08:00:00+09:00",
    result: {
      avg_loudness_db: -68.4,
      min_loudness_db: -74.2,
      max_loudness_db: -62.1,
      loudness_range_db: 12.1,
      loudness_range_ratio: 0.177,
      loudness_range_pct: 17.7,
    },
  },
  pitch_accuracy: {
    id: -4,
    measurement_type: "pitch_accuracy",
    include_in_insights: true,
    recorded_at: "2026-02-20T08:00:00+09:00",
    created_at: "2026-02-20T08:00:00+09:00",
    result: {
      avg_cents_error: 22.4,
      accuracy_score: 77.6,
      note_count: 96,
    },
  },
};

const GUEST_LONG_TONE_RUNS: MeasurementRun[] = [
  {
    id: -29,
    measurement_type: "long_tone",
    include_in_insights: true,
    recorded_at: "2025-12-22T08:00:00+09:00",
    created_at: "2025-12-22T08:00:00+09:00",
    result: { sustain_sec: 6.1, sustain_note: "F#3" },
  },
  {
    id: -28,
    measurement_type: "long_tone",
    include_in_insights: true,
    recorded_at: "2025-12-29T08:00:00+09:00",
    created_at: "2025-12-29T08:00:00+09:00",
    result: { sustain_sec: 6.8, sustain_note: "G3" },
  },
  {
    id: -27,
    measurement_type: "long_tone",
    include_in_insights: true,
    recorded_at: "2026-01-04T08:00:00+09:00",
    created_at: "2026-01-04T08:00:00+09:00",
    result: { sustain_sec: 6.4, sustain_note: "F#3" },
  },
  {
    id: -26,
    measurement_type: "long_tone",
    include_in_insights: true,
    recorded_at: "2026-01-10T08:00:00+09:00",
    created_at: "2026-01-10T08:00:00+09:00",
    result: { sustain_sec: 6.9, sustain_note: "G3" },
  },
  {
    id: -25,
    measurement_type: "long_tone",
    include_in_insights: true,
    recorded_at: "2026-01-18T08:00:00+09:00",
    created_at: "2026-01-18T08:00:00+09:00",
    result: { sustain_sec: 7.5, sustain_note: "A3" },
  },
  {
    id: -24,
    measurement_type: "long_tone",
    include_in_insights: true,
    recorded_at: "2026-01-22T08:00:00+09:00",
    created_at: "2026-01-22T08:00:00+09:00",
    result: { sustain_sec: 8.0, sustain_note: "A3" },
  },
  {
    id: -233,
    measurement_type: "long_tone",
    include_in_insights: true,
    recorded_at: "2026-01-28T08:00:00+09:00",
    created_at: "2026-01-28T08:00:00+09:00",
    result: { sustain_sec: 7.7, sustain_note: "A3" },
  },
  {
    id: -23,
    measurement_type: "long_tone",
    include_in_insights: true,
    recorded_at: "2026-01-25T08:00:00+09:00",
    created_at: "2026-01-25T08:00:00+09:00",
    result: { sustain_sec: 8.2, sustain_note: "A3" },
  },
  {
    id: -22,
    measurement_type: "long_tone",
    include_in_insights: true,
    recorded_at: "2026-02-08T08:00:00+09:00",
    created_at: "2026-02-08T08:00:00+09:00",
    result: { sustain_sec: 9.6, sustain_note: "B3" },
  },
  {
    id: -221,
    measurement_type: "long_tone",
    include_in_insights: true,
    recorded_at: "2026-02-11T08:00:00+09:00",
    created_at: "2026-02-11T08:00:00+09:00",
    result: { sustain_sec: 9.1, sustain_note: "A#3" },
  },
  {
    id: -21,
    measurement_type: "long_tone",
    include_in_insights: true,
    recorded_at: "2026-02-13T08:00:00+09:00",
    created_at: "2026-02-13T08:00:00+09:00",
    result: { sustain_sec: 11.1, sustain_note: "B3" },
  },
  GUEST_LATEST.long_tone!,
];

const GUEST_RANGE_RUNS: MeasurementRun[] = [
  {
    id: -31,
    measurement_type: "range",
    include_in_insights: true,
    recorded_at: "2026-01-20T08:00:00+09:00",
    created_at: "2026-01-20T08:00:00+09:00",
    result: { lowest_note: "B1", highest_note: "G#5", chest_top_note: "A#4", falsetto_top_note: "G#5", range_semitones: 45, range_octaves: 3.75 },
  },
  GUEST_LATEST.range!,
];

const GUEST_PITCH_ACCURACY_RUNS: MeasurementRun[] = [
  {
    id: -47,
    measurement_type: "pitch_accuracy",
    include_in_insights: true,
    recorded_at: "2025-12-24T08:00:00+09:00",
    created_at: "2025-12-24T08:00:00+09:00",
    result: {
      avg_cents_error: 39.2,
      accuracy_score: 60.8,
      note_count: 78,
    },
  },
  {
    id: -46,
    measurement_type: "pitch_accuracy",
    include_in_insights: true,
    recorded_at: "2026-01-02T08:00:00+09:00",
    created_at: "2026-01-02T08:00:00+09:00",
    result: {
      avg_cents_error: 36.7,
      accuracy_score: 63.3,
      note_count: 80,
    },
  },
  {
    id: -45,
    measurement_type: "pitch_accuracy",
    include_in_insights: true,
    recorded_at: "2026-01-05T08:00:00+09:00",
    created_at: "2026-01-05T08:00:00+09:00",
    result: {
      avg_cents_error: 37.5,
      accuracy_score: 62.5,
      note_count: 79,
    },
  },
  {
    id: -44,
    measurement_type: "pitch_accuracy",
    include_in_insights: true,
    recorded_at: "2026-01-07T08:00:00+09:00",
    created_at: "2026-01-07T08:00:00+09:00",
    result: {
      avg_cents_error: 35.8,
      accuracy_score: 64.2,
      note_count: 81,
    },
  },
  {
    id: -43,
    measurement_type: "pitch_accuracy",
    include_in_insights: true,
    recorded_at: "2026-01-14T08:00:00+09:00",
    created_at: "2026-01-14T08:00:00+09:00",
    result: {
      avg_cents_error: 30.4,
      accuracy_score: 69.6,
      note_count: 86,
    },
  },
  {
    id: -42,
    measurement_type: "pitch_accuracy",
    include_in_insights: true,
    recorded_at: "2026-01-19T08:00:00+09:00",
    created_at: "2026-01-19T08:00:00+09:00",
    result: {
      avg_cents_error: 27.9,
      accuracy_score: 72.1,
      note_count: 89,
    },
  },
  {
    id: -411,
    measurement_type: "pitch_accuracy",
    include_in_insights: true,
    recorded_at: "2026-01-26T08:00:00+09:00",
    created_at: "2026-01-26T08:00:00+09:00",
    result: {
      avg_cents_error: 29.1,
      accuracy_score: 70.9,
      note_count: 87,
    },
  },
  {
    id: -41,
    measurement_type: "pitch_accuracy",
    include_in_insights: true,
    recorded_at: "2026-01-23T08:00:00+09:00",
    created_at: "2026-01-23T08:00:00+09:00",
    result: {
      avg_cents_error: 20.7,
      accuracy_score: 73.1,
      note_count: 92,
    },
  },
  GUEST_LATEST.pitch_accuracy!,
];

function ClickableCard({
  title,
  to,
  hintSub,
  className,
  children,
}: {
  title: string;
  to: string;
  hintSub?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link to={to} className={`insightsCard insightsCard--link${className ? ` ${className}` : ""}`}>
      <InsightsCardHeader title={title} hintText="詳細を見る" hintSub={hintSub} withChevron />
      {children}
    </Link>
  );
}

export default function InsightsPage() {
  const { me, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const guestMode = !authLoading && !me;

  useEffect(() => {
    if (authLoading) return;
    if (guestMode) {
      setState({
        kind: "ready",
        latest: GUEST_LATEST,
        longToneRuns: GUEST_LONG_TONE_RUNS,
        rangeRuns: GUEST_RANGE_RUNS,
        pitchAccuracyRuns: GUEST_PITCH_ACCURACY_RUNS,
      });
      return;
    }

    let cancelled = false;
    (async () => {
      setState({ kind: "loading" });
      try {
        const [latest, longToneRuns, rangeRuns, pitchAccuracyRuns] = await Promise.all([
          fetchLatestMeasurements(),
          fetchMeasurements({ measurement_type: "long_tone", days: 365, limit: 100, include_in_insights: true }),
          fetchMeasurements({ measurement_type: "range", days: 365, limit: 200, include_in_insights: true }),
          fetchMeasurements({ measurement_type: "pitch_accuracy", days: 365, limit: 200, include_in_insights: true }),
        ]);
        if (cancelled) return;
        setState({ kind: "ready", latest, longToneRuns, rangeRuns, pitchAccuracyRuns });
      } catch (e) {
        if (cancelled) return;
        setState({ kind: "error", message: errorMessage(e, "取得に失敗しました") });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, guestMode]);

  if (state.kind === "loading") {
    return (
      <div className="page insightsPage">
        <div className="insightsPage__bg" aria-hidden="true" />
        <MetronomeLoader label="読み込み中..." />
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="page insightsPage">
        <div className="insightsPage__bg" aria-hidden="true" />
        <div className="insightsError">取得に失敗しました: {state.message}</div>
      </div>
    );
  }

  const latest = state.latest;
  const longToneBest = buildLongToneBest(state.longToneRuns);
  const range = asRangeResult(latest.range?.result);
  const longTone = asLongToneResult(latest.long_tone?.result);
  const longToneSeconds = longTone?.sustain_sec ?? null;
  const longToneProgress = longToneSeconds != null ? Math.max(0, Math.min(1, longToneSeconds / 60)) : 0;
  const volume = asVolumeResult(latest.volume_stability?.result);
  const pitchAccuracy = asPitchAccuracyResult(latest.pitch_accuracy?.result);
  const pitchScore = pitchAccuracy?.accuracy_score ?? null;
  const pitchSemitoneDrift = pitchAccuracy?.avg_cents_error != null ? Math.max(0, pitchAccuracy.avg_cents_error / 100) : null;
  const pitchDriftForBar = pitchSemitoneDrift != null ? Math.min(1, pitchSemitoneDrift) : null;
  const pitchStabilityLabel =
    pitchSemitoneDrift == null
      ? "—"
      : pitchSemitoneDrift <= 0.2
        ? "非常に安定"
        : pitchSemitoneDrift <= 0.5
          ? "安定"
          : "要改善";

  return (
    <div className="page insightsPage">
      <div className="insightsPage__bg" aria-hidden="true" />

      {guestMode && (
        <section className="card insightsGuest">
          <div className="insightsGuest__title">ゲスト表示中</div>
          <div className="insightsGuest__text">
            分析画面の構成は確認できます。個人の測定データはログイン後に表示されます。
          </div>
        </section>
      )}

      <section className="card insightsHighlightsCard">
        <div className="insightsMuted">最新の測定結果を表示しています。</div>
      </section>

      <div className="insightsGrid">
        <ClickableCard title="音域" to="/insights/notes?metric=range" className="insightsRangeMainCard">
          <RangeLikeCard range={range} compact />
        </ClickableCard>

        <div className="insightsTwinGrid">
          <ClickableCard title="音量安定性" to="/insights/notes?metric=volume_stability" className="insightsGaugeCard">
            <div className="insightsGaugePanel">
              <CircleGauge
                label="許容幅内率（±3dB）"
                value={volume?.loudness_range_pct ?? null}
                unit="%"
                progress={volume?.loudness_range_pct != null ? Math.max(0, Math.min(1, volume.loudness_range_pct / 100)) : 0}
                color="#ffe06a"
              />
              <div className="insightsGaugeMeta">
                <span>平均 {formatDb(volume?.avg_loudness_db ?? null)}</span>
                <span>範囲 {volume?.loudness_range_db != null ? `${volume.loudness_range_db.toFixed(1)} dB` : "-"}</span>
              </div>
            </div>
          </ClickableCard>

          <ClickableCard title="ロングトーン" to="/insights/notes?metric=long_tone" className="insightsGaugeCard">
            <div className="insightsGaugePanel">
              <CircleGauge
                label="ロングトーン"
                value={longToneSeconds}
                unit="sec"
                progress={longToneProgress}
                color="#3b82f6"
              />
              <div className="insightsGaugeMeta">
                <span>ベスト {longToneBest != null ? `${longToneBest.toFixed(1)}s` : "—"}</span>
                <span>音程 {longTone?.sustain_note ?? "-"}</span>
              </div>
            </div>
          </ClickableCard>
        </div>

        <ClickableCard title="音程精度" to="/insights/notes?metric=pitch_accuracy" className="insightsPitchSemitoneCard">
          <div className="insightsPitchSemitone">
            <div className="insightsPitchSemitone__main">
              {pitchSemitoneDrift != null ? `${pitchSemitoneDrift.toFixed(2)} 半音` : "-"}
            </div>
            <div
              className={`insightsPitchSemitone__status${
                pitchStabilityLabel === "要改善" ? " is-bad" : pitchStabilityLabel === "安定" ? " is-mid" : ""
              }`}
            >
              {pitchStabilityLabel}
            </div>
            <div className="insightsPitchSemitone__bar">
              <div className="insightsPitchSemitone__barZone insightsPitchSemitone__barZone--good" />
              <div className="insightsPitchSemitone__barZone insightsPitchSemitone__barZone--mid" />
              <div className="insightsPitchSemitone__barZone insightsPitchSemitone__barZone--bad" />
              <div className="insightsPitchSemitone__barArrow" aria-hidden="true" />
              {pitchDriftForBar != null && (
                <span
                  className="insightsPitchSemitone__barMarker"
                  style={{ left: `${pitchDriftForBar * 100}%` }}
                />
              )}
            </div>
            <div className="insightsPitchSemitone__legend">
              <span>0</span>
              <span className="insightsPitchSemitone__legendArrow" aria-hidden="true" />
              <span>1半音</span>
            </div>
            <div className="insightsPitchSemitone__meta">
              <span>分析ノート数: {pitchAccuracy?.note_count ?? "-"}</span>
              {pitchScore != null && <span>スコア {pitchScore.toFixed(1)}点</span>}
            </div>
          </div>
        </ClickableCard>
      </div>
    </div>
  );
}

function CircleGauge({
  label,
  value,
  unit,
  progress,
  color,
}: {
  label: string;
  value: number | null;
  unit: string;
  progress: number;
  color: string;
}) {
  const p = Math.max(0, Math.min(1, progress));
  const r = 66;
  const c = 78;
  const arc = 2 * Math.PI * r;
  const offset = arc * (1 - p);
  return (
    <div className="insightsCircleGauge">
      <div className="insightsCircleGauge__label">{label}</div>
      <div className="insightsCircleGauge__wrap">
        <svg viewBox="0 0 156 156" className="insightsCircleGauge__svg" aria-hidden="true">
          <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(45, 102, 184, 0.24)" strokeWidth="12" />
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeDasharray={arc}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 78 78)"
          />
        </svg>
        <div className="insightsCircleGauge__center">
          <div className="insightsCircleGauge__value">{value != null ? value.toFixed(1) : "-"}</div>
          <div className="insightsCircleGauge__unit">{unit}</div>
        </div>
      </div>
    </div>
  );
}

function buildLongToneBest(runs: MeasurementRun[]) {
  const parsed = runs
    .map((run) => {
      const result = asLongToneResult(run.result);
      return { run, sec: result?.sustain_sec ?? null };
    })
    .filter((v): v is { run: MeasurementRun; sec: number } => v.sec != null)
    .sort((a, b) => b.run.recorded_at.localeCompare(a.run.recorded_at));
  return parsed.reduce<number | null>((acc, cur) => (acc == null || cur.sec > acc ? cur.sec : acc), null);
}

function RangeLikeCard({
  range,
  compact = false,
}: {
  range: ReturnType<typeof asRangeResult> | null;
  compact?: boolean;
}) {
  const totalHigh = range?.highest_note ?? "-";
  const totalLow = range?.lowest_note ?? "-";
  const chestHigh = range?.chest_top_note ?? "-";
  const falsettoHigh = range?.falsetto_top_note ?? "-";
  const falsettoLow = transposeNote(range?.lowest_note ?? null, 10) ?? "-";
  const chestHighMidi = noteToMidi(range?.chest_top_note ?? null);
  const falsettoHighMidi = noteToMidi(range?.falsetto_top_note ?? null);
  const overlapHighMidi =
    chestHighMidi != null && falsettoHighMidi != null ? Math.min(chestHighMidi, falsettoHighMidi) : null;
  const overlapHigh = overlapHighMidi != null ? midiToNote(Math.round(overlapHighMidi)) : "-";

  return (
    <div className={`insightsRangeCard${compact ? " is-compact" : ""}`}>
      <div className="insightsRangeCard__hero">
        <span className="insightsRangeCard__heroValue">{range?.range_octaves != null ? range.range_octaves.toFixed(2) : "-"}</span>
        <span className="insightsRangeCard__heroUnit">オクターブ</span>
      </div>
      <div className="insightsRangeCard__grid">
        <RangeCardSection title="トータル" tone="total" high={totalHigh} low={totalLow} />
        <RangeCardSection title="地声" tone="chest" high={chestHigh} low="-" />
        <RangeCardSection title="共通音域" tone="overlap" high={overlapHigh} low="-" />
        <RangeCardSection title="裏声" tone="falsetto" high={falsettoHigh} low={falsettoLow} />
      </div>
    </div>
  );
}

function RangeCardSection({
  title,
  tone,
  high,
  low,
}: {
  title: string;
  tone: "total" | "chest" | "overlap" | "falsetto";
  high: string;
  low: string;
}) {
  return (
    <div className={`insightsRangeCard__section insightsRangeCard__section--${tone}`}>
      <div className={`insightsRangeCard__chip insightsRangeCard__chip--${tone}`}>{title}</div>
      <div className="insightsRangeCard__line">
        <span>最高音</span>
        <strong>{high}</strong>
      </div>
      <div className="insightsRangeCard__line">
        <span>最低音</span>
        <strong>{low}</strong>
      </div>
    </div>
  );
}

function asRangeResult(result: MeasurementRun["result"] | undefined) {
  if (!result || typeof result !== "object") return null;
  if (!("range_semitones" in result)) return null;
  return result;
}

function noteToMidi(note: string | null) {
  if (!note) return null;
  const m = note.trim().match(/^([A-Ga-g])([#b]?)(-?\d)$/);
  if (!m) return null;
  const letter = m[1].toUpperCase();
  const accidental = m[2];
  const octave = Number(m[3]);
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let semitone = base[letter] ?? 0;
  if (accidental === "#") semitone += 1;
  if (accidental === "b") semitone -= 1;
  return (octave + 1) * 12 + semitone;
}

function midiToNote(midi: number) {
  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

function transposeNote(note: string | null, semitones: number): string | null {
  const midi = noteToMidi(note);
  if (midi == null) return null;
  return midiToNote(midi + semitones);
}

function asLongToneResult(result: MeasurementRun["result"] | undefined) {
  if (!result || typeof result !== "object") return null;
  if (!("sustain_sec" in result)) return null;
  return result;
}

function asVolumeResult(result: MeasurementRun["result"] | undefined) {
  if (!result || typeof result !== "object") return null;
  if (!("loudness_range_pct" in result)) return null;
  return result;
}

function asPitchAccuracyResult(result: MeasurementRun["result"] | undefined) {
  if (!result || typeof result !== "object") return null;
  if (!("accuracy_score" in result)) return null;
  return result;
}

function formatDb(v: number | null) {
  if (v == null) return "-";
  return `${v.toFixed(1)} dB`;
}

function errorMessage(e: unknown, fallback: string) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return fallback;
}
