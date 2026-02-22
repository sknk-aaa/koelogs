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
        pitch_accuracy: MeasurementRun | null;
      };
      rangeRuns: MeasurementRun[];
      longToneRuns: MeasurementRun[];
      volumeRuns: MeasurementRun[];
      pitchAccuracyRuns: MeasurementRun[];
    };

const PERIODS = [30, 90, 365] as const;
const METRIC_TABS = [
  { key: "range", label: "音域" },
  { key: "long_tone", label: "ロングトーン" },
  { key: "volume_stability", label: "音量安定性" },
  { key: "pitch_accuracy", label: "音程精度" },
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
    id: -209,
    measurement_type: "long_tone",
    include_in_insights: true,
    recorded_at: "2025-12-20T08:00:00+09:00",
    created_at: "2025-12-20T08:00:00+09:00",
    result: { sustain_sec: 5.8, sustain_note: "F#3" },
  },
  {
    id: -208,
    measurement_type: "long_tone",
    include_in_insights: true,
    recorded_at: "2025-12-27T08:00:00+09:00",
    created_at: "2025-12-27T08:00:00+09:00",
    result: { sustain_sec: 6.6, sustain_note: "G3" },
  },
  {
    id: -207,
    measurement_type: "long_tone",
    include_in_insights: true,
    recorded_at: "2026-01-03T08:00:00+09:00",
    created_at: "2026-01-03T08:00:00+09:00",
    result: { sustain_sec: 6.0, sustain_note: "G3" },
  },
  {
    id: -206,
    measurement_type: "long_tone",
    include_in_insights: true,
    recorded_at: "2026-01-08T08:00:00+09:00",
    created_at: "2026-01-08T08:00:00+09:00",
    result: { sustain_sec: 6.7, sustain_note: "G#3" },
  },
  {
    id: -205,
    measurement_type: "long_tone",
    include_in_insights: true,
    recorded_at: "2026-01-12T08:00:00+09:00",
    created_at: "2026-01-12T08:00:00+09:00",
    result: { sustain_sec: 7.4, sustain_note: "G3" },
  },
  {
    id: -204,
    measurement_type: "long_tone",
    include_in_insights: true,
    recorded_at: "2026-01-26T08:00:00+09:00",
    created_at: "2026-01-26T08:00:00+09:00",
    result: { sustain_sec: 8.9, sustain_note: "A3" },
  },
  {
    id: -203,
    measurement_type: "long_tone",
    include_in_insights: true,
    recorded_at: "2026-02-03T08:00:00+09:00",
    created_at: "2026-02-03T08:00:00+09:00",
    result: { sustain_sec: 10.1, sustain_note: "A#3" },
  },
  {
    id: -2025,
    measurement_type: "long_tone",
    include_in_insights: true,
    recorded_at: "2026-02-07T08:00:00+09:00",
    created_at: "2026-02-07T08:00:00+09:00",
    result: { sustain_sec: 9.8, sustain_note: "A#3" },
  },
  {
    id: -202,
    measurement_type: "long_tone",
    include_in_insights: true,
    recorded_at: "2026-02-11T08:00:00+09:00",
    created_at: "2026-02-11T08:00:00+09:00",
    result: { sustain_sec: 11.4, sustain_note: "B3" },
  },
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
    id: -309,
    measurement_type: "volume_stability",
    include_in_insights: true,
    recorded_at: "2025-12-18T08:00:00+09:00",
    created_at: "2025-12-18T08:00:00+09:00",
    result: {
      avg_loudness_db: -73.1,
      min_loudness_db: -89.7,
      max_loudness_db: -62.4,
      loudness_range_db: 27.3,
      loudness_range_ratio: 0.373,
      loudness_range_pct: 62.7,
    },
  },
  {
    id: -308,
    measurement_type: "volume_stability",
    include_in_insights: true,
    recorded_at: "2025-12-30T08:00:00+09:00",
    created_at: "2025-12-30T08:00:00+09:00",
    result: {
      avg_loudness_db: -72.2,
      min_loudness_db: -85.5,
      max_loudness_db: -62.8,
      loudness_range_db: 22.7,
      loudness_range_ratio: 0.314,
      loudness_range_pct: 68.6,
    },
  },
  {
    id: -307,
    measurement_type: "volume_stability",
    include_in_insights: true,
    recorded_at: "2026-01-05T08:00:00+09:00",
    created_at: "2026-01-05T08:00:00+09:00",
    result: {
      avg_loudness_db: -72.9,
      min_loudness_db: -88.8,
      max_loudness_db: -64.9,
      loudness_range_db: 23.9,
      loudness_range_ratio: 0.328,
      loudness_range_pct: 67.2,
    },
  },
  {
    id: -306,
    measurement_type: "volume_stability",
    include_in_insights: true,
    recorded_at: "2026-01-14T08:00:00+09:00",
    created_at: "2026-01-14T08:00:00+09:00",
    result: {
      avg_loudness_db: -71.3,
      min_loudness_db: -84.2,
      max_loudness_db: -63.6,
      loudness_range_db: 20.6,
      loudness_range_ratio: 0.289,
      loudness_range_pct: 71.1,
    },
  },
  {
    id: -305,
    measurement_type: "volume_stability",
    include_in_insights: true,
    recorded_at: "2026-01-09T08:00:00+09:00",
    created_at: "2026-01-09T08:00:00+09:00",
    result: {
      avg_loudness_db: -72.6,
      min_loudness_db: -86.4,
      max_loudness_db: -61.8,
      loudness_range_db: 24.6,
      loudness_range_ratio: 0.339,
      loudness_range_pct: 66.1,
    },
  },
  {
    id: -304,
    measurement_type: "volume_stability",
    include_in_insights: true,
    recorded_at: "2026-01-22T08:00:00+09:00",
    created_at: "2026-01-22T08:00:00+09:00",
    result: {
      avg_loudness_db: -70.8,
      min_loudness_db: -81.2,
      max_loudness_db: -62.7,
      loudness_range_db: 18.5,
      loudness_range_ratio: 0.261,
      loudness_range_pct: 73.9,
    },
  },
  {
    id: -303,
    measurement_type: "volume_stability",
    include_in_insights: true,
    recorded_at: "2026-02-02T08:00:00+09:00",
    created_at: "2026-02-02T08:00:00+09:00",
    result: {
      avg_loudness_db: -69.8,
      min_loudness_db: -78.9,
      max_loudness_db: -62.4,
      loudness_range_db: 16.5,
      loudness_range_ratio: 0.236,
      loudness_range_pct: 76.4,
    },
  },
  {
    id: -3025,
    measurement_type: "volume_stability",
    include_in_insights: true,
    recorded_at: "2026-02-09T08:00:00+09:00",
    created_at: "2026-02-09T08:00:00+09:00",
    result: {
      avg_loudness_db: -70.1,
      min_loudness_db: -79.6,
      max_loudness_db: -62.9,
      loudness_range_db: 16.7,
      loudness_range_ratio: 0.238,
      loudness_range_pct: 76.2,
    },
  },
  {
    id: -302,
    measurement_type: "volume_stability",
    include_in_insights: true,
    recorded_at: "2026-02-12T08:00:00+09:00",
    created_at: "2026-02-12T08:00:00+09:00",
    result: {
      avg_loudness_db: -68.9,
      min_loudness_db: -76.4,
      max_loudness_db: -62.3,
      loudness_range_db: 14.1,
      loudness_range_ratio: 0.205,
      loudness_range_pct: 79.5,
    },
  },
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

