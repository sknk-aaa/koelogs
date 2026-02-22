import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  fetchLatestMeasurements,
  type MeasurementRun,
} from "../api/measurements";
import MetronomeLoader from "../components/MetronomeLoader";
import { useAuth } from "../features/auth/useAuth";
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
      };
    };

const GUEST_LATEST: {
  range: MeasurementRun | null;
  long_tone: MeasurementRun | null;
  volume_stability: MeasurementRun | null;
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
};

function ClickableCard({
  title,
  to,
  children,
}: {
  title: string;
  to: string;
  children: React.ReactNode;
}) {
  return (
    <Link to={to} className="insightsCard insightsCard--link">
      <div className="insightsCard__head">
        <div className="insightsCard__title">{title}</div>
        <div className="insightsCard__hint">
          <span className="insightsCard__hintText">詳細を見る</span>
          <ChevronRight />
        </div>
      </div>
      {children}
    </Link>
  );
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M7.5 4.5L12.8 10L7.5 15.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
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
      });
      return;
    }

    let cancelled = false;
    (async () => {
      setState({ kind: "loading" });
      try {
        const latest = await fetchLatestMeasurements();
        if (cancelled) return;
        setState({ kind: "ready", latest });
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
        <section className="card insightsHero">
          <div className="insightsHero__kicker">Insights</div>
          <h1 className="insightsHero__title">測定分析</h1>
          <MetronomeLoader label="読み込み中..." />
        </section>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="page insightsPage">
        <div className="insightsPage__bg" aria-hidden="true" />
        <section className="card insightsHero">
          <div className="insightsHero__kicker">Insights</div>
          <h1 className="insightsHero__title">測定分析</h1>
          <div className="insightsError">取得に失敗しました: {state.message}</div>
        </section>
      </div>
    );
  }

  const latest = state.latest;
  const range = asRangeResult(latest.range?.result);
  const longTone = asLongToneResult(latest.long_tone?.result);
  const volume = asVolumeResult(latest.volume_stability?.result);

  return (
    <div className="page insightsPage">
      <div className="insightsPage__bg" aria-hidden="true" />

      <section className="card insightsHero">
        <div className="insightsHero__head">
          <div>
            <div className="insightsHero__kicker">Insights</div>
            <h1 className="insightsHero__title">測定分析</h1>
            <p className="insightsHero__sub">音域・ロングトーン・音量安定性を項目別に確認できます。</p>
          </div>
        </div>
      </section>

      {guestMode && (
        <section className="card insightsGuest">
          <div className="insightsGuest__title">ゲスト表示中</div>
          <div className="insightsGuest__text">
            分析画面の構成は確認できます。個人の測定データはログイン後に表示されます。
          </div>
        </section>
      )}

      <div className="insightsGrid">
        <ClickableCard title="音域" to="/insights/notes?metric=range">
          <RangeLikeCard range={range} compact />
        </ClickableCard>

        <ClickableCard title="ロングトーン" to="/insights/notes?metric=long_tone">
          <LongToneDial seconds={longTone?.sustain_sec ?? null} note={longTone?.sustain_note ?? null} />
        </ClickableCard>

        <ClickableCard title="音量安定性" to="/insights/notes?metric=volume_stability">
          <div className="insightsKeyValue">
            <div className="insightsKeyValue__k">スコア</div>
            <div className="insightsKeyValue__v">
              {volume?.loudness_range_pct != null ? `${volume.loudness_range_pct.toFixed(1)}%` : "-"}
            </div>
          </div>
          <div className="insightsMuted" style={{ marginTop: 6 }}>
            (最大-最小)/平均
          </div>
          <div className="insightsMuted">
            最小: {formatDb(volume?.min_loudness_db ?? null)} / 最大: {formatDb(volume?.max_loudness_db ?? null)} / 平均: {formatDb(volume?.avg_loudness_db ?? null)}
          </div>
        </ClickableCard>
      </div>
    </div>
  );
}

function LongToneDial({ seconds, note }: { seconds: number | null; note: string | null }) {
  const safeSec = seconds == null ? 0 : Math.max(0, seconds);
  const progress = (safeSec % 60) / 60;
  const r = 34;
  const c = 44;
  const arc = 2 * Math.PI * r;
  const offset = arc * (1 - progress);

  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 4 }}>
      <svg viewBox="0 0 88 88" width="88" height="88" aria-hidden="true">
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth="8" />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="color-mix(in srgb, var(--accent) 55%, #111)"
          strokeWidth="8"
          strokeDasharray={arc}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 44 44)"
        />
        <text x="44" y="40" textAnchor="middle" style={{ fontSize: 14, fontWeight: 900 }}>
          {seconds != null ? seconds.toFixed(1) : "-"}
        </text>
        <text x="44" y="56" textAnchor="middle" style={{ fontSize: 10, opacity: 0.78 }}>
          {note ?? "-"}
        </text>
      </svg>
      <div className="insightsMuted">1周=60秒</div>
    </div>
  );
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

function formatDb(v: number | null) {
  if (v == null) return "-";
  return `${v.toFixed(1)} dB`;
}

function errorMessage(e: unknown, fallback: string) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return fallback;
}
