import { useEffect, useMemo, useRef, useState } from "react";
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
type RangeVoiceTab = "total" | "chest" | "falsetto";
type RangeBandPoint = { date: string; low: number | null; high: number | null };

const GUEST_RANGE_RUNS: MeasurementRun[] = [
  {
    id: -101,
    measurement_type: "range",
    include_in_insights: true,
    recorded_at: "2026-02-22T08:00:00+09:00",
    created_at: "2026-02-22T08:00:00+09:00",
    result: { lowest_note: "C2", highest_note: "F5", chest_top_note: "G4", falsetto_top_note: "F5", range_semitones: 41, range_octaves: 3.42 },
  },
  {
    id: -102,
    measurement_type: "range",
    include_in_insights: true,
    recorded_at: "2026-03-02T08:00:00+09:00",
    created_at: "2026-03-02T08:00:00+09:00",
    result: { lowest_note: "B1", highest_note: "F#5", chest_top_note: "G#4", falsetto_top_note: "F#5", range_semitones: 43, range_octaves: 3.58 },
  },
  {
    id: -103,
    measurement_type: "range",
    include_in_insights: true,
    recorded_at: "2026-03-10T08:00:00+09:00",
    created_at: "2026-03-10T08:00:00+09:00",
    result: { lowest_note: "D2", highest_note: "D#5", chest_top_note: "F4", falsetto_top_note: "D#5", range_semitones: 37, range_octaves: 3.08 },
  },
  {
    id: -104,
    measurement_type: "range",
    include_in_insights: true,
    recorded_at: "2026-03-22T08:00:00+09:00",
    created_at: "2026-03-22T08:00:00+09:00",
    result: { lowest_note: "C2", highest_note: "F5", chest_top_note: "G4", falsetto_top_note: "F5", range_semitones: 41, range_octaves: 3.42 },
  },
  {
    id: -105,
    measurement_type: "range",
    include_in_insights: true,
    recorded_at: "2026-03-26T08:00:00+09:00",
    created_at: "2026-03-26T08:00:00+09:00",
    result: { lowest_note: "C#2", highest_note: "G5", chest_top_note: "A4", falsetto_top_note: "G5", range_semitones: 42, range_octaves: 3.5 },
  },
  {
    id: -106,
    measurement_type: "range",
    include_in_insights: true,
    recorded_at: "2026-04-01T08:00:00+09:00",
    created_at: "2026-04-01T08:00:00+09:00",
    result: { lowest_note: "C2", highest_note: "G#5", chest_top_note: "A#4", falsetto_top_note: "G#5", range_semitones: 44, range_octaves: 3.67 },
  },
  {
    id: -107,
    measurement_type: "range",
    include_in_insights: true,
    recorded_at: "2026-04-21T08:00:00+09:00",
    created_at: "2026-04-21T08:00:00+09:00",
    result: { lowest_note: "B1", highest_note: "G#5", chest_top_note: "A#4", falsetto_top_note: "G#5", range_semitones: 45, range_octaves: 3.75 },
  },
  {
    id: -108,
    measurement_type: "range",
    include_in_insights: true,
    recorded_at: "2026-04-29T08:00:00+09:00",
    created_at: "2026-04-29T08:00:00+09:00",
    result: { lowest_note: "A#1", highest_note: "A5", chest_top_note: "B4", falsetto_top_note: "A5", range_semitones: 47, range_octaves: 3.92 },
  },
];

const GUEST_LONG_TONE_RUNS: MeasurementRun[] = [
  {
    id: -201,
    measurement_type: "long_tone",
    include_in_insights: true,
    recorded_at: "2026-02-18T08:00:00+09:00",
    created_at: "2026-02-18T08:00:00+09:00",
    result: { sustain_sec: 12.8, sustain_note: "B3" },
  },
];

