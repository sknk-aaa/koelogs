import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  fetchLatestMeasurements,
  fetchMeasurements,
  type MeasurementRun,
} from "../api/measurements";
import type { MeasurementPoint } from "../types/insights";
import { useAuth } from "../features/auth/useAuth";
import MetronomeLoader from "../components/MetronomeLoader";
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
      rangeRuns: MeasurementRun[];
      longToneRuns: MeasurementRun[];
      volumeRuns: MeasurementRun[];
    };

const PERIODS = [30, 90, 365] as const;
const METRIC_TABS = [
  { key: "range", label: "音域" },
  { key: "long_tone", label: "ロングトーン" },
  { key: "volume_stability", label: "音量安定性" },
] as const;
type MetricTabKey = (typeof METRIC_TABS)[number]["key"];

export default function InsightsNotesPage() {
  const { me, isLoading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [metricTab, setMetricTab] = useState<MetricTabKey>(() => parseMetricTab(searchParams.get("metric")));
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const guestMode = !authLoading && !me;

  useEffect(() => {
    if (authLoading) return;
    if (guestMode) {
      setState({
        kind: "ready",
        latest: { range: null, long_tone: null, volume_stability: null },
        rangeRuns: [],
        longToneRuns: [],
        volumeRuns: [],
      });
      return;
    }

    let cancelled = false;
    (async () => {
      setState({ kind: "loading" });
      try {
        const [latest, rangeRuns, longToneRuns, volumeRuns] = await Promise.all([
          fetchLatestMeasurements(),
          fetchMeasurements({ measurement_type: "range", days, limit: 365 }),
          fetchMeasurements({ measurement_type: "long_tone", days, limit: 365 }),
          fetchMeasurements({ measurement_type: "volume_stability", days, limit: 365 }),
        ]);
        if (cancelled) return;

        setState({
          kind: "ready",
          latest,
          rangeRuns: [...rangeRuns].reverse(),
          longToneRuns: [...longToneRuns].reverse(),
          volumeRuns: [...volumeRuns].reverse(),
        });
      } catch (e) {
        if (cancelled) return;
        setState({ kind: "error", message: errorMessage(e, "取得に失敗しました") });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, guestMode, days]);

  useEffect(() => {
    const metric = parseMetricTab(searchParams.get("metric"));
    setMetricTab((prev) => (prev === metric ? prev : metric));
  }, [searchParams]);

  const rangePoints = useMemo(() => {
    if (state.kind !== "ready") return [] as MeasurementPoint[];
    return state.rangeRuns.map((run) => {
      const result = asRangeResult(run.result);
      return {
        date: run.recorded_at.slice(0, 10),
        value: result?.range_semitones ?? null,
      };
    });
  }, [state]);

  const longTonePoints = useMemo(() => {
    if (state.kind !== "ready") return [] as MeasurementPoint[];
    return state.longToneRuns.map((run) => {
      const result = asLongToneResult(run.result);
      return {
        date: run.recorded_at.slice(0, 10),
        value: result?.sustain_sec ?? null,
      };
    });
  }, [state]);

  const volumePoints = useMemo(() => {
    if (state.kind !== "ready") return [] as MeasurementPoint[];
    return state.volumeRuns.map((run) => {
      const result = asVolumeResult(run.result);
      return {
        date: run.recorded_at.slice(0, 10),
        value: result?.loudness_range_pct ?? null,
      };
    });
  }, [state]);

  const metricPoints = metricTab === "range" ? rangePoints : metricTab === "long_tone" ? longTonePoints : volumePoints;
  const metricLatest = latestValue(metricPoints);
  const metricBest = maxValue(metricPoints);
  const explicitMetricMode = searchParams.has("metric");
  const metricLabel = METRIC_TABS.find((v) => v.key === metricTab)?.label ?? "音域";

  return (
    <div className="page insightsPage">
      <div className="insightsPage__bg" aria-hidden="true" />

      <section className="card insightsHero">
        <div className="insightsHero__head">
          <div>
            <div className="insightsHero__kicker">Insights</div>
            <h1 className="insightsHero__title">測定の推移（詳細）</h1>
            <p className="insightsHero__sub">
              {explicitMetricMode ? `${metricLabel}の詳細データを表示しています。` : "音域・ロングトーン・音量安定性を確認できます。"}
            </p>
          </div>
          <Link to="/insights" className="insightsBack">
            戻る
          </Link>
        </div>

        <div className="insightsSegment">
          {PERIODS.map((p) => {
            const active = p === days;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setDays(p)}
                className={`insightsSegment__btn${active ? " is-active" : ""}`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </section>

      {guestMode && (
        <section className="card insightsGuest">
          <div className="insightsGuest__title">ゲスト表示中</div>
          <div className="insightsGuest__text">ログイン後に、あなたの測定データを表示します。</div>
        </section>
      )}

      {state.kind === "loading" && <MetronomeLoader label="読み込み中..." />}
      {state.kind === "error" && <div className="insightsError">取得に失敗しました: {state.message}</div>}

      {state.kind === "ready" && (
        <div className="insightsStack">
          {explicitMetricMode ? (
            <>
              <section className="insightsCard">
                <div className="insightsCard__head">
                  <div className="insightsCard__title">{metricLabel}（最新）</div>
                </div>
                <LatestSingleMetricCard latest={state.latest} metricTab={metricTab} />
              </section>

              <section className="insightsCard">
                <div className="insightsCard__head">
                  <div className="insightsCard__title">{metricLabel}の成長推移</div>
                </div>
                {metricTab === "range" ? (
                  <RangeBandChart runs={state.rangeRuns} />
                ) : (
                  <SimpleTrendChart points={metricPoints} />
                )}
                <div className="insightsSummaryRow" style={{ marginTop: 10 }}>
                  <div className="insightsBadge">最新: {formatMetricValue(metricLatest, metricTab)}</div>
                  <div className="insightsBadge">最大: {formatMetricValue(metricBest, metricTab)}</div>
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="insightsCard">
                <div className="insightsCard__head">
                  <div className="insightsCard__title">最新値</div>
                </div>
                <LatestSummaryCards latest={state.latest} />
              </section>

              <section className="insightsCard">
                <div className="insightsCard__head">
                  <div className="insightsCard__title">成長推移</div>
                </div>
                <div className="insightsSegment" style={{ marginBottom: 10 }}>
                  {METRIC_TABS.map((tab) => {
                    const active = tab.key === metricTab;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setMetricTab(tab.key);
                          const next = new URLSearchParams(searchParams);
                          next.set("metric", tab.key);
                          setSearchParams(next, { replace: true });
                        }}
                        className={`insightsSegment__btn${active ? " is-active" : ""}`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {metricTab === "range" ? (
                  <RangeBandChart runs={state.rangeRuns} />
                ) : (
                  <SimpleTrendChart points={metricPoints} />
                )}

                <div className="insightsSummaryRow" style={{ marginTop: 10 }}>
                  <div className="insightsBadge">最新: {formatMetricValue(metricLatest, metricTab)}</div>
                  <div className="insightsBadge">最大: {formatMetricValue(metricBest, metricTab)}</div>
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function LatestSingleMetricCard({
  latest,
  metricTab,
}: {
  latest: {
    range: MeasurementRun | null;
    long_tone: MeasurementRun | null;
    volume_stability: MeasurementRun | null;
  };
  metricTab: MetricTabKey;
}) {
  const range = asRangeResult(latest.range?.result);
  const longTone = asLongToneResult(latest.long_tone?.result);
  const volume = asVolumeResult(latest.volume_stability?.result);

  if (metricTab === "range") {
    return (
      <div className="insightsMeasureCard">
        <div className="insightsMeasureValue">
          <span className="insightsMeasureNumber">{range?.range_octaves != null ? range.range_octaves.toFixed(2) : "-"}</span>
          <span className="insightsMeasureUnit">oct</span>
        </div>
        <div className="insightsMuted" style={{ marginTop: 6 }}>
          最低音: {range?.lowest_note ?? "-"} / 最高音: {range?.highest_note ?? "-"}
        </div>
      </div>
    );
  }

  if (metricTab === "long_tone") {
    return (
      <div className="insightsMeasureCard">
        <LongToneDial seconds={longTone?.sustain_sec ?? null} note={longTone?.sustain_note ?? null} />
      </div>
    );
  }

  return (
    <div className="insightsMeasureCard">
      <div className="insightsKeyValue">
        <div className="insightsKeyValue__k">平均</div>
        <div className="insightsKeyValue__v">{formatDb(volume?.avg_loudness_db ?? null)}</div>
      </div>
      <div className="insightsKeyValue">
        <div className="insightsKeyValue__k">最小</div>
        <div className="insightsKeyValue__v">{formatDb(volume?.min_loudness_db ?? null)}</div>
      </div>
      <div className="insightsKeyValue">
        <div className="insightsKeyValue__k">最大</div>
        <div className="insightsKeyValue__v">{formatDb(volume?.max_loudness_db ?? null)}</div>
      </div>
      <div className="insightsMuted" style={{ marginTop: 6 }}>
        差: {volume?.loudness_range_db != null ? `${volume.loudness_range_db.toFixed(2)} dB` : "-"}
      </div>
      <div className="insightsMuted">(最大-最小)/平均: {volume?.loudness_range_pct != null ? `${volume.loudness_range_pct.toFixed(1)}%` : "-"}</div>
    </div>
  );
}

function LatestSummaryCards({
  latest,
}: {
  latest: {
    range: MeasurementRun | null;
    long_tone: MeasurementRun | null;
    volume_stability: MeasurementRun | null;
  };
}) {
  const range = asRangeResult(latest.range?.result);
  const longTone = asLongToneResult(latest.long_tone?.result);
  const volume = asVolumeResult(latest.volume_stability?.result);

  return (
    <div className="insightsMeasureGrid">
      <div className="insightsMeasureCard">
        <div className="insightsMeasureLabel">音域（最新）</div>
        <div className="insightsMeasureValue">
          <span className="insightsMeasureNumber">{range?.range_octaves != null ? range.range_octaves.toFixed(2) : "-"}</span>
          <span className="insightsMeasureUnit">oct</span>
        </div>
        <div className="insightsMuted" style={{ marginTop: 6 }}>
          最低音: {range?.lowest_note ?? "-"} / 最高音: {range?.highest_note ?? "-"}
        </div>
      </div>

      <div className="insightsMeasureCard">
        <div className="insightsMeasureLabel">ロングトーン（最新）</div>
        <LongToneDial seconds={longTone?.sustain_sec ?? null} note={longTone?.sustain_note ?? null} />
      </div>

      <div className="insightsMeasureCard">
        <div className="insightsMeasureLabel">音量安定性（最新）</div>
        <div className="insightsKeyValue">
          <div className="insightsKeyValue__k">平均</div>
          <div className="insightsKeyValue__v">{formatDb(volume?.avg_loudness_db ?? null)}</div>
        </div>
        <div className="insightsKeyValue">
          <div className="insightsKeyValue__k">最小</div>
          <div className="insightsKeyValue__v">{formatDb(volume?.min_loudness_db ?? null)}</div>
        </div>
        <div className="insightsKeyValue">
          <div className="insightsKeyValue__k">最大</div>
          <div className="insightsKeyValue__v">{formatDb(volume?.max_loudness_db ?? null)}</div>
        </div>
        <div className="insightsMuted" style={{ marginTop: 6 }}>
          差: {volume?.loudness_range_db != null ? `${volume.loudness_range_db.toFixed(2)} dB` : "-"}
        </div>
        <div className="insightsMuted">(最大-最小)/平均: {volume?.loudness_range_pct != null ? `${volume.loudness_range_pct.toFixed(1)}%` : "-"}</div>
      </div>
    </div>
  );
}

function LongToneDial({ seconds, note }: { seconds: number | null; note: string | null }) {
  const safeSec = seconds == null ? 0 : Math.max(0, seconds);
  const progress = (safeSec % 60) / 60;
  const r = 38;
  const c = 48;
  const arc = 2 * Math.PI * r;
  const offset = arc * (1 - progress);

  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 4 }}>
      <svg viewBox="0 0 96 96" width="96" height="96" aria-hidden="true">
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
          transform="rotate(-90 48 48)"
        />
        <text x="48" y="45" textAnchor="middle" style={{ fontSize: 16, fontWeight: 900 }}>
          {seconds != null ? seconds.toFixed(1) : "-"}
        </text>
        <text x="48" y="62" textAnchor="middle" style={{ fontSize: 11, opacity: 0.78 }}>
          {note ?? "-"}
        </text>
      </svg>
      <div className="insightsMuted">1周=60秒</div>
    </div>
  );
}

function RangeBandChart({ runs }: { runs: MeasurementRun[] }) {
  const points = runs
    .map((run) => {
      const r = asRangeResult(run.result);
      return {
        date: run.recorded_at.slice(0, 10),
        low: noteToMidi(r?.lowest_note ?? null),
        high: noteToMidi(r?.highest_note ?? null),
      };
    })
    .filter((p) => p.low != null && p.high != null) as Array<{ date: string; low: number; high: number }>;

  if (points.length < 2) {
    return <div className="insightsMuted">音域の測定データが不足しています。</div>;
  }

  const width = 760;
  const height = 200;
  const pad = 20;
  const min = Math.min(...points.map((p) => p.low));
  const max = Math.max(...points.map((p) => p.high));
  const range = Math.max(1, max - min);
  const step = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;

  const toXY = (idx: number, midi: number) => {
    const x = pad + step * idx;
    const y = height - pad - ((midi - min) / range) * (height - pad * 2);
    return { x, y };
  };

  const highPath = points
    .map((p, i) => {
      const { x, y } = toXY(i, p.high);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const lowPath = points
    .map((p, i) => {
      const { x, y } = toXY(i, p.low);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const areaPath = [
    ...points.map((p, i) => {
      const { x, y } = toXY(i, p.high);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    }),
    ...[...points].reverse().map((p, i) => {
      const idx = points.length - 1 - i;
      const { x, y } = toXY(idx, p.low);
      return `L ${x} ${y}`;
    }),
    "Z",
  ].join(" ");

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", minWidth: 560, height: 220 }} aria-hidden="true">
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="rgba(0,0,0,0.2)" />
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="rgba(0,0,0,0.2)" />
        <path d={areaPath} fill="color-mix(in srgb, var(--accent) 18%, transparent)" stroke="none" />
        <path d={highPath} fill="none" stroke="color-mix(in srgb, var(--accent) 58%, #111)" strokeWidth="2.5" />
        <path d={lowPath} fill="none" stroke="rgba(17,17,17,0.6)" strokeWidth="2" strokeDasharray="4 4" />
      </svg>
      <div className="insightsMuted">上線=最高音 / 下線=最低音 / 塗りつぶし=その日の音域区間</div>
    </div>
  );
}

function formatMetricValue(v: number | null, key: (typeof METRIC_TABS)[number]["key"]) {
  if (v == null) return "—";
  if (key === "range") return `${Math.round(v)}半音`;
  if (key === "long_tone") return `${Number(v).toFixed(1)}秒`;
  return `${Number(v).toFixed(1)}%`;
}

function SimpleTrendChart({ points }: { points: MeasurementPoint[] }) {
  const width = 760;
  const height = 180;
  const pad = 18;
  const values = points.map((p) => p.value).filter((v): v is number => v != null);
  const max = values.length ? Math.max(...values) : 1;
  const min = values.length ? Math.min(...values) : 0;
  const range = Math.max(1, max - min);
  const step = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;

  let d = "";
  points.forEach((p, i) => {
    if (p.value == null) return;
    const x = pad + step * i;
    const y = height - pad - ((p.value - min) / range) * (height - pad * 2);
    d += d.length === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  });

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", minWidth: 520, height: 190 }} aria-hidden="true">
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="rgba(0,0,0,0.2)" />
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="rgba(0,0,0,0.2)" />
        <path d={d} fill="none" stroke="color-mix(in srgb, var(--accent) 42%, #121212)" strokeWidth="3" />
      </svg>
    </div>
  );
}

function asRangeResult(result: MeasurementRun["result"] | undefined) {
  if (!result || typeof result !== "object") return null;
  if (!("range_semitones" in result)) return null;
  return result;
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

function latestValue(points: MeasurementPoint[]) {
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (points[i].value != null) return points[i].value;
  }
  return null;
}

function maxValue(points: MeasurementPoint[]) {
  const values = points.map((p) => p.value).filter((v): v is number => v != null);
  if (values.length === 0) return null;
  return Math.max(...values);
}

function formatDb(v: number | null) {
  if (v == null) return "-";
  return `${v.toFixed(1)} dB`;
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

function errorMessage(e: unknown, fallback: string) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return fallback;
}

function parseMetricTab(raw: string | null): MetricTabKey {
  if (raw === "long_tone" || raw === "volume_stability") return raw;
  return "range";
}