const GUEST_PITCH_ACCURACY_RUNS: MeasurementRun[] = [
  {
    id: -409,
    measurement_type: "pitch_accuracy",
    include_in_insights: true,
    recorded_at: "2025-12-19T08:00:00+09:00",
    created_at: "2025-12-19T08:00:00+09:00",
    result: {
      avg_cents_error: 40.1,
      accuracy_score: 59.9,
      note_count: 76,
    },
  },
  {
    id: -408,
    measurement_type: "pitch_accuracy",
    include_in_insights: true,
    recorded_at: "2025-12-31T08:00:00+09:00",
    created_at: "2025-12-31T08:00:00+09:00",
    result: {
      avg_cents_error: 36.9,
      accuracy_score: 63.1,
      note_count: 80,
    },
  },
  {
    id: -407,
    measurement_type: "pitch_accuracy",
    include_in_insights: true,
    recorded_at: "2026-01-06T08:00:00+09:00",
    created_at: "2026-01-06T08:00:00+09:00",
    result: {
      avg_cents_error: 38.0,
      accuracy_score: 62.0,
      note_count: 79,
    },
  },
  {
    id: -406,
    measurement_type: "pitch_accuracy",
    include_in_insights: true,
    recorded_at: "2026-01-15T08:00:00+09:00",
    created_at: "2026-01-15T08:00:00+09:00",
    result: {
      avg_cents_error: 33.8,
      accuracy_score: 66.2,
      note_count: 85,
    },
  },
  {
    id: -405,
    measurement_type: "pitch_accuracy",
    include_in_insights: true,
    recorded_at: "2026-01-11T08:00:00+09:00",
    created_at: "2026-01-11T08:00:00+09:00",
    result: {
      avg_cents_error: 34.7,
      accuracy_score: 65.3,
      note_count: 84,
    },
  },
  {
    id: -404,
    measurement_type: "pitch_accuracy",
    include_in_insights: true,
    recorded_at: "2026-01-24T08:00:00+09:00",
    created_at: "2026-01-24T08:00:00+09:00",
    result: {
      avg_cents_error: 30.2,
      accuracy_score: 69.8,
      note_count: 90,
    },
  },
  {
    id: -403,
    measurement_type: "pitch_accuracy",
    include_in_insights: true,
    recorded_at: "2026-02-04T08:00:00+09:00",
    created_at: "2026-02-04T08:00:00+09:00",
    result: {
      avg_cents_error: 26.1,
      accuracy_score: 73.9,
      note_count: 94,
    },
  },
  {
    id: -4025,
    measurement_type: "pitch_accuracy",
    include_in_insights: true,
    recorded_at: "2026-02-10T08:00:00+09:00",
    created_at: "2026-02-10T08:00:00+09:00",
    result: {
      avg_cents_error: 27.3,
      accuracy_score: 72.7,
      note_count: 93,
    },
  },
  {
    id: -402,
    measurement_type: "pitch_accuracy",
    include_in_insights: true,
    recorded_at: "2026-02-14T08:00:00+09:00",
    created_at: "2026-02-14T08:00:00+09:00",
    result: {
      avg_cents_error: 24.8,
      accuracy_score: 75.2,
      note_count: 95,
    },
  },
  {
    id: -401,
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
          pitch_accuracy: GUEST_PITCH_ACCURACY_RUNS[GUEST_PITCH_ACCURACY_RUNS.length - 1] ?? null,
        },
        rangeRuns: [...GUEST_RANGE_RUNS],
        longToneRuns: [...GUEST_LONG_TONE_RUNS],
        volumeRuns: [...GUEST_VOLUME_RUNS],
        pitchAccuracyRuns: [...GUEST_PITCH_ACCURACY_RUNS],
      });
      return;
    }

    let cancelled = false;
    (async () => {
      setState({ kind: "loading" });
      try {
        const [latest, rangeRuns, longToneRuns, volumeRuns, pitchAccuracyRuns] = await Promise.all([
          fetchLatestMeasurements(),
          fetchMeasurements({ measurement_type: "range", days, limit: 365, include_in_insights: true }),
          fetchMeasurements({ measurement_type: "long_tone", days, limit: 365, include_in_insights: true }),
          fetchMeasurements({ measurement_type: "volume_stability", days, limit: 365, include_in_insights: true }),
          fetchMeasurements({ measurement_type: "pitch_accuracy", days, limit: 365, include_in_insights: true }),
        ]);
        if (cancelled) return;

        setState({
          kind: "ready",
          latest,
          rangeRuns: [...rangeRuns].reverse(),
          longToneRuns: [...longToneRuns].reverse(),
          volumeRuns: [...volumeRuns].reverse(),
          pitchAccuracyRuns: [...pitchAccuracyRuns].reverse(),
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
    const sourceRuns =
      metricTab === "range"
        ? state.rangeRuns
        : metricTab === "long_tone"
          ? state.longToneRuns
          : metricTab === "volume_stability"
            ? state.volumeRuns
            : state.pitchAccuracyRuns;
    const months = new Set<string>();
    sourceRuns.forEach((run) => {
      months.add(run.recorded_at.slice(0, 7));
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [state, metricTab]);

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
  const monthFilteredLongToneRuns = useMemo(() => {
    if (state.kind !== "ready") return [] as MeasurementRun[];
    if (monthFilter === "all") return state.longToneRuns;
    return state.longToneRuns.filter((run) => run.recorded_at.slice(0, 7) === monthFilter);
  }, [state, monthFilter]);
  const monthFilteredVolumeRuns = useMemo(() => {
    if (state.kind !== "ready") return [] as MeasurementRun[];
    if (monthFilter === "all") return state.volumeRuns;
    return state.volumeRuns.filter((run) => run.recorded_at.slice(0, 7) === monthFilter);
  }, [state, monthFilter]);
  const monthFilteredPitchAccuracyRuns = useMemo(() => {
    if (state.kind !== "ready") return [] as MeasurementRun[];
    if (monthFilter === "all") return state.pitchAccuracyRuns;
    return state.pitchAccuracyRuns.filter((run) => run.recorded_at.slice(0, 7) === monthFilter);
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
    return monthFilteredLongToneRuns.map((run) => {
      const result = asLongToneResult(run.result);
      return {
        date: run.recorded_at.slice(0, 10),
        value: result?.sustain_sec ?? null,
      };
    });
  }, [monthFilteredLongToneRuns]);

  const volumePoints = useMemo(() => {
    return monthFilteredVolumeRuns.map((run) => {
      const result = asVolumeResult(run.result);
      return {
        date: run.recorded_at.slice(0, 10),
        value: result?.loudness_range_pct ?? null,
      };
    });
  }, [monthFilteredVolumeRuns]);
  const pitchAccuracySemitonePoints = useMemo(() => {
    return monthFilteredPitchAccuracyRuns.map((run) => {
      const result = asPitchAccuracyResult(run.result);
      return {
        date: run.recorded_at.slice(0, 10),
        value: result?.avg_cents_error != null ? Math.max(0, result.avg_cents_error / 100) : null,
      };
    });
  }, [monthFilteredPitchAccuracyRuns]);

  const rangeBandPoints =
    rangeVoiceTab === "chest"
      ? rangeBandPointsChest
      : rangeVoiceTab === "falsetto"
        ? rangeBandPointsFalsetto
        : rangeBandPointsTotal;
  const rangePoints = rangeBandPoints.map((p) => ({ date: p.date, value: p.high }));
  const metricPoints =
    metricTab === "range"
      ? rangePoints
      : metricTab === "long_tone"
        ? longTonePoints
        : metricTab === "volume_stability"
          ? volumePoints
          : pitchAccuracySemitonePoints;
  const metricLatest = latestValue(metricPoints);
  const metricBest = maxValue(metricPoints);
  const pitchAccuracySemitoneLatest = latestValue(pitchAccuracySemitonePoints);
  const pitchAccuracySemitoneBest = minValue(pitchAccuracySemitonePoints);
  const longToneBestRun = useMemo(() => {
    return buildLongToneBestRun(monthFilteredLongToneRuns);
  }, [monthFilteredLongToneRuns]);
  const longToneBest = longToneBestRun?.sec ?? null;
  const longToneLatestResult = useMemo(() => {
    if (monthFilteredLongToneRuns.length === 0) return null;
    return asLongToneResult(monthFilteredLongToneRuns[monthFilteredLongToneRuns.length - 1].result);
  }, [monthFilteredLongToneRuns]);
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
              {explicitMetricMode ? `${metricLabel}の詳細データを表示しています。` : "音域・ロングトーン・音量安定性・音程精度を確認できます。"}
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
                  <div className="insightsCard__title">
                    {metricTab === "range"
                      ? "音域（過去最高）"
                      : metricTab === "long_tone"
                        ? "ロングトーン（最高記録）"
                        : metricTab === "volume_stability"
                          ? "音量安定性（最高記録）"
                          : metricTab === "pitch_accuracy"
                            ? "音程精度（最高記録）"
                            : `${metricLabel}（最新）`}
                  </div>
                </div>
                <LatestSingleMetricCard
                  latest={state.latest}
                  metricTab={metricTab}
                  rangeBestRun={rangeBestRun}
                  longToneBest={longToneBest}
                  longToneBestRun={longToneBestRun}
                  longToneLatest={longToneLatestResult}
                  volumeBestRun={buildVolumeBestRun(monthFilteredVolumeRuns)}
                  pitchAccuracyBestRun={buildPitchAccuracyBestRun(monthFilteredPitchAccuracyRuns)}
                />
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
                ) : metricTab === "long_tone" ? (
                  <LongToneTrendChart points={metricPoints} />
                ) : metricTab === "volume_stability" ? (
                  <ScoreTrendChart
                    points={metricPoints}
                    color="#f0c419"
                    unit="%"
                    min={0}
                    max={100}
                    yTicks={[0, 20, 40, 60, 80, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                ) : metricTab === "pitch_accuracy" ? (
                  <ScoreTrendChart
                    points={metricPoints}
                    color="#2563eb"
                    unit="半音"
                    min={0}
                    max={1}
                    yTicks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
                    tickFormatter={(v) => `${v.toFixed(1)}半音`}
                    higherIsBetter={false}
                  />
                ) : (
                  <SimpleTrendChart points={metricPoints} />
                )}
                {metricTab === "long_tone" && (
                  <LongToneHistoryList
                    runs={monthFilteredLongToneRuns}
                    latestLabel={formatMetricValue(metricLatest, metricTab)}
                    bestLabel={formatMetricValue(metricBest, metricTab)}
                  />
                )}
                {metricTab === "volume_stability" && (
                  <MetricScoreHistoryList
                    runs={monthFilteredVolumeRuns}
                    latestLabel={formatMetricValue(metricLatest, metricTab)}
                    bestLabel={formatMetricValue(metricBest, metricTab)}
                    valueExtractor={(run) => asVolumeResult(run.result)?.loudness_range_pct ?? null}
                    detailRenderer={(run) => {
                      const r = asVolumeResult(run.result);
                      if (!r) return "-";
                      const avg = r.avg_loudness_db != null ? `${r.avg_loudness_db.toFixed(1)}dB` : "-";
                      const range = r.loudness_range_db != null ? `${r.loudness_range_db.toFixed(1)}dB` : "-";
                      return `平均 ${avg} / 差 ${range}`;
                    }}
                    valueFormatter={(v) => `${v.toFixed(1)}%`}
                    deltaFormatter={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`}
                  />
                )}
                {metricTab === "pitch_accuracy" && (
                  <MetricScoreHistoryList
                    runs={monthFilteredPitchAccuracyRuns}
                    latestLabel={formatSemitoneValue(pitchAccuracySemitoneLatest)}
                    bestLabel={formatSemitoneValue(pitchAccuracySemitoneBest)}
                    valueExtractor={(run) => {
                      const r = asPitchAccuracyResult(run.result);
                      return r?.avg_cents_error != null ? Math.max(0, r.avg_cents_error / 100) : null;
                    }}
                    detailRenderer={(run) => {
                      const r = asPitchAccuracyResult(run.result);
                      if (!r) return "-";
                      const cents = r.avg_cents_error != null ? `${r.avg_cents_error.toFixed(1)}cent` : "-";
                      const notes = r.note_count ?? "-";
                      return `平均ズレ ${cents} / 発声音数 ${notes}`;
                    }}
                    valueFormatter={(v) => `${v.toFixed(2)}半音`}
                    deltaFormatter={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}半音`}
                    higherIsBetter={false}
                  />
                )}
                {metricTab !== "range" && metricTab !== "long_tone" && metricTab !== "volume_stability" && metricTab !== "pitch_accuracy" && (
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
                <LatestSummaryCards latest={state.latest} rangeBestRun={rangeBestRun} longToneBest={longToneBest} longToneBestRun={longToneBestRun} />
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
                ) : metricTab === "long_tone" ? (
                  <LongToneTrendChart points={metricPoints} />
                ) : metricTab === "volume_stability" ? (
                  <ScoreTrendChart
                    points={metricPoints}
                    color="#f0c419"
                    unit="%"
                    min={0}
                    max={100}
                    yTicks={[0, 20, 40, 60, 80, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                ) : metricTab === "pitch_accuracy" ? (
                  <ScoreTrendChart
                    points={metricPoints}
                    color="#2563eb"
                    unit="半音"
                    min={0}
                    max={1}
                    yTicks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
                    tickFormatter={(v) => `${v.toFixed(1)}半音`}
                    higherIsBetter={false}
                  />
                ) : (
                  <SimpleTrendChart points={metricPoints} />
                )}

                {metricTab === "long_tone" && (
                  <LongToneHistoryList
                    runs={monthFilteredLongToneRuns}
                    latestLabel={formatMetricValue(metricLatest, metricTab)}
                    bestLabel={formatMetricValue(metricBest, metricTab)}
                  />
                )}
                {metricTab === "volume_stability" && (
                  <MetricScoreHistoryList
                    runs={monthFilteredVolumeRuns}
                    latestLabel={formatMetricValue(metricLatest, metricTab)}
                    bestLabel={formatMetricValue(metricBest, metricTab)}
                    valueExtractor={(run) => asVolumeResult(run.result)?.loudness_range_pct ?? null}
                    detailRenderer={(run) => {
                      const r = asVolumeResult(run.result);
                      if (!r) return "-";
                      const avg = r.avg_loudness_db != null ? `${r.avg_loudness_db.toFixed(1)}dB` : "-";
                      const range = r.loudness_range_db != null ? `${r.loudness_range_db.toFixed(1)}dB` : "-";
                      return `平均 ${avg} / 差 ${range}`;
                    }}
                    valueFormatter={(v) => `${v.toFixed(1)}%`}
                    deltaFormatter={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`}
                  />
                )}
                {metricTab === "pitch_accuracy" && (
                  <MetricScoreHistoryList
                    runs={monthFilteredPitchAccuracyRuns}
                    latestLabel={formatSemitoneValue(pitchAccuracySemitoneLatest)}
                    bestLabel={formatSemitoneValue(pitchAccuracySemitoneBest)}
                    valueExtractor={(run) => {
                      const r = asPitchAccuracyResult(run.result);
                      return r?.avg_cents_error != null ? Math.max(0, r.avg_cents_error / 100) : null;
                    }}
                    detailRenderer={(run) => {
                      const r = asPitchAccuracyResult(run.result);
                      if (!r) return "-";
                      const cents = r.avg_cents_error != null ? `${r.avg_cents_error.toFixed(1)}cent` : "-";
                      const notes = r.note_count ?? "-";
                      return `平均ズレ ${cents} / 発声音数 ${notes}`;
                    }}
                    valueFormatter={(v) => `${v.toFixed(2)}半音`}
                    deltaFormatter={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}半音`}
                    higherIsBetter={false}
                  />
                )}
                {metricTab !== "range" && metricTab !== "long_tone" && metricTab !== "volume_stability" && metricTab !== "pitch_accuracy" && (
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
  longToneBest,
  longToneBestRun,
  longToneLatest,
  volumeBestRun,
  pitchAccuracyBestRun,
}: {
  latest: {
    range: MeasurementRun | null;
    long_tone: MeasurementRun | null;
    volume_stability: MeasurementRun | null;
    pitch_accuracy: MeasurementRun | null;
  };
  metricTab: MetricTabKey;
  rangeBestRun: { run: MeasurementRun; result: NonNullable<ReturnType<typeof asRangeResult>> } | null;
  longToneBest: number | null;
  longToneBestRun: { run: MeasurementRun; sec: number; note: string | null } | null;
  longToneLatest: ReturnType<typeof asLongToneResult> | null;
  volumeBestRun: { run: MeasurementRun; result: ReturnType<typeof asVolumeResult>; score: number } | null;
  pitchAccuracyBestRun: { run: MeasurementRun; result: ReturnType<typeof asPitchAccuracyResult>; score: number } | null;
}) {
  const longTone = longToneLatest ?? asLongToneResult(latest.long_tone?.result);
  const volume = (volumeBestRun?.result ?? asVolumeResult(latest.volume_stability?.result)) as ReturnType<typeof asVolumeResult>;
  const pitchAccuracy = (pitchAccuracyBestRun?.result ?? asPitchAccuracyResult(latest.pitch_accuracy?.result)) as ReturnType<typeof asPitchAccuracyResult>;

  if (metricTab === "range") {
    const best = rangeBestRun?.result ?? null;
    return <RangeLikeCard range={best} note="今まででの最高音域" />;
  }

  if (metricTab === "long_tone") {
    return (
      <div className="insightsMeasureCard">
        <LongToneDial
          seconds={longToneBestRun?.sec ?? longTone?.sustain_sec ?? null}
          note={longToneBestRun?.note ?? longTone?.sustain_note ?? null}
          bestSeconds={longToneBest}
          recordedAt={longToneBestRun?.run.recorded_at ?? null}
          latestSeconds={longToneLatest?.sustain_sec ?? null}
        />
      </div>
    );
  }

  if (metricTab === "pitch_accuracy") {
    return (
      <PitchAccuracySummaryCard pitchAccuracy={pitchAccuracy} />
    );
  }

  if (metricTab === "volume_stability") {
    return <VolumeStabilityGaugeCard volume={volume} />;
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
      <div className="insightsMuted">許容幅内率 (平均±3dB): {volume?.loudness_range_pct != null ? `${volume.loudness_range_pct.toFixed(1)}%` : "-"}</div>
    </div>
  );
}

function LatestSummaryCards({
  latest,
  rangeBestRun,
  longToneBest,
  longToneBestRun,
}: {
  latest: {
    range: MeasurementRun | null;
    long_tone: MeasurementRun | null;
    volume_stability: MeasurementRun | null;
    pitch_accuracy: MeasurementRun | null;
  };
  rangeBestRun: { run: MeasurementRun; result: NonNullable<ReturnType<typeof asRangeResult>> } | null;
  longToneBest: number | null;
  longToneBestRun: { run: MeasurementRun; sec: number; note: string | null } | null;
}) {
  const range = rangeBestRun?.result ?? asRangeResult(latest.range?.result);
  const longTone = asLongToneResult(latest.long_tone?.result);
  const volume = asVolumeResult(latest.volume_stability?.result);
  const pitchAccuracy = asPitchAccuracyResult(latest.pitch_accuracy?.result);

  return (
    <div className="insightsMeasureGrid">
      <div className="insightsMeasureCard">
        <div className="insightsMeasureLabel">音域（過去最高）</div>
        <RangeLikeCard range={range} compact />
      </div>

      <div className="insightsMeasureCard">
        <div className="insightsMeasureLabel">ロングトーン（最高記録）</div>
        <LongToneDial
          seconds={longToneBestRun?.sec ?? longTone?.sustain_sec ?? null}
          note={longToneBestRun?.note ?? longTone?.sustain_note ?? null}
          bestSeconds={longToneBest}
          recordedAt={longToneBestRun?.run.recorded_at ?? null}
          latestSeconds={longTone?.sustain_sec ?? null}
        />
      </div>

      <div className="insightsMeasureCard">
        <div className="insightsMeasureLabel">音量安定性（最高記録）</div>
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
        <div className="insightsMuted">許容幅内率 (平均±3dB): {volume?.loudness_range_pct != null ? `${volume.loudness_range_pct.toFixed(1)}%` : "-"}</div>
      </div>

      <div className="insightsMeasureCard">
        <div className="insightsMeasureLabel">音程精度（最新）</div>
        <div className="insightsPitchHeroCard">
          <div className="insightsPitchHeroCard__valueRow">
            <span className="insightsPitchHeroCard__value">{pitchAccuracy?.accuracy_score != null ? pitchAccuracy.accuracy_score.toFixed(1) : "-"}</span>
            <span className="insightsPitchHeroCard__unit">点</span>
          </div>
          <div className="insightsPitchHeroCard__sub">
            平均ズレ: {pitchAccuracy?.avg_cents_error != null ? `${pitchAccuracy.avg_cents_error.toFixed(1)} cent` : "-"}
          </div>
          <div className="insightsPitchHeroCard__chips">
            <div className="insightsPitchHeroCard__chip">発声音数 {pitchAccuracy?.note_count ?? "-"}</div>
            <div className="insightsPitchHeroCard__chip">
              目安 ±{pitchAccuracy?.avg_cents_error != null ? Math.round(Math.max(1, pitchAccuracy.avg_cents_error)) : "-"} cent
            </div>
            <div className="insightsPitchHeroCard__chip">
              精度 {pitchAccuracy?.accuracy_score != null ? `${pitchAccuracy.accuracy_score.toFixed(1)}点` : "-"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VolumeStabilityGaugeCard({ volume }: { volume: ReturnType<typeof asVolumeResult> | null }) {
  return (
    <div className="insightsGaugePanel">
      <SimpleCircleGauge
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
  );
}

function PitchAccuracySummaryCard({ pitchAccuracy }: { pitchAccuracy: ReturnType<typeof asPitchAccuracyResult> | null }) {
  const score = pitchAccuracy?.accuracy_score ?? null;
  const avgCents = pitchAccuracy?.avg_cents_error ?? null;
  const noteCount = pitchAccuracy?.note_count ?? null;
  const semitoneDrift = avgCents != null ? Math.max(0, avgCents / 100) : null;
  const driftForBar = semitoneDrift != null ? Math.min(1, semitoneDrift) : null;
  const stabilityLabel =
    semitoneDrift == null ? "—" : semitoneDrift <= 0.2 ? "非常に安定" : semitoneDrift <= 0.5 ? "安定" : "要改善";

  return (
    <div className="insightsPitchSemitone">
      <div className="insightsPitchSemitone__main">{semitoneDrift != null ? `${semitoneDrift.toFixed(2)} 半音` : "-"}</div>
      <div
        className={`insightsPitchSemitone__status${
          stabilityLabel === "要改善" ? " is-bad" : stabilityLabel === "安定" ? " is-mid" : ""
        }`}
      >
        {stabilityLabel}
      </div>
      <div className="insightsPitchSemitone__bar">
        <div className="insightsPitchSemitone__barZone insightsPitchSemitone__barZone--good" />
        <div className="insightsPitchSemitone__barZone insightsPitchSemitone__barZone--mid" />
        <div className="insightsPitchSemitone__barZone insightsPitchSemitone__barZone--bad" />
        <div className="insightsPitchSemitone__barArrow" aria-hidden="true" />
        {driftForBar != null && (
          <span
            className="insightsPitchSemitone__barMarker"
            style={{ left: `${driftForBar * 100}%` }}
          />
        )}
      </div>
      <div className="insightsPitchSemitone__legend">
        <span>0</span>
        <span className="insightsPitchSemitone__legendArrow" aria-hidden="true" />
        <span>1半音</span>
      </div>
      <div className="insightsPitchSemitone__meta">
        <span>分析ノート数: {noteCount ?? "-"}</span>
        {score != null && <span>スコア {score.toFixed(1)}点</span>}
        <span>平均ズレ: {avgCents != null ? `${avgCents.toFixed(1)} cent` : "-"}</span>
      </div>
    </div>
  );
}

function SimpleCircleGauge({
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

function LongToneDial({
  seconds,
  note,
  bestSeconds,
  recordedAt,
  latestSeconds,
}: {
  seconds: number | null;
  note: string | null;
  bestSeconds: number | null;
  recordedAt?: string | null;
  latestSeconds?: number | null;
}) {
  const safeSec = seconds == null ? 0 : Math.max(0, seconds);
  const goalSec = 20;
  const bestRatio = safeSec > 0 ? Math.max(0, Math.min(100, Math.round((safeSec / goalSec) * 100))) : 0;
  const progress = bestRatio / 100;
  const isBest = seconds != null && bestSeconds != null && seconds >= bestSeconds;
  const diffFromLatest = seconds != null && latestSeconds != null ? seconds - latestSeconds : null;
  const progressColor = "#3b82f6";
  const r = 42;
  const c = 52;
  const arc = 2 * Math.PI * r;
  const offset = arc * (1 - progress);

  return (
    <div className="insightsLongTone insightsLongTone--record">
      <div className="insightsLongTone__main">
        <div className="insightsLongTone__ringWrap">
          <svg viewBox="0 0 104 104" className="insightsLongTone__ring" aria-hidden="true">
            <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(59, 130, 246, 0.22)" strokeWidth="8" />
            <circle
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={progressColor}
              strokeWidth="8"
              strokeDasharray={arc}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 52 52)"
            />
          </svg>
          <div className="insightsLongTone__center">
            <div className="insightsLongTone__value">{seconds != null ? seconds.toFixed(1) : "-"}</div>
            <div className="insightsLongTone__unit">秒</div>
          </div>
        </div>
        <div className="insightsLongTone__compareRow insightsLongTone__compareRow--record">
          <div className="insightsLongTone__compareItem">
            <span className="insightsLongTone__compareLabel">最高記録</span>
            <strong>{seconds != null ? `${seconds.toFixed(1)}s` : "—"}</strong>
            {isBest && <span className="insightsLongTone__bestBadge">BEST</span>}
            {recordedAt && <span className="insightsLongTone__meta">記録日: {recordedAt.slice(0, 10)}</span>}
            {diffFromLatest != null && (
              <span className="insightsLongTone__meta">
                最新との差: {diffFromLatest >= 0 ? "+" : ""}
                {diffFromLatest.toFixed(1)}s
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="insightsLongTone__note">発声音程: {note ?? "-"}</div>
    </div>
  );
}

function formatMetricValue(v: number | null, key: (typeof METRIC_TABS)[number]["key"]) {
  if (v == null) return "—";
  if (key === "range") return midiToNote(Math.round(v));
  if (key === "long_tone") return `${Number(v).toFixed(1)}秒`;
  if (key === "volume_stability") return `${Number(v).toFixed(1)}%`;
  if (key === "pitch_accuracy") return `${Number(v).toFixed(1)}点`;
  return `${Number(v).toFixed(1)}点`;
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
        <line x1={padLeft} y1={height - padBottom} x2={width - padRight} y2={height - padBottom} stroke="rgba(40,79,130,0.36)" />
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={height - padBottom} stroke="rgba(40,79,130,0.36)" />
        {yMode === "note" &&
          Array.from({ length: 7 }).map((_, idx) => {
            const r = idx / 6;
            const midi = Math.round(min + (max - min) * (1 - r));
            const y = padTop + (height - padTop - padBottom) * r;
            return (
              <g key={`note-tick-${idx}`}>
                <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="rgba(54,110,182,0.2)" />
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
              <line x1={x} y1={height - padBottom} x2={x} y2={height - padBottom + 4} stroke="rgba(42,89,155,0.38)" />
              <text x={x} y={height - 8} textAnchor="middle" style={{ fontSize: 11, opacity: 0.76 }}>
                {dateLabel}
              </text>
            </g>
          );
        })}
        <path d={d} fill="none" stroke="color-mix(in srgb, var(--accent) 72%, #0b3f77)" strokeWidth="3" />
      </svg>
    </div>
  );
}

function LongToneTrendChart({ points }: { points: MeasurementPoint[] }) {
  const width = 760;
  const height = 260;
  const axisWidth = 40;
  const padTop = 18;
  const padBottom = 36;
  const padLeft = 18;
  const padRight = 18;
  const values = points.map((p) => p.value).filter((v): v is number => v != null);
  const dataMax = values.length ? Math.max(...values) : 0;
  const max = Math.max(4, Math.ceil(dataMax + 1));
  const min = 0;
  const range = Math.max(1, max - min);
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const step = points.length > 1 ? plotW / (points.length - 1) : 0;

  const plotted = points
    .map((p, index) => {
      if (p.value == null) return null;
      const x = padLeft + step * index;
      const y = padTop + (1 - (p.value - min) / range) * plotH;
      return { x, y, value: p.value, date: p.date, index };
    })
    .filter((v): v is NonNullable<typeof v> => v != null);

  const bestValue = plotted.length > 0 ? Math.max(...plotted.map((p) => p.value)) : null;
  const bestPoint =
    bestValue == null ? null : [...plotted].reverse().find((p) => p.value === bestValue) ?? null;
  const latestPoint = plotted.length > 0 ? plotted[plotted.length - 1] : null;

  const linePath = plotted.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath =
    plotted.length >= 2
      ? `${linePath} L ${plotted[plotted.length - 1].x} ${height - padBottom} L ${plotted[0].x} ${height - padBottom} Z`
      : "";

  const yTickStep = max <= 10 ? 2 : Math.max(2, Math.ceil(max / 5));
  const yTicks: number[] = [];
  for (let v = 0; v <= max; v += yTickStep) yTicks.push(v);
  if (yTicks[yTicks.length - 1] !== max) yTicks.push(max);

  const xTicks = Array.from(
    new Set(points.length <= 1 ? [0] : [0, Math.floor((points.length - 1) * 0.33), Math.floor((points.length - 1) * 0.66), points.length - 1])
  );
  const xAxisY = height - padBottom;

  return (
    <div className="insightsFixedTrend">
      <div className="insightsFixedTrend__frame">
        <div className="insightsFixedTrend__axis" style={{ width: `${axisWidth}px`, minWidth: `${axisWidth}px`, maxWidth: `${axisWidth}px` }}>
          <svg viewBox={`0 0 ${axisWidth} ${height}`} className="insightsFixedTrend__axisSvg" aria-hidden="true">
            <line x1={axisWidth - 1} y1={padTop} x2={axisWidth - 1} y2={xAxisY} stroke="#9fc2ea" />
            {yTicks.map((v) => {
              const y = padTop + (1 - (v - min) / range) * plotH;
              return (
                <g key={`lt-axis-y-${v}`}>
                  <line x1={axisWidth - 5} y1={y} x2={axisWidth - 1} y2={y} stroke="#8eb7e8" strokeWidth="1.1" />
                  <text x={axisWidth - 7} y={y + 4} textAnchor="end" className="insightsFixedTrend__yLabel">
                    {v}s
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="insightsFixedTrend__scroll">
          <div className="insightsFixedTrend__plotInner" style={{ minWidth: `${width}px` }}>
            <svg viewBox={`0 0 ${width} ${height}`} className="insightsFixedTrend__svg" style={{ width: `${width}px` }} aria-hidden="true">
              <defs>
                <linearGradient id="longtoneGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.34} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.06} />
                </linearGradient>
                <filter id="longtoneDotShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="1.8" floodColor="rgba(59,130,246,0.3)" />
                </filter>
              </defs>

              {yTicks.map((v) => {
                const y = padTop + (1 - (v - min) / range) * plotH;
                return (
                  <line key={`lt-y-${v}`} x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="rgba(56,124,205,0.18)" strokeDasharray="3 3" />
                );
              })}

              {xTicks.map((idx) => {
                const p = points[idx];
                const x = padLeft + step * idx;
                return (
                  <g key={`lt-x-${idx}`}>
                    <line x1={x} y1={xAxisY} x2={x} y2={xAxisY + 4} stroke="rgba(42,89,155,0.38)" />
                    <text x={x} y={height - 8} textAnchor="middle" style={{ fontSize: 11, opacity: 0.76 }}>
                      {p?.date ? p.date.slice(5) : ""}
                    </text>
                  </g>
                );
              })}

              <line x1={padLeft} y1={xAxisY} x2={width - padRight} y2={xAxisY} stroke="rgba(40,79,130,0.36)" />
              <line x1={padLeft} y1={padTop} x2={padLeft} y2={xAxisY} stroke="rgba(40,79,130,0.36)" />

              {areaPath && <path d={areaPath} fill="url(#longtoneGradient)" />}
              {linePath && <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

              {plotted.map((p) => {
                const isLatest = latestPoint != null && latestPoint.index === p.index;
                return (
                  <g key={`lt-dot-${p.index}`}>
                    {isLatest && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={10}
                        fill="rgba(59,130,246,0.16)"
                        stroke="none"
                        filter="url(#longtoneDotShadow)"
                      />
                    )}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isLatest ? 7.5 : 6}
                      fill="#fff"
                      stroke="#2563eb"
                      strokeWidth={2}
                    />
                  </g>
                );
              })}

              {bestPoint && (
                <g transform={`translate(${bestPoint.x}, ${bestPoint.y - 22})`}>
                  <rect x={-18} y={-14} width={36} height={16} rx={8} fill="rgba(184,137,0,0.95)" />
                  <text x={0} y={-3} textAnchor="middle" style={{ fontSize: 9, fontWeight: 900, fill: "#fff", letterSpacing: "0.03em" }}>
                    BEST
                  </text>
                </g>
              )}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreTrendChart({
  points,
  color,
  unit,
  min = 0,
  max = 100,
  yTicks,
  tickFormatter,
  higherIsBetter = true,
}: {
  points: MeasurementPoint[];
  color: string;
  unit: string;
  min?: number;
  max?: number;
  yTicks?: number[];
  tickFormatter?: (value: number) => string;
  higherIsBetter?: boolean;
}) {
  const width = 760;
  const height = 260;
  const axisWidth = 40;
  const padTop = 18;
  const padBottom = 36;
  const padLeft = 18;
  const padRight = 18;
  const domainMin = min;
  const domainMax = max;
  const range = Math.max(0.0001, domainMax - domainMin);
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const step = points.length > 1 ? plotW / (points.length - 1) : 0;

  const plotted = points
    .map((p, index) => {
      if (p.value == null) return null;
      const x = padLeft + step * index;
      const y = padTop + (1 - (p.value - domainMin) / range) * plotH;
      return { x, y, value: p.value, date: p.date, index };
    })
    .filter((v): v is NonNullable<typeof v> => v != null);

  const bestValue = plotted.length > 0 ? (higherIsBetter ? Math.max(...plotted.map((p) => p.value)) : Math.min(...plotted.map((p) => p.value))) : null;
  const bestPoint =
    bestValue == null ? null : [...plotted].reverse().find((p) => p.value === bestValue) ?? null;
  const latestPoint = plotted.length > 0 ? plotted[plotted.length - 1] : null;
  const linePath = plotted.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath =
    plotted.length >= 2
      ? `${linePath} L ${plotted[plotted.length - 1].x} ${height - padBottom} L ${plotted[0].x} ${height - padBottom} Z`
      : "";
  const xTicks = Array.from(
    new Set(points.length <= 1 ? [0] : [0, Math.floor((points.length - 1) * 0.33), Math.floor((points.length - 1) * 0.66), points.length - 1])
  );
  const yAxisTicks = yTicks ?? [0, 20, 40, 60, 80, 100];
  const xAxisY = height - padBottom;
  const isSemitoneAxis = unit === "半音";
  const formatAxisTick = (value: number) => {
    if (tickFormatter) {
      const formatted = tickFormatter(value);
      return isSemitoneAxis ? formatted.replace(/半音/g, "") : formatted;
    }
    return isSemitoneAxis ? `${value}` : `${value}${unit}`;
  };

  return (
    <div className="insightsFixedTrend">
      <div className="insightsFixedTrend__frame">
        <div className="insightsFixedTrend__axis" style={{ width: `${axisWidth}px`, minWidth: `${axisWidth}px`, maxWidth: `${axisWidth}px` }}>
          <svg viewBox={`0 0 ${axisWidth} ${height}`} className="insightsFixedTrend__axisSvg" aria-hidden="true">
            {isSemitoneAxis && (
              <text x={axisWidth - 8} y={padTop - 6} textAnchor="end" className="insightsFixedTrend__axisTitle">
                半音
              </text>
            )}
            <line x1={axisWidth - 1} y1={padTop} x2={axisWidth - 1} y2={xAxisY} stroke="#9fc2ea" />
            {yAxisTicks.map((v) => {
              const y = padTop + (1 - (v - domainMin) / range) * plotH;
              return (
                <g key={`score-axis-y-${v}`}>
                  <line x1={axisWidth - 5} y1={y} x2={axisWidth - 1} y2={y} stroke="#8eb7e8" strokeWidth="1.1" />
                  <text x={axisWidth - 7} y={y + 4} textAnchor="end" className="insightsFixedTrend__yLabel">
                    {formatAxisTick(v)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="insightsFixedTrend__scroll">
          <div className="insightsFixedTrend__plotInner" style={{ minWidth: `${width}px` }}>
            <svg viewBox={`0 0 ${width} ${height}`} className="insightsFixedTrend__svg" style={{ width: `${width}px` }} aria-hidden="true">
              <defs>
                <linearGradient id={`scoreGradient-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.32} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              </defs>

              {yAxisTicks.map((v) => {
                const y = padTop + (1 - (v - domainMin) / range) * plotH;
                return (
                  <line key={`score-y-${v}`} x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="rgba(56,124,205,0.18)" strokeDasharray="3 3" />
                );
              })}

              {xTicks.map((idx) => {
                const p = points[idx];
                const x = padLeft + step * idx;
                return (
                  <g key={`score-x-${idx}`}>
                    <line x1={x} y1={xAxisY} x2={x} y2={xAxisY + 4} stroke="rgba(42,89,155,0.38)" />
                    <text x={x} y={height - 8} textAnchor="middle" style={{ fontSize: 11, opacity: 0.76 }}>
                      {p?.date ? p.date.slice(5) : ""}
                    </text>
                  </g>
                );
              })}

              <line x1={padLeft} y1={xAxisY} x2={width - padRight} y2={xAxisY} stroke="rgba(40,79,130,0.36)" />
              <line x1={padLeft} y1={padTop} x2={padLeft} y2={xAxisY} stroke="rgba(40,79,130,0.36)" />

              {areaPath && <path d={areaPath} fill={`url(#scoreGradient-${color.replace("#", "")})`} />}
              {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

              {plotted.map((p) => {
                const isLatest = latestPoint != null && latestPoint.index === p.index;
                return (
                  <g key={`score-dot-${p.index}`}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isLatest ? 7.5 : 6}
                      fill="#fff"
                      stroke={color}
                      strokeWidth={2}
                    />
                  </g>
                );
              })}

              {bestPoint && (
                <g transform={`translate(${bestPoint.x}, ${bestPoint.y - 22})`}>
                  <rect x={-18} y={-14} width={36} height={16} rx={8} fill="rgba(184,137,0,0.95)" />
                  <text x={0} y={-3} textAnchor="middle" style={{ fontSize: 9, fontWeight: 900, fill: "#fff", letterSpacing: "0.03em" }}>
                    BEST
                  </text>
                </g>
              )}
            </svg>
          </div>
        </div>
      </div>
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
        axisWidth: 34,
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
        axisWidth: 44,
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
            <line x1={axisWidth - 1} y1={padTop} x2={axisWidth - 1} y2={xAxisY} stroke="#9fc2ea" />
            {yTicks.map((midi, idx) => {
              const y = yFromMidi(midi);
              const label = midiToNote(midi);
              const isC = midi % 12 === 0;
              return (
                <g key={`range-axis-y-${midi}-${idx}`}>
                  <line x1={axisWidth - 5} y1={y} x2={axisWidth - 1} y2={y} stroke={isC ? "#8eb7e8" : "#c5daf2"} strokeWidth={isC ? 1.2 : 1} />
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
            <stop offset="0%" stopColor="#eef6ff" />
            <stop offset="100%" stopColor="#deeeff" />
          </linearGradient>
          <linearGradient id="rangeTrendBand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={isMobile ? 0.28 : 0.4} />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity={isMobile ? 0.2 : 0.28} />
          </linearGradient>
          <linearGradient id="rangeTrendHigh" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#2563eb" />
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
              <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke={isC ? "#8eb7e8" : "#c5daf2"} strokeWidth={isC ? 1.2 : 1} />
            </g>
          );
        })}

        <line x1={padLeft} y1={xAxisY} x2={width - padRight} y2={xAxisY} stroke="#9fc2ea" />
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={xAxisY} stroke="#9fc2ea" />

        {bandAreaPath && <path d={bandAreaPath} fill="url(#rangeTrendBand)" stroke="none" />}

        {lowPath && <path d={lowPath} fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="4 4" />}
        {highPath && <path d={highPath} fill="none" stroke="url(#rangeTrendHigh)" strokeWidth="3.8" />}

        {hovered && <circle cx={hovered.x} cy={hovered.lowY} r={layout.lowDotR} fill="#60a5fa" stroke="#fff" strokeWidth="1.1" />}
        {decorated.map((p) => (
          <circle
            key={`range-high-${p.index}`}
            cx={p.x}
            cy={p.highY}
            r={p.improvedFromPrev ? layout.highDotStrongR : layout.highDotR}
            fill={p.improvedFromPrev ? "#1d4ed8" : "#2563eb"}
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
              <line x1={x} y1={xAxisY} x2={x} y2={xAxisY + 5} stroke="#7ea8d8" />
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
            stroke="#38bdf8"
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

function LongToneHistoryList({
  runs,
  latestLabel,
  bestLabel,
}: {
  runs: MeasurementRun[];
  latestLabel: string;
  bestLabel: string;
}) {
  const rows = runs
    .map((run) => {
      const result = asLongToneResult(run.result);
      const sec = typeof result?.sustain_sec === "number" ? result.sustain_sec : null;
      return { run, sec, note: result?.sustain_note ?? null };
    })
    .filter((v): v is { run: MeasurementRun; sec: number; note: string | null } => v.sec != null)
    .sort((a, b) => a.run.recorded_at.localeCompare(b.run.recorded_at));

  const rowsWithCompare = rows.reduce<
    Array<{
      run: MeasurementRun;
      sec: number;
      note: string | null;
      prevSec: number | null;
      deltaSec: number | null;
      bestRatio: number | null;
      isNewBest: boolean;
    }>
  >((acc, row) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : null;
    const prevSec = prev?.sec ?? null;
    const prevBest = acc.length > 0 ? Math.max(...acc.map((v) => v.sec)) : null;
    const isNewBest = prevBest == null || row.sec > prevBest;
    const currentBest = prevBest == null ? row.sec : Math.max(prevBest, row.sec);
    acc.push({
      ...row,
      prevSec,
      deltaSec: prevSec == null ? null : row.sec - prevSec,
      bestRatio: currentBest > 0 ? Math.round((row.sec / currentBest) * 100) : null,
      isNewBest,
    });
    return acc;
  }, []);

  const displayRows = [...rowsWithCompare].reverse();
  const bestSec = rowsWithCompare.length === 0 ? null : Math.max(...rowsWithCompare.map((row) => row.sec));
  const latestRow = rowsWithCompare.length ? rowsWithCompare[rowsWithCompare.length - 1] : null;
  const showLatestBestBadge = latestRow != null && bestSec != null && latestRow.sec === bestSec;
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

  const monthGroups = displayRows.reduce<Array<{ month: string; rows: typeof displayRows }>>((acc, row) => {
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
        <div className="insightsHistoryMeta__item">
          最大: {bestLabel}
          {showLatestBestBadge && <span className="insightsHistoryMeta__bestBadge">BEST</span>}
        </div>
        {latestRow?.deltaSec != null && (
          <div className="insightsHistoryMeta__item">
            前回比 {latestRow.deltaSec >= 0 ? "+" : ""}
            {latestRow.deltaSec.toFixed(1)}秒
          </div>
        )}
      </div>
      {displayRows.length === 0 && <div className="insightsMuted">履歴がありません。</div>}
      <div className="insightsHistoryList insightsLongToneHistoryList">
        {monthGroups.slice(0, 12).map((group) => (
          <div key={`long-tone-month-${group.month}`} className="insightsHistoryMonth">
            <div className="insightsHistoryMonth__head">
              <button
                type="button"
                className="insightsHistoryMonth__toggle"
                onClick={() =>
                  setCollapsedMonths((prev) => ({
                    ...prev,
                    [group.month]: !prev[group.month],
                  }))
                }
              >
                <span>{formatMonthLabel(group.month)}</span>
                <span className={`insightsHistoryMonth__caret${collapsedMonths[group.month] ? " is-collapsed" : ""}`}>▼</span>
              </button>
            </div>
            {!collapsedMonths[group.month] && (
              <div className="insightsHistoryMonth__rows">
                {group.rows.slice(0, 30).map(({ run, sec, note, deltaSec, bestRatio, isNewBest }) => {
                  const isUp = deltaSec != null && deltaSec > 0;
                  const isDown = deltaSec != null && deltaSec < 0;
                  return (
                    <div key={`long-tone-run-${run.id}`} className="insightsHistoryRow insightsLongToneHistoryRow">
                      <div className="insightsHistoryRow__date">{run.recorded_at.slice(5, 10)}</div>
                      <div className="insightsLongToneHistoryRow__main">
                        <span className="insightsLongToneHistoryRow__sec">{sec.toFixed(1)}秒</span>
                        <span className="insightsLongToneHistoryRow__note">{note ?? "-"}</span>
                      </div>
                      <div className="insightsLongToneHistoryRow__compare">
                        <span className="insightsLongToneHistoryRow__ratio">ベスト比 {bestRatio != null ? `${bestRatio}%` : "—"}</span>
                        {deltaSec != null && (
                          <span
                            className={`insightsLongToneHistoryRow__delta${isUp ? " is-up" : ""}${isDown ? " is-down" : ""}`}
                          >
                            Δ {deltaSec >= 0 ? "+" : ""}
                            {deltaSec.toFixed(1)}s
                          </span>
                        )}
                        <div className="insightsLongToneHistoryRow__badges">
                          {isNewBest && <span className="insightsLongToneHistoryRow__badge is-best">NEW BEST</span>}
                          {isUp && <span className="insightsLongToneHistoryRow__badge is-up">↑</span>}
                          {isDown && <span className="insightsLongToneHistoryRow__badge is-down">↓</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricScoreHistoryList({
  runs,
  latestLabel,
  bestLabel,
  valueExtractor,
  detailRenderer,
  valueFormatter = (v) => `${v.toFixed(1)}点`,
  deltaFormatter = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}点`,
  higherIsBetter = true,
}: {
  runs: MeasurementRun[];
  latestLabel: string;
  bestLabel: string;
  valueExtractor: (run: MeasurementRun) => number | null;
  detailRenderer: (run: MeasurementRun) => string;
  valueFormatter?: (value: number) => string;
  deltaFormatter?: (delta: number) => string;
  higherIsBetter?: boolean;
}) {
  const rows = runs
    .map((run) => ({ run, score: valueExtractor(run), detail: detailRenderer(run) }))
    .filter((v): v is { run: MeasurementRun; score: number; detail: string } => v.score != null)
    .sort((a, b) => a.run.recorded_at.localeCompare(b.run.recorded_at));

  const rowsWithCompare = rows.reduce<
    Array<{ run: MeasurementRun; score: number; detail: string; delta: number | null; ratio: number | null; isNewBest: boolean }>
  >((acc, row) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : null;
    const prevBest = acc.length > 0 ? (higherIsBetter ? Math.max(...acc.map((v) => v.score)) : Math.min(...acc.map((v) => v.score))) : null;
    const isNewBest = prevBest == null || (higherIsBetter ? row.score > prevBest : row.score < prevBest);
    const currentBest = prevBest == null ? row.score : higherIsBetter ? Math.max(prevBest, row.score) : Math.min(prevBest, row.score);
    acc.push({
      ...row,
      delta: prev == null ? null : row.score - prev.score,
      ratio:
        currentBest > 0 && row.score > 0
          ? Math.round((higherIsBetter ? row.score / currentBest : currentBest / row.score) * 100)
          : null,
      isNewBest,
    });
    return acc;
  }, []);

  const displayRows = [...rowsWithCompare].reverse();
  const bestScore = rowsWithCompare.length
    ? higherIsBetter
      ? Math.max(...rowsWithCompare.map((row) => row.score))
      : Math.min(...rowsWithCompare.map((row) => row.score))
    : null;
  const latest = rowsWithCompare.length ? rowsWithCompare[rowsWithCompare.length - 1] : null;
  const showBestBadge = latest != null && bestScore != null && latest.score === bestScore;
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

  const monthGroups = displayRows.reduce<Array<{ month: string; rows: typeof displayRows }>>((acc, row) => {
    const month = row.run.recorded_at.slice(0, 7);
    const last = acc[acc.length - 1];
    if (!last || last.month !== month) acc.push({ month, rows: [row] });
    else last.rows.push(row);
    return acc;
  }, []);

  return (
    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
      <div className="insightsCard__head">
        <div className="insightsCard__title">測定履歴</div>
      </div>
      <div className="insightsHistoryMeta">
        <div className="insightsHistoryMeta__item">最新: {latestLabel}</div>
        <div className="insightsHistoryMeta__item">
          最大: {bestLabel}
          {showBestBadge && <span className="insightsHistoryMeta__bestBadge">BEST</span>}
        </div>
        {latest?.delta != null && (
          <div className="insightsHistoryMeta__item">
            前回比 {deltaFormatter(latest.delta)}
          </div>
        )}
      </div>
      {displayRows.length === 0 && <div className="insightsMuted">履歴がありません。</div>}
      <div className="insightsHistoryList insightsLongToneHistoryList">
        {monthGroups.slice(0, 12).map((group) => (
          <div key={`score-month-${group.month}`} className="insightsHistoryMonth">
            <div className="insightsHistoryMonth__head">
              <button
                type="button"
                className="insightsHistoryMonth__toggle"
                onClick={() =>
                  setCollapsedMonths((prev) => ({
                    ...prev,
                    [group.month]: !prev[group.month],
                  }))
                }
              >
                <span>{formatMonthLabel(group.month)}</span>
                <span className={`insightsHistoryMonth__caret${collapsedMonths[group.month] ? " is-collapsed" : ""}`}>▼</span>
              </button>
            </div>
            {!collapsedMonths[group.month] && (
              <div className="insightsHistoryMonth__rows">
                {group.rows.slice(0, 30).map(({ run, score, delta, ratio, detail, isNewBest }) => {
                  const isUp = delta != null && (higherIsBetter ? delta > 0 : delta < 0);
                  const isDown = delta != null && (higherIsBetter ? delta < 0 : delta > 0);
                  return (
                    <div key={`score-run-${run.id}`} className="insightsHistoryRow insightsLongToneHistoryRow">
                      <div className="insightsHistoryRow__date">{run.recorded_at.slice(5, 10)}</div>
                      <div className="insightsLongToneHistoryRow__main">
                        <span className="insightsLongToneHistoryRow__sec">{valueFormatter(score)}</span>
                        <span className="insightsLongToneHistoryRow__note">{detail}</span>
                      </div>
                      <div className="insightsLongToneHistoryRow__compare">
                        <span className="insightsLongToneHistoryRow__ratio">ベスト比 {ratio != null ? `${ratio}%` : "—"}</span>
                        {delta != null && (
                          <span className={`insightsLongToneHistoryRow__delta${isUp ? " is-up" : ""}${isDown ? " is-down" : ""}`}>
                            Δ {deltaFormatter(delta)}
                          </span>
                        )}
                        <div className="insightsLongToneHistoryRow__badges">
                          {isNewBest && <span className="insightsLongToneHistoryRow__badge is-best">NEW BEST</span>}
                          {isUp && <span className="insightsLongToneHistoryRow__badge is-up">↑</span>}
                          {isDown && <span className="insightsLongToneHistoryRow__badge is-down">↓</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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

function asPitchAccuracyResult(result: MeasurementRun["result"] | undefined) {
  if (!result || typeof result !== "object") return null;
  if (!("accuracy_score" in result)) return null;
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

function minValue(points: MeasurementPoint[]) {
  const values = points.map((p) => p.value).filter((v): v is number => v != null);
  if (values.length === 0) return null;
  return Math.min(...values);
}

function formatSemitoneValue(v: number | null) {
  if (v == null) return "—";
  return `${v.toFixed(2)}半音`;
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

function buildLongToneBestRun(runs: MeasurementRun[]) {
  const parsed = runs
    .map((run) => {
      const result = asLongToneResult(run.result);
      const sec = typeof result?.sustain_sec === "number" ? result.sustain_sec : null;
      return { run, sec, note: result?.sustain_note ?? null };
    })
    .filter((v): v is { run: MeasurementRun; sec: number; note: string | null } => v.sec != null);
  if (parsed.length === 0) return null;
  return parsed.reduce((best, cur) => (cur.sec > best.sec ? cur : best));
}

function buildVolumeBestRun(runs: MeasurementRun[]) {
  const parsed = runs
    .map((run) => {
      const result = asVolumeResult(run.result);
      const score = typeof result?.loudness_range_pct === "number" ? result.loudness_range_pct : null;
      return { run, result, score };
    })
    .filter((v): v is { run: MeasurementRun; result: ReturnType<typeof asVolumeResult>; score: number } => v.score != null);
  if (parsed.length === 0) return null;
  return parsed.reduce((best, cur) => (cur.score > best.score ? cur : best));
}

function buildPitchAccuracyBestRun(runs: MeasurementRun[]) {
  const parsed = runs
    .map((run) => {
      const result = asPitchAccuracyResult(run.result);
      const score = typeof result?.accuracy_score === "number" ? result.accuracy_score : null;
      return { run, result, score };
    })
    .filter((v): v is { run: MeasurementRun; result: ReturnType<typeof asPitchAccuracyResult>; score: number } => v.score != null);
  if (parsed.length === 0) return null;
  return parsed.reduce((best, cur) => (cur.score > best.score ? cur : best));
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
  if (raw === "long_tone" || raw === "volume_stability" || raw === "pitch_accuracy") return raw;
  return "range";
}