const GUEST_VOLUME_RUNS: MeasurementRun[] = [
  {
    id: -301,
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
];

export default function InsightsNotesPage() {
  const { me, isLoading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [metricTab, setMetricTab] = useState<MetricTabKey>(() => parseMetricTab(searchParams.get("metric")));
  const [rangeVoiceTab, setRangeVoiceTab] = useState<RangeVoiceTab>("total");
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const guestMode = !authLoading && !me;

  useEffect(() => {
    if (authLoading) return;
    if (guestMode) {
      setState({
        kind: "ready",
        latest: {
          range: GUEST_RANGE_RUNS[GUEST_RANGE_RUNS.length - 1] ?? null,
          long_tone: GUEST_LONG_TONE_RUNS[GUEST_LONG_TONE_RUNS.length - 1] ?? null,
          volume_stability: GUEST_VOLUME_RUNS[GUEST_VOLUME_RUNS.length - 1] ?? null,
        },
        rangeRuns: [...GUEST_RANGE_RUNS],
        longToneRuns: [...GUEST_LONG_TONE_RUNS],
        volumeRuns: [...GUEST_VOLUME_RUNS],
      });
      return;
    }

    let cancelled = false;
    (async () => {
      setState({ kind: "loading" });
      try {
        const [latest, rangeRuns, longToneRuns, volumeRuns] = await Promise.all([
          fetchLatestMeasurements(),
          fetchMeasurements({ measurement_type: "range", days, limit: 365, include_in_insights: true }),
          fetchMeasurements({ measurement_type: "long_tone", days, limit: 365, include_in_insights: true }),
          fetchMeasurements({ measurement_type: "volume_stability", days, limit: 365, include_in_insights: true }),
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

  const availableMonths = useMemo(() => {
    if (state.kind !== "ready") return [] as string[];
    const months = new Set<string>();
    state.rangeRuns.forEach((run) => {
      months.add(run.recorded_at.slice(0, 7));
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [state]);

  useEffect(() => {
    if (monthFilter === "all") return;
    if (!availableMonths.includes(monthFilter)) {
      // 期間トグル変更で選択月が範囲外になった場合は "すべて" に戻す。
      setMonthFilter("all");
    }
  }, [monthFilter, availableMonths]);

  const monthFilteredRangeRuns = useMemo(() => {
    if (state.kind !== "ready") return [] as MeasurementRun[];
    if (monthFilter === "all") return state.rangeRuns;
    return state.rangeRuns.filter((run) => run.recorded_at.slice(0, 7) === monthFilter);
  }, [state, monthFilter]);

  const rangeBandPointsTotal = useMemo<RangeBandPoint[]>(() => {
    if (monthFilteredRangeRuns.length === 0) return [];
    const byDate = new Map<string, { low: number[]; high: number[] }>();
    monthFilteredRangeRuns.forEach((run) => {
      const result = asRangeResult(run.result);
      const date = run.recorded_at.slice(0, 10);
      const lowMidi = noteToMidi(result?.lowest_note ?? null);
      const highMidi = noteToMidi(result?.highest_note ?? null);
      if (lowMidi == null && highMidi == null) return;
      const cur = byDate.get(date) ?? { low: [], high: [] };
      if (lowMidi != null) cur.low.push(lowMidi);
      if (highMidi != null) cur.high.push(highMidi);
      byDate.set(date, cur);
    });
    return Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({
        date,
        low: v.low.length ? Math.min(...v.low) : null,
        high: v.high.length ? Math.max(...v.high) : null,
      }));
  }, [monthFilteredRangeRuns]);
  const rangeBandPointsChest = useMemo<RangeBandPoint[]>(() => {
    if (monthFilteredRangeRuns.length === 0) return [];
    const byDate = new Map<string, { low: number[]; high: number[] }>();
    monthFilteredRangeRuns.forEach((run) => {
      const result = asRangeResult(run.result);
      const date = run.recorded_at.slice(0, 10);
      const lowMidi = noteToMidi(result?.lowest_note ?? null);
      const highMidi = noteToMidi(result?.chest_top_note ?? null);
      if (lowMidi == null || highMidi == null) return;
      const cur = byDate.get(date) ?? { low: [], high: [] };
      cur.low.push(lowMidi);
      cur.high.push(highMidi);
      byDate.set(date, cur);
    });
    return Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, values]) => ({ date, low: Math.min(...values.low), high: Math.max(...values.high) }));
  }, [monthFilteredRangeRuns]);
  const rangeBandPointsFalsetto = useMemo<RangeBandPoint[]>(() => {
    if (monthFilteredRangeRuns.length === 0) return [];
    const byDate = new Map<string, { low: number[]; high: number[] }>();
    monthFilteredRangeRuns.forEach((run) => {
      const result = asRangeResult(run.result);
      const date = run.recorded_at.slice(0, 10);
      const lowMidi = transposeNoteToMidi(result?.lowest_note ?? null, 10);
      const highMidi = noteToMidi(result?.falsetto_top_note ?? null);
      if (lowMidi == null || highMidi == null) return;
      const cur = byDate.get(date) ?? { low: [], high: [] };
      cur.low.push(lowMidi);
      cur.high.push(highMidi);
      byDate.set(date, cur);
    });
    return Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, values]) => ({ date, low: Math.min(...values.low), high: Math.max(...values.high) }));
  }, [monthFilteredRangeRuns]);

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

  const rangeBandPoints =
    rangeVoiceTab === "chest"
      ? rangeBandPointsChest
      : rangeVoiceTab === "falsetto"
        ? rangeBandPointsFalsetto
        : rangeBandPointsTotal;
  const rangePoints = rangeBandPoints.map((p) => ({ date: p.date, value: p.high }));
  const metricPoints = metricTab === "range" ? rangePoints : metricTab === "long_tone" ? longTonePoints : volumePoints;
  const metricLatest = latestValue(metricPoints);
  const metricBest = maxValue(metricPoints);
  const explicitMetricMode = searchParams.has("metric");
  const metricLabel = METRIC_TABS.find((v) => v.key === metricTab)?.label ?? "音域";
  const rangeBestRun = useMemo(() => {
    if (monthFilteredRangeRuns.length === 0) return null;
    const candidates = monthFilteredRangeRuns
      .map((run) => ({ run, result: asRangeResult(run.result) }))
      .filter((v) => v.result?.range_semitones != null) as Array<{
      run: MeasurementRun;
      result: NonNullable<ReturnType<typeof asRangeResult>>;
    }>;
    if (candidates.length === 0) return null;
    return candidates.reduce((best, cur) => (cur.result.range_semitones! > best.result.range_semitones! ? cur : best));
  }, [monthFilteredRangeRuns]);

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

        <div className="insightsControlsInline">
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
          <label className="insightsMonthFilter">
            <span>月</span>
            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="insightsSelect insightsSelect--month">
              <option value="all">すべて</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </label>
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
                  <div className="insightsCard__title">{metricTab === "range" ? "音域（過去最高）" : `${metricLabel}（最新）`}</div>
                </div>
                <LatestSingleMetricCard latest={state.latest} metricTab={metricTab} rangeBestRun={rangeBestRun} />
              </section>

              <section className="insightsCard">
                <div className="insightsCard__head">
                  <div className="insightsCard__title">{metricLabel}の成長推移</div>
                </div>
                {metricTab === "range" ? (
                  <>
                    <div className="insightsSegment" style={{ marginBottom: 8 }}>
                      <button
                        type="button"
                        onClick={() => setRangeVoiceTab("total")}
                        className={`insightsSegment__btn${rangeVoiceTab === "total" ? " is-active" : ""}`}
                      >
                        トータル
                      </button>
                      <button
                        type="button"
                        onClick={() => setRangeVoiceTab("chest")}
                        className={`insightsSegment__btn${rangeVoiceTab === "chest" ? " is-active" : ""}`}
                      >
                        地声
                      </button>
                      <button
                        type="button"
                        onClick={() => setRangeVoiceTab("falsetto")}
                        className={`insightsSegment__btn${rangeVoiceTab === "falsetto" ? " is-active" : ""}`}
                      >
                        裏声
                      </button>
                    </div>
                    <RangeBandTrendChart points={rangeBandPoints} />
                    <RangeHistoryList
                      runs={monthFilteredRangeRuns}
                      voiceTab={rangeVoiceTab}
                      latestLabel={formatMetricValue(metricLatest, metricTab)}
                      bestLabel={formatMetricValue(metricBest, metricTab)}
                    />
                  </>
                ) : (
                  <SimpleTrendChart points={metricPoints} />
                )}
                {metricTab !== "range" && (
                  <div className="insightsSummaryRow" style={{ marginTop: 10 }}>
                    <div className="insightsBadge">最新: {formatMetricValue(metricLatest, metricTab)}</div>
                    <div className="insightsBadge">最大: {formatMetricValue(metricBest, metricTab)}</div>
                  </div>
                )}
              </section>
            </>
          ) : (
            <>
              <section className="insightsCard">
                <div className="insightsCard__head">
                  <div className="insightsCard__title">最新値</div>
                </div>
                <LatestSummaryCards latest={state.latest} rangeBestRun={rangeBestRun} />
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
                  <>
                    <div className="insightsSegment" style={{ marginBottom: 8 }}>
                      <button
                        type="button"
                        onClick={() => setRangeVoiceTab("total")}
                        className={`insightsSegment__btn${rangeVoiceTab === "total" ? " is-active" : ""}`}
                      >
                        トータル
                      </button>
                      <button
                        type="button"
                        onClick={() => setRangeVoiceTab("chest")}
                        className={`insightsSegment__btn${rangeVoiceTab === "chest" ? " is-active" : ""}`}
                      >
                        地声
                      </button>
                      <button
                        type="button"
                        onClick={() => setRangeVoiceTab("falsetto")}
                        className={`insightsSegment__btn${rangeVoiceTab === "falsetto" ? " is-active" : ""}`}
                      >
                        裏声
                      </button>
                    </div>
                    <RangeBandTrendChart points={rangeBandPoints} />
                    <RangeHistoryList
                      runs={monthFilteredRangeRuns}
                      voiceTab={rangeVoiceTab}
                      latestLabel={formatMetricValue(metricLatest, metricTab)}
                      bestLabel={formatMetricValue(metricBest, metricTab)}
                    />
                  </>
                ) : (
                  <SimpleTrendChart points={metricPoints} />
                )}

                {metricTab !== "range" && (
                  <div className="insightsSummaryRow" style={{ marginTop: 10 }}>
                    <div className="insightsBadge">最新: {formatMetricValue(metricLatest, metricTab)}</div>
                    <div className="insightsBadge">最大: {formatMetricValue(metricBest, metricTab)}</div>
                  </div>
                )}
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
  rangeBestRun,
}: {
  latest: {
    range: MeasurementRun | null;
    long_tone: MeasurementRun | null;
    volume_stability: MeasurementRun | null;
  };
  metricTab: MetricTabKey;
  rangeBestRun: { run: MeasurementRun; result: NonNullable<ReturnType<typeof asRangeResult>> } | null;
}) {
  const longTone = asLongToneResult(latest.long_tone?.result);
  const volume = asVolumeResult(latest.volume_stability?.result);

  if (metricTab === "range") {
    const best = rangeBestRun?.result ?? null;
    return <RangeLikeCard range={best} note="今まででの最高音域" />;
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
  rangeBestRun,
}: {
  latest: {
    range: MeasurementRun | null;
    long_tone: MeasurementRun | null;
    volume_stability: MeasurementRun | null;
  };
  rangeBestRun: { run: MeasurementRun; result: NonNullable<ReturnType<typeof asRangeResult>> } | null;
}) {
  const range = rangeBestRun?.result ?? asRangeResult(latest.range?.result);
  const longTone = asLongToneResult(latest.long_tone?.result);
  const volume = asVolumeResult(latest.volume_stability?.result);

  return (
    <div className="insightsMeasureGrid">
      <div className="insightsMeasureCard">
        <div className="insightsMeasureLabel">音域（過去最高）</div>
        <RangeLikeCard range={range} compact />
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

function RangeLikeCard({
  range,
  note,
  compact = false,
}: {
  range: ReturnType<typeof asRangeResult> | null;
  note?: string;
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
      {note && <div className="insightsMuted">{note}</div>}
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

function formatMetricValue(v: number | null, key: (typeof METRIC_TABS)[number]["key"]) {
  if (v == null) return "—";
  if (key === "range") return midiToNote(Math.round(v));
  if (key === "long_tone") return `${Number(v).toFixed(1)}秒`;
  return `${Number(v).toFixed(1)}%`;
}

function SimpleTrendChart({ points, yMode = "number" }: { points: MeasurementPoint[]; yMode?: "number" | "note" }) {
  const width = 760;
  const height = 220;
  const padTop = 14;
  const padBottom = 34;
  const padLeft = 44;
  const padRight = 16;
  const values = points.map((p) => p.value).filter((v): v is number => v != null);
  const maxRaw = values.length ? Math.max(...values) : 1;
  const minRaw = values.length ? Math.min(...values) : 0;
  let max = maxRaw;
  let min = minRaw;
  if (yMode === "note") {
    const paddedMin = Math.floor(minRaw) - 2;
    const paddedMax = Math.ceil(maxRaw) + 2;
    min = paddedMin;
    max = paddedMax;
    const span = max - min;
    if (span < 12) {
      const center = (max + min) / 2;
      min = Math.floor(center - 6);
      max = Math.ceil(center + 6);
    }
  }
  const range = Math.max(1, max - min);
  const step = points.length > 1 ? (width - padLeft - padRight) / (points.length - 1) : 0;

  let d = "";
  points.forEach((p, i) => {
    if (p.value == null) return;
    const x = padLeft + step * i;
    const y = height - padBottom - ((p.value - min) / range) * (height - padTop - padBottom);
    d += d.length === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  });
  const xTicks = Array.from(
    new Set(points.length <= 1 ? [0] : [0, Math.floor((points.length - 1) * 0.33), Math.floor((points.length - 1) * 0.66), points.length - 1])
  );

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", minWidth: 520, height: 220 }} aria-hidden="true">
        <line x1={padLeft} y1={height - padBottom} x2={width - padRight} y2={height - padBottom} stroke="rgba(0,0,0,0.2)" />
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={height - padBottom} stroke="rgba(0,0,0,0.2)" />
        {yMode === "note" &&
          Array.from({ length: 7 }).map((_, idx) => {
            const r = idx / 6;
            const midi = Math.round(min + (max - min) * (1 - r));
            const y = padTop + (height - padTop - padBottom) * r;
            return (
              <g key={`note-tick-${idx}`}>
                <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="rgba(0,0,0,0.14)" />
                <text x={padLeft - 8} y={y + 4} textAnchor="end" style={{ fontSize: 12, opacity: 0.82, fontWeight: 800 }}>
                  {midiToNote(midi)}
                </text>
              </g>
            );
          })}
        {xTicks.map((idx) => {
          const point = points[idx];
          const x = padLeft + step * idx;
          const dateLabel = point?.date ? point.date.slice(5) : "";
          return (
            <g key={`x-tick-${idx}`}>
              <line x1={x} y1={height - padBottom} x2={x} y2={height - padBottom + 4} stroke="rgba(0,0,0,0.24)" />
              <text x={x} y={height - 8} textAnchor="middle" style={{ fontSize: 11, opacity: 0.76 }}>
                {dateLabel}
              </text>
            </g>
          );
        })}
        <path d={d} fill="none" stroke="color-mix(in srgb, var(--accent) 42%, #121212)" strokeWidth="3" />
      </svg>
    </div>
  );
}

function RangeBandTrendChart({ points }: { points: RangeBandPoint[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(() => (typeof window !== "undefined" ? window.innerWidth <= 760 : false));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const layout = isMobile
    ? {
        height: 420,
        padTop: 42,
        padBottom: 62,
        axisWidth: 48,
        plotPadLeft: 16,
        plotPadRight: 26,
        plotEdgeInset: 16,
        pxPerPoint: 54,
        yTickMax: 6,
        yTickMinGap: 34,
        bgTickMax: 6,
        lowDotR: 3.2,
        highDotR: 2.3,
        highDotStrongR: 4.4,
        highDotNormalOpacity: 0.42,
        highDotStrongOpacity: 0.92,
        bestBadgeW: 26,
        bestBadgeH: 10,
        bestFont: 7.1,
      }
    : {
        height: 420,
        padTop: 42,
        padBottom: 64,
        axisWidth: 76,
        plotPadLeft: 16,
        plotPadRight: 24,
        plotEdgeInset: 0,
        pxPerPoint: 42,
        yTickMax: 9,
        yTickMinGap: 28,
        bgTickMax: 10,
        lowDotR: 3.4,
        highDotR: 2.6,
        highDotStrongR: 4.8,
        highDotNormalOpacity: 0.52,
        highDotStrongOpacity: 0.95,
        bestBadgeW: 28,
        bestBadgeH: 11,
        bestFont: 7.6,
      };

  const minPlotWidth = isMobile ? 660 : 760;
  const width = Math.max(
    minPlotWidth,
    layout.plotPadLeft + layout.plotPadRight + layout.plotEdgeInset * 2 + Math.max(0, points.length - 1) * layout.pxPerPoint
  );
  const height = layout.height;
  const padTop = layout.padTop;
  const padBottom = layout.padBottom;
  const padLeft = layout.plotPadLeft;
  const padRight = layout.plotPadRight;
  const axisWidth = layout.axisWidth;

  const lowValues = points.map((p) => p.low).filter((v): v is number => v != null);
  const highValues = points.map((p) => p.high).filter((v): v is number => v != null);
  const allValues = [...lowValues, ...highValues];
  const minRaw = allValues.length ? Math.min(...allValues) : 48;
  const maxRaw = allValues.length ? Math.max(...allValues) : 60;
  let min = Math.floor(minRaw) - 2;
  let max = Math.ceil(maxRaw) + 2;
  if (max - min < 14) {
    const center = (max + min) / 2;
    min = Math.floor(center - 7);
    max = Math.ceil(center + 7);
  }
  const range = Math.max(1, max - min);
  const plotLeft = padLeft + layout.plotEdgeInset;
  const plotRight = width - padRight - layout.plotEdgeInset;
  const step = points.length > 1 ? (plotRight - plotLeft) / (points.length - 1) : 0;
  const yFromMidi = (midi: number) => height - padBottom - ((midi - min) / range) * (height - padTop - padBottom);
  const yTicks = buildReadableMidiTicks({
    min,
    max,
    yFromMidi,
    topBound: padTop,
    bottomBound: height - padBottom,
    minPixelGap: layout.yTickMinGap,
    maxTicks: layout.yTickMax,
  });

  const plotPoints = points
    .map((p, i) => {
      if (p.low == null || p.high == null) return null;
      const x = plotLeft + step * i;
      const lowY = yFromMidi(p.low);
      const highY = yFromMidi(p.high);
      return {
        index: i,
        date: p.date,
        x,
        low: p.low,
        high: p.high,
        lowY,
        highY,
        widthSemitone: p.high - p.low,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v != null);

  const decorated = plotPoints.map((p, i) => {
    const prev = i > 0 ? plotPoints[i - 1] : null;
    const improvedFromPrev = prev != null && p.high > prev.high;
    const deltaTop = prev == null ? null : p.high - prev.high;
    return { ...p, improvedFromPrev, deltaTop };
  });
  const bestHigh = decorated.length ? Math.max(...decorated.map((p) => p.high)) : null;
  const bestCandidates = bestHigh == null ? [] : decorated.filter((p) => p.high === bestHigh);
  const bestPoint = bestCandidates.length > 0 ? bestCandidates[bestCandidates.length - 1] : null;

  const highPath = decorated.length
    ? decorated.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.highY}`).join(" ")
    : "";
  const lowPath = decorated.length
    ? decorated.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.lowY}`).join(" ")
    : "";
  const bandAreaPath =
    decorated.length >= 2
      ? [
          `M ${decorated[0].x} ${decorated[0].highY}`,
          ...decorated.slice(1).map((p) => `L ${p.x} ${p.highY}`),
          ...[...decorated].reverse().map((p) => `L ${p.x} ${p.lowY}`),
          "Z",
        ].join(" ")
      : "";

  const xTicks = Array.from(
    new Set(points.length <= 1 ? [0] : [0, Math.floor((points.length - 1) * 0.5), points.length - 1])
  );

  const hovered = decorated.find((p) => p.index === hoveredIndex) ?? null;
  const xAxisY = height - padBottom;

  useEffect(() => {
    const updateTooltip = () => {
      if (!hovered || !frameRef.current || !scrollRef.current || !tooltipRef.current) {
        setTooltipPos(null);
        return;
      }
      const frameRect = frameRef.current.getBoundingClientRect();
      const scrollRect = scrollRef.current.getBoundingClientRect();
      const tipRect = tooltipRef.current.getBoundingClientRect();
      const pointClientX = scrollRect.left + (hovered.x - scrollRef.current.scrollLeft);
      const pointClientY = scrollRect.top + hovered.highY;
      const margin = 8;
      const halfTipW = tipRect.width / 2;
      const preferredLeft = pointClientX - frameRect.left;
      const left = clamp(preferredLeft, margin + halfTipW, frameRect.width - margin - halfTipW);

      const aboveTop = pointClientY - frameRect.top - tipRect.height - 10;
      const belowTop = pointClientY - frameRect.top + 12;
      const top =
        aboveTop >= margin ? aboveTop : clamp(belowTop, margin, Math.max(margin, frameRect.height - tipRect.height - margin));

      setTooltipPos({ left, top });
    };

    const raf = requestAnimationFrame(updateTooltip);
    const scroller = scrollRef.current;
    const onScroll = () => requestAnimationFrame(updateTooltip);
    const onResize = () => requestAnimationFrame(updateTooltip);
    scroller?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      scroller?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [hovered, width, height, axisWidth]);

  return (
    <div className="insightsRangeTrend">
      <div className="insightsRangeTrend__frame" ref={frameRef}>
        <div
          className="insightsRangeTrend__axis"
          style={{ width: `${axisWidth}px`, minWidth: `${axisWidth}px`, maxWidth: `${axisWidth}px` }}
        >
          <svg viewBox={`0 0 ${axisWidth} ${height}`} className="insightsRangeTrend__axisSvg" aria-hidden="true">
            <line x1={axisWidth - 1} y1={padTop} x2={axisWidth - 1} y2={xAxisY} stroke="#c6d5e5" />
            {yTicks.map((midi, idx) => {
              const y = yFromMidi(midi);
              const label = midiToNote(midi);
              const isC = midi % 12 === 0;
              return (
                <g key={`range-axis-y-${midi}-${idx}`}>
                  <line x1={axisWidth - 5} y1={y} x2={axisWidth - 1} y2={y} stroke={isC ? "#bfd5ea" : "#dbe7f2"} strokeWidth={isC ? 1.2 : 1} />
                  <text x={axisWidth - 6} y={y + 4} textAnchor="end" className="insightsRangeTrend__yLabel">
                    <NoteLabel note={label} />
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="insightsRangeTrend__scroll" ref={scrollRef}>
          <div className="insightsRangeTrend__plotInner" style={{ minWidth: `${width}px` }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="insightsRangeTrend__svg" style={{ width: `${width}px` }} aria-hidden="true">
        <defs>
          <linearGradient id="rangeTrendBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f7fbff" />
            <stop offset="100%" stopColor="#edf4fb" />
          </linearGradient>
          <linearGradient id="rangeTrendBand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#42a5f5" stopOpacity={isMobile ? 0.23 : 0.34} />
            <stop offset="100%" stopColor="#90caf9" stopOpacity={isMobile ? 0.14 : 0.2} />
          </linearGradient>
          <linearGradient id="rangeTrendHigh" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1e88e5" />
            <stop offset="100%" stopColor="#1976d2" />
          </linearGradient>
        </defs>

        <rect x={padLeft} y={padTop} width={width - padLeft - padRight} height={height - padTop - padBottom} fill="url(#rangeTrendBg)" rx={12} />
        {buildSparseMidiTicks(min, max, layout.bgTickMax).map((midi) => {
          const yTop = yFromMidi(midi + 1);
          const yBottom = yFromMidi(midi);
          const h = Math.max(0, yBottom - yTop);
          if (h <= 0) return null;
          return (
            <rect
              key={`range-bg-row-${midi}`}
              x={padLeft}
              y={yTop}
              width={width - padLeft - padRight}
              height={h}
              fill={
                isBlackKey(midi % 12)
                  ? isMobile
                    ? "rgba(42, 67, 93, 0.016)"
                    : "rgba(42, 67, 93, 0.024)"
                  : isMobile
                    ? "rgba(255, 255, 255, 0.012)"
                    : "rgba(255, 255, 255, 0.018)"
              }
            />
          );
        })}

        {yTicks.map((midi, idx) => {
          const y = yFromMidi(midi);
          const isC = midi % 12 === 0;
          return (
            <g key={`range-y-grid-${midi}-${idx}`}>
              <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke={isC ? "#bfd5ea" : "#dbe7f2"} strokeWidth={isC ? 1.2 : 1} />
            </g>
          );
        })}

        <line x1={padLeft} y1={xAxisY} x2={width - padRight} y2={xAxisY} stroke="#c6d5e5" />
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={xAxisY} stroke="#c6d5e5" />

        {bandAreaPath && <path d={bandAreaPath} fill="url(#rangeTrendBand)" stroke="none" />}

        {lowPath && <path d={lowPath} fill="none" stroke="#9ab6d4" strokeWidth="2" strokeDasharray="4 4" />}
        {highPath && <path d={highPath} fill="none" stroke="url(#rangeTrendHigh)" strokeWidth="3.8" />}

        {hovered && <circle cx={hovered.x} cy={hovered.lowY} r={layout.lowDotR} fill="#9ab6d4" stroke="#fff" strokeWidth="1.1" />}
        {decorated.map((p) => (
          <circle
            key={`range-high-${p.index}`}
            cx={p.x}
            cy={p.highY}
            r={p.improvedFromPrev ? layout.highDotStrongR : layout.highDotR}
            fill={p.improvedFromPrev ? "#5a8fc2" : "#1e88e5"}
            opacity={p.improvedFromPrev ? layout.highDotStrongOpacity : layout.highDotNormalOpacity}
            stroke="#fff"
            strokeWidth={p.improvedFromPrev ? 1.5 : 0.9}
          />
        ))}

        {bestPoint && (
          <g key={`range-best-${bestPoint.index}`}>
            <rect
              x={clamp(bestPoint.x, plotLeft + 16, plotRight - 16) - layout.bestBadgeW / 2}
              y={Math.max(padTop + 4, bestPoint.highY - 20)}
              width={layout.bestBadgeW}
              height={layout.bestBadgeH}
              rx={5.5}
              fill="#c58a57"
              opacity="0.86"
            />
            <text
              x={clamp(bestPoint.x, plotLeft + 16, plotRight - 16)}
              y={Math.max(padTop + 11, bestPoint.highY - 12.5)}
              textAnchor="middle"
              style={{ fontSize: layout.bestFont, fontWeight: 900, fill: "#fff", letterSpacing: "0.04em" }}
            >
              BEST
            </text>
          </g>
        )}

        {xTicks.map((idx) => {
          const point = points[idx];
          const x = plotLeft + step * idx;
          const dateLabel = point?.date ? point.date.slice(5) : "";
          return (
            <g key={`range-x-${idx}`}>
              <line x1={x} y1={xAxisY} x2={x} y2={xAxisY + 5} stroke="#a9bfd4" />
              <text x={x} y={height - 10} textAnchor="middle" className="insightsRangeTrend__xLabel">
                {dateLabel}
              </text>
            </g>
          );
        })}

        {hovered && (
          <line
            x1={hovered.x}
            y1={padTop}
            x2={hovered.x}
            y2={xAxisY}
            stroke="#64b5f6"
            strokeWidth="1.6"
            strokeDasharray="4 4"
            opacity="0.72"
          />
        )}

        {points.map((p, i) => {
          const x = plotLeft + step * i;
          const left = i === 0 ? plotLeft : x - step / 2;
          const right = i === points.length - 1 ? plotRight : x + step / 2;
          return (
            <rect
              key={`range-hit-${p.date}-${i}`}
              x={left}
              y={padTop}
              width={Math.max(10, right - left)}
              height={height - padTop - padBottom}
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseMove={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex((prev) => (prev === i ? null : prev))}
              onTouchStart={() => setHoveredIndex(i)}
            />
          );
        })}
      </svg>
          </div>
        </div>
        {hovered && (
          <div
            ref={tooltipRef}
            className="insightsRangeTrend__tooltip"
            style={
              tooltipPos
                ? {
                    left: `${tooltipPos.left}px`,
                    top: `${tooltipPos.top}px`,
                  }
                : { left: "-9999px", top: "-9999px" }
            }
          >
            <div>{hovered.date}</div>
            <div>最低音: {midiToNote(hovered.low)}</div>
            <div>最高音: {midiToNote(hovered.high)}</div>
            <div>Range: {hovered.widthSemitone} semitones</div>
            <div>
              ΔTop: {hovered.deltaTop == null ? "-" : `${hovered.deltaTop > 0 ? "+" : ""}${hovered.deltaTop} semitone${Math.abs(hovered.deltaTop) === 1 ? "" : "s"}`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NoteLabel({ note }: { note: string }) {
  const matched = note.match(/^([A-G])(#?)(-?\d+)$/);
  if (!matched) return <>{note}</>;
  const [, base, sharp, octave] = matched;
  return (
    <>
      <tspan>{base}</tspan>
      {sharp && <tspan style={{ fontSize: "0.64em", opacity: 0.76 }}>♯</tspan>}
      <tspan>{octave}</tspan>
    </>
  );
}

function buildSparseMidiTicks(min: number, max: number, maxTickCount: number): number[] {
  const span = Math.max(1, max - min);
  const candidates = [1, 2, 3, 4, 5, 6, 12];
  let step = 1;
  for (const c of candidates) {
    if (Math.floor(span / c) + 1 <= maxTickCount) {
      step = c;
      break;
    }
  }
  const ticks: number[] = [];
  let value = Math.ceil(min / step) * step;
  while (value <= max) {
    ticks.push(value);
    value += step;
  }
  if (!ticks.includes(min)) ticks.unshift(min);
  if (!ticks.includes(max)) ticks.push(max);
  const dedup = Array.from(new Set(ticks)).sort((a, b) => a - b);
  if (dedup.length <= maxTickCount + 1) return dedup;
  const sampled: number[] = [];
  for (let i = 0; i < maxTickCount; i += 1) {
    const idx = Math.round((i / (maxTickCount - 1)) * (dedup.length - 1));
    sampled.push(dedup[idx]);
  }
  return Array.from(new Set(sampled)).sort((a, b) => a - b);
}

function buildReadableMidiTicks(params: {
  min: number;
  max: number;
  yFromMidi: (midi: number) => number;
  topBound: number;
  bottomBound: number;
  minPixelGap: number;
  maxTicks: number;
}): number[] {
  const { min, max, yFromMidi, topBound, bottomBound, minPixelGap, maxTicks } = params;
  const base = buildSparseMidiTicks(min, max, Math.max(maxTicks + 2, 12));
  const candidates = base
    .map((midi) => ({ midi, y: yFromMidi(midi) }))
    .filter((v) => v.y >= topBound + 8 && v.y <= bottomBound - 8)
    .sort((a, b) => a.y - b.y);

  const picked: Array<{ midi: number; y: number }> = [];
  candidates.forEach((c) => {
    const close = picked.some((p) => Math.abs(p.y - c.y) < minPixelGap);
    if (!close) picked.push(c);
  });

  const pruned = picked
    .sort((a, b) => a.midi - b.midi)
    .filter((_, idx, arr) => {
      if (arr.length <= maxTicks) return true;
      const step = Math.ceil(arr.length / maxTicks);
      return idx % step === 0 || idx === arr.length - 1;
    })
    .map((v) => v.midi);

  return pruned.length > 0 ? pruned : [min, max];
}

function isBlackKey(pitchClass: number): boolean {
  const normalized = ((pitchClass % 12) + 12) % 12;
  return normalized === 1 || normalized === 3 || normalized === 6 || normalized === 8 || normalized === 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function transposeNote(note: string | null, semitones: number): string | null {
  const midi = noteToMidi(note);
  if (midi == null) return null;
  return midiToNote(midi + semitones);
}

function transposeNoteToMidi(note: string | null, semitones: number): number | null {
  const midi = noteToMidi(note);
  if (midi == null) return null;
  return midi + semitones;
}

function RangeHistoryList({
  runs,
  voiceTab,
  latestLabel,
  bestLabel,
}: {
  runs: MeasurementRun[];
  voiceTab: RangeVoiceTab;
  latestLabel: string;
  bestLabel: string;
}) {
  const rows = runs
    .map((run) => ({ run, result: asRangeResult(run.result) }))
    .filter((v) => v.result != null)
    .reverse();
  const monthGroups = rows.reduce<Array<{ month: string; rows: typeof rows }>>((acc, row) => {
    const month = row.run.recorded_at.slice(0, 7);
    const last = acc[acc.length - 1];
    if (!last || last.month !== month) {
      acc.push({ month, rows: [row] });
    } else {
      last.rows.push(row);
    }
    return acc;
  }, []);
  return (
    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
      <div className="insightsCard__head">
        <div className="insightsCard__title">測定履歴</div>
      </div>
      <div className="insightsHistoryMeta">
        <div className="insightsHistoryMeta__item">最新: {latestLabel}</div>
        <div className="insightsHistoryMeta__item">最大: {bestLabel}</div>
      </div>
      {rows.length === 0 && <div className="insightsMuted">履歴がありません。</div>}
      <div className="insightsHistoryList">
        {monthGroups.slice(0, 12).map((group) => (
          <div key={`range-month-${group.month}`} className="insightsHistoryMonth">
            <div className="insightsHistoryMonth__head">{formatMonthLabel(group.month)}</div>
            <div className="insightsHistoryMonth__rows">
              {group.rows.slice(0, 30).map(({ run, result }) => (
                <div key={`range-run-${run.id}`} className="insightsHistoryRow">
                  <div className="insightsHistoryRow__date">{run.recorded_at.slice(5, 10)}</div>
                  <div className="insightsHistoryRow__notes">
                    <span className="insightsHistoryRow__top">{historyHighNote(result, voiceTab)}</span>
                    <span className="insightsHistoryRow__sep">/</span>
                    <span className="insightsHistoryRow__low">{historyLowNote(result, voiceTab)}</span>
                  </div>
                  <div className="insightsHistoryRow__range">
                    <span className="insightsHistoryRow__rangeValue">{historyRangeOctaves(result, voiceTab)}</span>
                    <span className="insightsHistoryRow__rangeUnit">oct</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
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

function formatMonthLabel(month: string): string {
  const m = month.match(/^(\d{4})-(\d{2})$/);
  if (!m) return month;
  return `${Number(m[1])}年${Number(m[2])}月`;
}

function historyHighNote(result: ReturnType<typeof asRangeResult>, tab: RangeVoiceTab): string {
  if (!result) return "-";
  if (tab === "chest") return result.chest_top_note ?? "-";
  if (tab === "falsetto") return result.falsetto_top_note ?? "-";
  return result.highest_note ?? "-";
}

function historyLowNote(result: ReturnType<typeof asRangeResult>, tab: RangeVoiceTab): string {
  if (!result) return "-";
  if (tab === "falsetto") return transposeNote(result.lowest_note ?? null, 10) ?? "-";
  return result.lowest_note ?? "-";
}

function historyRangeOctaves(result: ReturnType<typeof asRangeResult>, tab: RangeVoiceTab): string {
  if (!result) return "-";
  const highMidi = noteToMidi(historyHighNote(result, tab));
  const lowMidi = noteToMidi(historyLowNote(result, tab));
  if (highMidi == null || lowMidi == null || highMidi < lowMidi) return "-";
  return ((highMidi - lowMidi) / 12).toFixed(2);
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

function errorMessage(e: unknown, fallback: string) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return fallback;
}

function parseMetricTab(raw: string | null): MetricTabKey {
  if (raw === "long_tone" || raw === "volume_stability") return raw;
  return "range";
}
