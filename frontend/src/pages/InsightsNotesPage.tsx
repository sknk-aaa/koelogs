import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import {
  fetchLatestMeasurements,
  fetchMeasurements,
  updateMeasurement,
  type MeasurementRun,
} from "../api/measurements";
import type { MeasurementPoint } from "../types/insights";
import { useAuth } from "../features/auth/useAuth";
import MetronomeLoader from "../components/MetronomeLoader";
import PremiumUpsellModal from "../components/PremiumUpsellModal";
import premiumPreviewInsights from "../assets/premium/preview-insights.svg";
import "./InsightsPages.css";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      latest: LatestMeasurements;
      rangeRuns: MeasurementRun[];
      longToneRuns: MeasurementRun[];
      volumeRuns: MeasurementRun[];
      pitchAccuracyRuns: MeasurementRun[];
    };

type LatestMeasurements = {
  range: MeasurementRun | null;
  long_tone: MeasurementRun | null;
  volume_stability: MeasurementRun | null;
  pitch_accuracy: MeasurementRun | null;
};

const PERIODS = [7, 30, 90, 365] as const;
const PREMIUM_PERIODS = [30, 90, 365] as const;
const FREE_MINI_GRAPH_DAYS = 7;
const FREE_HISTORY_LIMIT = 1;
const METRIC_TABS = [
  { key: "range", label: "音域" },
  { key: "long_tone", label: "ロングトーン" },
  { key: "volume_stability", label: "音量安定性" },
  { key: "pitch_accuracy", label: "音程精度" },
] as const;
type MetricTabKey = (typeof METRIC_TABS)[number]["key"];
type RangeVoiceTab = "total" | "chest" | "falsetto";
type RangeBandPoint = { date: string; low: number | null; high: number | null };
type ExcludableMetric = "range" | "long_tone" | "volume_stability" | "pitch_accuracy";

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
  const navigate = useNavigate();
  const { me, isLoading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [metricTab, setMetricTab] = useState<MetricTabKey>(() => parseMetricTab(searchParams.get("metric")));
  const [rangeVoiceTab, setRangeVoiceTab] = useState<RangeVoiceTab>("total");
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [bestMenuOpen, setBestMenuOpen] = useState(false);
  const [excludeBusy, setExcludeBusy] = useState(false);
  const [excludeActionError, setExcludeActionError] = useState<string | null>(null);
  const [excludeToast, setExcludeToast] = useState<{
    metric: ExcludableMetric;
    run: MeasurementRun;
  } | null>(null);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const excludeToastTimerRef = useRef<number | null>(null);

  const guestMode = !authLoading && !me;
  const isPremium = me?.plan_tier === "premium";
  const isFreeLimited = !guestMode && !authLoading && !isPremium;
  const visiblePeriods: readonly number[] = isFreeLimited ? [FREE_MINI_GRAPH_DAYS] : PREMIUM_PERIODS;

  useEffect(() => {
    if (!isFreeLimited) return;
    if (days !== FREE_MINI_GRAPH_DAYS) {
      setDays(FREE_MINI_GRAPH_DAYS);
    }
  }, [days, isFreeLimited]);

  useEffect(() => {
    if (isFreeLimited) return;
    if (days === FREE_MINI_GRAPH_DAYS) {
      setDays(PREMIUM_PERIODS[0]);
    }
  }, [days, isFreeLimited]);

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

  const monthFilteredRangeRuns = useMemo(() => {
    if (state.kind !== "ready") return [] as MeasurementRun[];
    return pickDailyRepresentativeRuns(state.rangeRuns, (run) => asRangeResult(run.result)?.range_semitones ?? null, "max");
  }, [state]);
  const monthFilteredLongToneRuns = useMemo(() => {
    if (state.kind !== "ready") return [] as MeasurementRun[];
    return pickDailyRepresentativeRuns(state.longToneRuns, (run) => asLongToneResult(run.result)?.sustain_sec ?? null, "max");
  }, [state]);
  const monthFilteredVolumeRuns = useMemo(() => {
    if (state.kind !== "ready") return [] as MeasurementRun[];
    return pickDailyRepresentativeRuns(state.volumeRuns, (run) => asVolumeResult(run.result)?.loudness_range_pct ?? null, "max");
  }, [state]);
  const monthFilteredPitchAccuracyRuns = useMemo(() => {
    if (state.kind !== "ready") return [] as MeasurementRun[];
    return pickDailyRepresentativeRuns(
      state.pitchAccuracyRuns,
      (run) => {
        const result = asPitchAccuracyResult(run.result);
        return result?.avg_cents_error ?? result?.accuracy_score ?? null;
      },
      "min"
    );
  }, [state]);
  const displayedRangeRuns = useMemo(
    () => (isFreeLimited ? trimRunsToRecentDays(monthFilteredRangeRuns, FREE_MINI_GRAPH_DAYS) : monthFilteredRangeRuns),
    [isFreeLimited, monthFilteredRangeRuns]
  );
  const displayedLongToneRuns = useMemo(
    () => (isFreeLimited ? trimRunsToRecentDays(monthFilteredLongToneRuns, FREE_MINI_GRAPH_DAYS) : monthFilteredLongToneRuns),
    [isFreeLimited, monthFilteredLongToneRuns]
  );
  const displayedVolumeRuns = useMemo(
    () => (isFreeLimited ? trimRunsToRecentDays(monthFilteredVolumeRuns, FREE_MINI_GRAPH_DAYS) : monthFilteredVolumeRuns),
    [isFreeLimited, monthFilteredVolumeRuns]
  );
  const displayedPitchAccuracyRuns = useMemo(
    () =>
      isFreeLimited
        ? trimRunsToRecentDays(monthFilteredPitchAccuracyRuns, FREE_MINI_GRAPH_DAYS)
        : monthFilteredPitchAccuracyRuns,
    [isFreeLimited, monthFilteredPitchAccuracyRuns]
  );
  const rangeBandPointsTotal = useMemo<RangeBandPoint[]>(() => {
    if (displayedRangeRuns.length === 0) return [];
    const byDate = new Map<string, { low: number[]; high: number[] }>();
    displayedRangeRuns.forEach((run) => {
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
  }, [displayedRangeRuns]);
  const rangeBandPointsChest = useMemo<RangeBandPoint[]>(() => {
    if (displayedRangeRuns.length === 0) return [];
    const byDate = new Map<string, { low: number[]; high: number[] }>();
    displayedRangeRuns.forEach((run) => {
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
  }, [displayedRangeRuns]);
  const rangeBandPointsFalsetto = useMemo<RangeBandPoint[]>(() => {
    if (displayedRangeRuns.length === 0) return [];
    const byDate = new Map<string, { low: number[]; high: number[] }>();
    displayedRangeRuns.forEach((run) => {
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
  }, [displayedRangeRuns]);

  const longTonePoints = useMemo(() => {
    return displayedLongToneRuns
      .map((run) => {
        const result = asLongToneResult(run.result);
        return {
          date: run.recorded_at.slice(0, 10),
          value: result?.sustain_sec ?? null,
        };
      })
      .filter((point): point is MeasurementPoint & { value: number } => point.value != null);
  }, [displayedLongToneRuns]);

  const volumePoints = useMemo(() => {
    return displayedVolumeRuns
      .map((run) => {
        const result = asVolumeResult(run.result);
        return {
          date: run.recorded_at.slice(0, 10),
          value: result?.loudness_range_pct ?? null,
        };
      })
      .filter((point): point is MeasurementPoint & { value: number } => point.value != null);
  }, [displayedVolumeRuns]);
  const pitchAccuracySemitonePoints = useMemo(() => {
    return displayedPitchAccuracyRuns
      .map((run) => {
        const result = asPitchAccuracyResult(run.result);
        return {
          date: run.recorded_at.slice(0, 10),
          value: result?.avg_cents_error != null ? Math.max(0, result.avg_cents_error / 100) : null,
        };
      })
      .filter((point): point is MeasurementPoint & { value: number } => point.value != null);
  }, [displayedPitchAccuracyRuns]);

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
  const volumeBestRun = useMemo(() => {
    return buildVolumeBestRun(monthFilteredVolumeRuns);
  }, [monthFilteredVolumeRuns]);
  const pitchAccuracyBestRun = useMemo(() => {
    return buildPitchAccuracyBestRun(monthFilteredPitchAccuracyRuns);
  }, [monthFilteredPitchAccuracyRuns]);
  const longToneBest = longToneBestRun?.sec ?? null;
  const longToneLatestResult = useMemo(() => {
    if (monthFilteredLongToneRuns.length === 0) return null;
    return asLongToneResult(monthFilteredLongToneRuns[monthFilteredLongToneRuns.length - 1].result);
  }, [monthFilteredLongToneRuns]);
  const representativeLatest = useMemo(() => {
    const fallback =
      state.kind === "ready"
        ? state.latest
        : { range: null, long_tone: null, volume_stability: null, pitch_accuracy: null };
    return {
      range: latestRunFrom(monthFilteredRangeRuns) ?? fallback.range,
      long_tone: latestRunFrom(monthFilteredLongToneRuns) ?? fallback.long_tone,
      volume_stability: latestRunFrom(monthFilteredVolumeRuns) ?? fallback.volume_stability,
      pitch_accuracy: latestRunFrom(monthFilteredPitchAccuracyRuns) ?? fallback.pitch_accuracy,
    };
  }, [monthFilteredLongToneRuns, monthFilteredPitchAccuracyRuns, monthFilteredRangeRuns, monthFilteredVolumeRuns, state]);
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

  const excludableBestTarget = useMemo(() => {
    if (metricTab === "range") return rangeBestRun?.run ?? null;
    if (metricTab === "long_tone") return longToneBestRun?.run ?? null;
    if (metricTab === "volume_stability") return volumeBestRun?.run ?? null;
    if (metricTab === "pitch_accuracy") return pitchAccuracyBestRun?.run ?? null;
    return null;
  }, [metricTab, rangeBestRun, longToneBestRun, volumeBestRun, pitchAccuracyBestRun]);

  useEffect(() => {
    setBestMenuOpen(false);
  }, [metricTab, days]);

  useEffect(() => {
    return () => {
      if (excludeToastTimerRef.current != null) {
        window.clearTimeout(excludeToastTimerRef.current);
        excludeToastTimerRef.current = null;
      }
    };
  }, []);

  const handleExcludeBest = async () => {
    if (!excludableBestTarget) return;
    if (excludeBusy) return;
    const targetMetric = metricTab as ExcludableMetric;
    setExcludeActionError(null);
    setExcludeBusy(true);
    setBestMenuOpen(false);
    try {
      await updateMeasurement({ id: excludableBestTarget.id, include_in_insights: false });
      setState((prev) => {
        if (prev.kind !== "ready") return prev;
        if (targetMetric === "range") {
          const nextRuns = nextRunsAfterExcluding(prev.rangeRuns, excludableBestTarget.id);
          return { ...prev, rangeRuns: nextRuns, latest: updateLatestByMetric(prev.latest, targetMetric, nextRuns) };
        }
        if (targetMetric === "long_tone") {
          const nextRuns = nextRunsAfterExcluding(prev.longToneRuns, excludableBestTarget.id);
          return { ...prev, longToneRuns: nextRuns, latest: updateLatestByMetric(prev.latest, targetMetric, nextRuns) };
        }
        if (targetMetric === "volume_stability") {
          const nextRuns = nextRunsAfterExcluding(prev.volumeRuns, excludableBestTarget.id);
          return { ...prev, volumeRuns: nextRuns, latest: updateLatestByMetric(prev.latest, targetMetric, nextRuns) };
        }
        const nextRuns = nextRunsAfterExcluding(prev.pitchAccuracyRuns, excludableBestTarget.id);
        return { ...prev, pitchAccuracyRuns: nextRuns, latest: updateLatestByMetric(prev.latest, targetMetric, nextRuns) };
      });
      setExcludeToast({ metric: targetMetric, run: excludableBestTarget });
      if (excludeToastTimerRef.current != null) window.clearTimeout(excludeToastTimerRef.current);
      excludeToastTimerRef.current = window.setTimeout(() => {
        setExcludeToast(null);
        excludeToastTimerRef.current = null;
      }, 5000);
    } catch (e) {
      setExcludeActionError(errorMessage(e, "最高記録の除外に失敗しました"));
    } finally {
      setExcludeBusy(false);
    }
  };

  const handleUndoExclude = async () => {
    if (!excludeToast || excludeBusy) return;
    setExcludeActionError(null);
    setExcludeBusy(true);
    const { metric, run } = excludeToast;
    try {
      await updateMeasurement({ id: run.id, include_in_insights: true });
      setState((prev) => {
        if (prev.kind !== "ready") return prev;
        if (metric === "range") {
          const nextRuns = nextRunsAfterRestoring(prev.rangeRuns, run);
          return { ...prev, rangeRuns: nextRuns, latest: updateLatestByMetric(prev.latest, metric, nextRuns) };
        }
        if (metric === "long_tone") {
          const nextRuns = nextRunsAfterRestoring(prev.longToneRuns, run);
          return { ...prev, longToneRuns: nextRuns, latest: updateLatestByMetric(prev.latest, metric, nextRuns) };
        }
        if (metric === "volume_stability") {
          const nextRuns = nextRunsAfterRestoring(prev.volumeRuns, run);
          return { ...prev, volumeRuns: nextRuns, latest: updateLatestByMetric(prev.latest, metric, nextRuns) };
        }
        const nextRuns = nextRunsAfterRestoring(prev.pitchAccuracyRuns, run);
        return { ...prev, pitchAccuracyRuns: nextRuns, latest: updateLatestByMetric(prev.latest, metric, nextRuns) };
      });
      if (excludeToastTimerRef.current != null) {
        window.clearTimeout(excludeToastTimerRef.current);
        excludeToastTimerRef.current = null;
      }
      setExcludeToast(null);
    } catch (e) {
      setExcludeActionError(errorMessage(e, "元に戻す操作に失敗しました"));
    } finally {
      setExcludeBusy(false);
    }
  };

  return (
    <div className="page insightsPage insightsNotesPage">
      <div className="insightsPage__bg" aria-hidden="true" />

      <section className="card insightsHero">
        <div className="insightsHero__head">
          <div>
            <p className="insightsHero__sub">
              {explicitMetricMode ? `${metricLabel}の詳細データを表示しています。` : "音域・ロングトーン・音量安定性・音程精度を確認できます。"}
            </p>
          </div>
          <Link to="/insights" className="insightsBack">
            戻る
          </Link>
        </div>

        <div className="insightsControlsInline">
          <div className="insightsSegment insightsTimePage__segment">
            {visiblePeriods.map((p) => {
              const active = p === days;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDays(p as (typeof PERIODS)[number])}
                  className={`insightsSegment__btn${active ? " is-active" : ""}`}
                >
                  {p} DAYS
                </button>
              );
            })}
          </div>
        </div>
        {isFreeLimited && (
          <div className="insightsFreeMiniPill">無料プランは7日まで表示。期間拡張はプレミアムで解放されます。</div>
        )}
      </section>

      {guestMode && (
        <section className="card insightsGuest">
          <div className="insightsGuest__title">ゲスト表示中</div>
          <div className="insightsGuest__text">ログイン後に、あなたの測定データを表示します。</div>
        </section>
      )}

      {state.kind === "loading" && <MetronomeLoader label="読み込み中..." />}
      {state.kind === "error" && <div className="insightsError">取得に失敗しました: {state.message}</div>}
      {excludeToast && (
        <div className="insightsExcludeToast" role="status" aria-live="polite">
          <span>最高記録を除外しました</span>
          <button
            type="button"
            className="insightsExcludeToast__undo"
            onClick={() => void handleUndoExclude()}
            disabled={excludeBusy}
          >
            元に戻す
          </button>
        </div>
      )}
      {excludeActionError && <div className="insightsError">{excludeActionError}</div>}

      {state.kind === "ready" && (
        <div className="insightsStack">
          {explicitMetricMode ? (
            <>
              <section className="insightsCard">
                <div className="insightsCard__head insightsCard__head--withMenu">
                  <div className="insightsCard__headMain">
                    <div className="insightsCard__eyebrowRow">
                      <span className="insightsCard__eyebrowIcon" aria-hidden="true">
                        <BestSectionIcon />
                      </span>
                      <div className="insightsCard__eyebrow">BEST</div>
                    </div>
                  </div>
                  {!guestMode && excludableBestTarget && (
                    <div className="insightsBestMenu">
                      <button
                        type="button"
                        className="insightsBestMenu__trigger"
                        onClick={() => setBestMenuOpen((prev) => !prev)}
                        aria-expanded={bestMenuOpen}
                        aria-label="最高記録メニューを開く"
                        disabled={excludeBusy}
                      >
                        <span className="insightsBestMenu__triggerIcon" aria-hidden="true">
                          <EditPencilIcon />
                        </span>
                      </button>
                      {bestMenuOpen && (
                        <div className="insightsBestMenu__panel" role="menu" aria-label="最高記録メニュー">
                          <button
                            type="button"
                            className="insightsBestMenu__item"
                            role="menuitem"
                            onClick={() => void handleExcludeBest()}
                            disabled={excludeBusy}
                          >
                            この記録を最高記録から除外
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <LatestSingleMetricCard
                  latest={representativeLatest}
                  metricTab={metricTab}
                  rangeBestRun={rangeBestRun}
                  longToneBest={longToneBest}
                  longToneBestRun={longToneBestRun}
                  longToneLatest={longToneLatestResult}
                  volumeBestRun={volumeBestRun}
                  pitchAccuracyBestRun={pitchAccuracyBestRun}
                />
              </section>

              <section className="insightsCard">
                <div className="insightsCard__head">
                  <div className="insightsCard__headMain">
                    <div className="insightsCard__eyebrowRow">
                      <span className="insightsCard__eyebrowIcon" aria-hidden="true">
                        <HistorySectionIcon />
                      </span>
                      <div className="insightsCard__eyebrow">HISTORY</div>
                    </div>
                    <div className="insightsMuted">{days}日分の測定履歴をグラフで確認できます。</div>
                  </div>
                </div>
                {isFreeLimited && <div className="insightsGraphWindowHint">7日間のグラフを表示中</div>}
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
                    <RangeBandTrendChart points={rangeBandPoints} compact={isFreeLimited} />
                  </>
                ) : metricTab === "long_tone" ? (
                  <LongToneTrendChart points={metricPoints} compact={isFreeLimited} />
                ) : metricTab === "volume_stability" ? (
                  <ScoreTrendChart
                    points={metricPoints}
                    color="#52c176"
                    unit="%"
                    tickFormatter={(v) => `${v.toFixed(0)}%`}
                    compact={isFreeLimited}
                    autoScale={{
                      hardMin: 0,
                      hardMax: 100,
                      minSpan: 8,
                      maxTicks: 6,
                      minPaddingRatio: 0.12,
                      maxPaddingRatio: 0.12,
                    }}
                  />
                ) : metricTab === "pitch_accuracy" ? (
                  <ScoreTrendChart
                    points={metricPoints}
                    color="#eab83a"
                    unit="半音"
                    tickFormatter={(v) => `${v.toFixed(1)}半音`}
                    higherIsBetter={false}
                    compact={isFreeLimited}
                    autoScale={{
                      hardMin: 0,
                      minSpan: 0.2,
                      maxTicks: 6,
                      minPaddingRatio: 0.16,
                      maxPaddingRatio: 0.16,
                    }}
                  />
                ) : (
                  <SimpleTrendChart points={metricPoints} compact={isFreeLimited} />
                )}
                {metricTab !== "range" && metricTab !== "long_tone" && metricTab !== "volume_stability" && metricTab !== "pitch_accuracy" && (
                  <div className="insightsSummaryRow" style={{ marginTop: 10 }}>
                    <div className="insightsBadge">最新: {formatMetricValue(metricLatest, metricTab)}</div>
                    <div className="insightsBadge">最大: {formatMetricValue(metricBest, metricTab)}</div>
                  </div>
                )}
              </section>

              <section className="insightsCard">
                <div className="insightsCard__head">
                  <div className="insightsCard__headMain">
                    <div className="insightsCard__eyebrowRow">
                      <span className="insightsCard__eyebrowIcon" aria-hidden="true">
                        <RecordsSectionIcon />
                      </span>
                      <div className="insightsCard__eyebrow">RECORDS</div>
                    </div>
                    <div className="insightsMuted insightsNotesPage__sectionNote">選択期間内の測定履歴を一覧で確認できます。</div>
                  </div>
                </div>
                {metricTab === "range" && (
                  <MetricScoreHistoryList
                    runs={monthFilteredRangeRuns}
                    latestLabel={formatMetricValue(metricLatest, metricTab)}
                    bestLabel={formatMetricValue(metricBest, metricTab)}
                    valueExtractor={(run) => rangeTopMidiForTab(asRangeResult(run.result), rangeVoiceTab)}
                    detailRenderer={(run) => formatRangeHistoryDetail(asRangeResult(run.result), rangeVoiceTab)}
                    valueFormatter={(v) => midiToNote(Math.round(v))}
                    deltaFormatter={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}半音`}
                    lockedFromIndex={isFreeLimited ? FREE_HISTORY_LIMIT : null}
                    onRequestUnlock={() => setPremiumModalOpen(true)}
                    embedded
                  />
                )}
                {metricTab === "long_tone" && (
                  <LongToneHistoryList
                    runs={monthFilteredLongToneRuns}
                    latestLabel={formatMetricValue(metricLatest, metricTab)}
                    bestLabel={formatMetricValue(metricBest, metricTab)}
                    lockedFromIndex={isFreeLimited ? FREE_HISTORY_LIMIT : null}
                    onRequestUnlock={() => setPremiumModalOpen(true)}
                    embedded
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
                    lockedFromIndex={isFreeLimited ? FREE_HISTORY_LIMIT : null}
                    onRequestUnlock={() => setPremiumModalOpen(true)}
                    embedded
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
                    lockedFromIndex={isFreeLimited ? FREE_HISTORY_LIMIT : null}
                    onRequestUnlock={() => setPremiumModalOpen(true)}
                    embedded
                  />
                )}
              </section>
            </>
          ) : (
            <>
              <section className="insightsCard">
                <div className="insightsCard__head">
                  <div className="insightsCard__headMain">
                    <div className="insightsCard__eyebrowRow">
                      <span className="insightsCard__eyebrowIcon" aria-hidden="true">
                        <BestSectionIcon />
                      </span>
                      <div className="insightsCard__eyebrow">BEST</div>
                    </div>
                  </div>
                </div>
                <LatestSummaryCards
                  latest={representativeLatest}
                  rangeBestRun={rangeBestRun}
                  longToneBest={longToneBest}
                  longToneBestRun={longToneBestRun}
                />
              </section>

              <section className="insightsCard">
                <div className="insightsCard__head">
                  <div className="insightsCard__headMain">
                    <div className="insightsCard__eyebrowRow">
                      <span className="insightsCard__eyebrowIcon" aria-hidden="true">
                        <HistorySectionIcon />
                      </span>
                      <div className="insightsCard__eyebrow">HISTORY</div>
                    </div>
                    <div className="insightsMuted">{days}日分の測定履歴をグラフで確認できます。</div>
                  </div>
                </div>
                {isFreeLimited && <div className="insightsGraphWindowHint">7日間のグラフを表示中</div>}
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
                    <RangeBandTrendChart points={rangeBandPoints} compact={isFreeLimited} />
                  </>
                ) : metricTab === "long_tone" ? (
                  <LongToneTrendChart points={metricPoints} compact={isFreeLimited} />
                ) : metricTab === "volume_stability" ? (
                  <ScoreTrendChart
                    points={metricPoints}
                    color="#52c176"
                    unit="%"
                    tickFormatter={(v) => `${v.toFixed(0)}%`}
                    compact={isFreeLimited}
                    autoScale={{
                      hardMin: 0,
                      hardMax: 100,
                      minSpan: 8,
                      maxTicks: 6,
                      minPaddingRatio: 0.12,
                      maxPaddingRatio: 0.12,
                    }}
                  />
                ) : metricTab === "pitch_accuracy" ? (
                  <ScoreTrendChart
                    points={metricPoints}
                    color="#eab83a"
                    unit="半音"
                    tickFormatter={(v) => `${v.toFixed(1)}半音`}
                    higherIsBetter={false}
                    compact={isFreeLimited}
                    autoScale={{
                      hardMin: 0,
                      minSpan: 0.2,
                      maxTicks: 6,
                      minPaddingRatio: 0.16,
                      maxPaddingRatio: 0.16,
                    }}
                  />
                ) : (
                  <SimpleTrendChart points={metricPoints} compact={isFreeLimited} />
                )}
                {metricTab !== "range" && metricTab !== "long_tone" && metricTab !== "volume_stability" && metricTab !== "pitch_accuracy" && (
                  <div className="insightsSummaryRow" style={{ marginTop: 10 }}>
                    <div className="insightsBadge">最新: {formatMetricValue(metricLatest, metricTab)}</div>
                    <div className="insightsBadge">最大: {formatMetricValue(metricBest, metricTab)}</div>
                  </div>
                )}
              </section>

              <section className="insightsCard">
                <div className="insightsCard__head">
                  <div className="insightsCard__headMain">
                    <div className="insightsCard__eyebrowRow">
                      <span className="insightsCard__eyebrowIcon" aria-hidden="true">
                        <RecordsSectionIcon />
                      </span>
                      <div className="insightsCard__eyebrow">RECORDS</div>
                    </div>
                    <div className="insightsMuted insightsNotesPage__sectionNote">選択期間内の測定履歴を一覧で確認できます。</div>
                  </div>
                </div>
                {metricTab === "range" && (
                  <MetricScoreHistoryList
                    runs={monthFilteredRangeRuns}
                    latestLabel={formatMetricValue(metricLatest, metricTab)}
                    bestLabel={formatMetricValue(metricBest, metricTab)}
                    valueExtractor={(run) => rangeTopMidiForTab(asRangeResult(run.result), rangeVoiceTab)}
                    detailRenderer={(run) => formatRangeHistoryDetail(asRangeResult(run.result), rangeVoiceTab)}
                    valueFormatter={(v) => midiToNote(Math.round(v))}
                    deltaFormatter={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}半音`}
                    lockedFromIndex={isFreeLimited ? FREE_HISTORY_LIMIT : null}
                    onRequestUnlock={() => setPremiumModalOpen(true)}
                    embedded
                  />
                )}
                {metricTab === "long_tone" && (
                  <LongToneHistoryList
                    runs={monthFilteredLongToneRuns}
                    latestLabel={formatMetricValue(metricLatest, metricTab)}
                    bestLabel={formatMetricValue(metricBest, metricTab)}
                    lockedFromIndex={isFreeLimited ? FREE_HISTORY_LIMIT : null}
                    onRequestUnlock={() => setPremiumModalOpen(true)}
                    embedded
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
                    lockedFromIndex={isFreeLimited ? FREE_HISTORY_LIMIT : null}
                    onRequestUnlock={() => setPremiumModalOpen(true)}
                    embedded
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
                    lockedFromIndex={isFreeLimited ? FREE_HISTORY_LIMIT : null}
                    onRequestUnlock={() => setPremiumModalOpen(true)}
                    embedded
                  />
                )}
              </section>
            </>
          )}
        </div>
      )}
      <PremiumUpsellModal
        open={premiumModalOpen}
        onClose={() => setPremiumModalOpen(false)}
        variant="lp"
        previewImageSrc={premiumPreviewInsights}
        previewImageAlt="分析詳細のプレビュー"
        title="分析詳細をフル表示する"
        onCta={() => {
          setPremiumModalOpen(false);
          navigate("/premium");
        }}
        description="無料プランは7日グラフと一部履歴まで表示されます。"
        flowSteps={[
          { title: "全期間の推移を確認", sub: "30日 / 90日 / 365日 / 月で比較", pill: "全期間" },
          { title: "履歴を深掘り", sub: "測定履歴を全表示して確認", pill: "全履歴" },
          { title: "変化を判断", sub: "差分を見て改善の優先度を決定", pill: "分析強化" },
        ]}
        ctaLabel="プレミアムを見る"
      />
    </div>
  );
}

function BestSectionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
      <circle cx="12" cy="8.8" r="3.6" />
      <path className="accent" d="m10.6 8.8 1 1 2-2.1" />
      <path d="M9.1 12.1 7.8 18.6l4.2-2.3 4.2 2.3-1.3-6.5" />
    </svg>
  );
}

function HistorySectionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
      <path d="M5 18.5h14" />
      <rect x="6.3" y="11.5" width="2.6" height="5" rx="1.1" />
      <rect className="accent" x="10.7" y="8.3" width="2.6" height="8.2" rx="1.1" />
      <rect x="15.1" y="5.8" width="2.6" height="10.7" rx="1.1" />
    </svg>
  );
}

function RecordsSectionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
      <rect x="5.5" y="4.5" width="13" height="15" rx="2.2" />
      <path className="accent" d="M8.5 9h7" />
      <path d="M8.5 12.5h7" />
      <path d="M8.5 16h4.2" />
    </svg>
  );
}

function EditPencilIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M4 20h4.2l9.9-9.9-4.2-4.2L4 15.8Z" />
      <path d="m12.8 6.1 4.2 4.2" />
      <path d="M4 20h16" />
    </svg>
  );
}

function trimRunsToRecentDays(runs: MeasurementRun[], days: number): MeasurementRun[] {
  if (runs.length <= 1 || days <= 0) return runs;
  const latestDate = runs[runs.length - 1]?.recorded_at?.slice(0, 10) ?? null;
  if (!latestDate) return runs;
  const latestMs = Date.parse(`${latestDate}T00:00:00Z`);
  if (!Number.isFinite(latestMs)) return runs;
  const cutoff = latestMs - (days - 1) * 24 * 60 * 60 * 1000;
  return runs.filter((run) => {
    const runDate = run.recorded_at.slice(0, 10);
    const runMs = Date.parse(`${runDate}T00:00:00Z`);
    return Number.isFinite(runMs) && runMs >= cutoff;
  });
}

function pickDailyRepresentativeRuns(
  runs: MeasurementRun[],
  valueExtractor: (run: MeasurementRun) => number | null,
  mode: "max" | "min"
): MeasurementRun[] {
  if (runs.length <= 1) return runs;
  const byDate = new Map<string, { run: MeasurementRun; value: number | null }>();
  runs.forEach((run) => {
    const date = run.recorded_at.slice(0, 10);
    const value = valueExtractor(run);
    const current = byDate.get(date);
    if (!current) {
      byDate.set(date, { run, value });
      return;
    }
    if (value == null) return;
    if (current.value == null) {
      byDate.set(date, { run, value });
      return;
    }
    const isBetter = mode === "max" ? value > current.value : value < current.value;
    const isSameButLater = value === current.value && run.recorded_at > current.run.recorded_at;
    if (isBetter || isSameButLater) {
      byDate.set(date, { run, value });
    }
  });
  return Array.from(byDate.values())
    .map(({ run }) => run)
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
}

function nextRunsAfterExcluding(runs: MeasurementRun[], runId: number): MeasurementRun[] {
  return runs.filter((run) => run.id !== runId);
}

function nextRunsAfterRestoring(runs: MeasurementRun[], run: MeasurementRun): MeasurementRun[] {
  if (runs.some((v) => v.id === run.id)) return runs;
  return [...runs, run].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
}

function latestRunFrom(runs: MeasurementRun[]): MeasurementRun | null {
  if (runs.length === 0) return null;
  return runs[runs.length - 1] ?? null;
}

function updateLatestByMetric(
  latest: LatestMeasurements,
  metric: ExcludableMetric,
  nextRuns: MeasurementRun[]
) {
  if (metric === "range") return { ...latest, range: latestRunFrom(nextRuns) };
  if (metric === "long_tone") return { ...latest, long_tone: latestRunFrom(nextRuns) };
  if (metric === "volume_stability") return { ...latest, volume_stability: latestRunFrom(nextRuns) };
  return { ...latest, pitch_accuracy: latestRunFrom(nextRuns) };
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
  const rangeRecordedAt = rangeBestRun?.run.recorded_at ?? latest.range?.recorded_at ?? null;
  const volumeRecordedAt = volumeBestRun?.run.recorded_at ?? latest.volume_stability?.recorded_at ?? null;
  const pitchAccuracyRecordedAt = pitchAccuracyBestRun?.run.recorded_at ?? latest.pitch_accuracy?.recorded_at ?? null;

  if (metricTab === "range") {
    const best = rangeBestRun?.result ?? null;
    return (
      <>
        <RangeLikeCard range={best} note="今まででの最高音域" />
        {rangeRecordedAt && <div className="insightsMuted">記録日: {rangeRecordedAt.slice(0, 10)}</div>}
      </>
    );
  }

  if (metricTab === "long_tone") {
    return (
      <>
        <TopStyleLongToneCard
          seconds={longToneBestRun?.sec ?? longTone?.sustain_sec ?? null}
          bestSeconds={longToneBest}
          note={longToneBestRun?.note ?? longTone?.sustain_note ?? null}
        />
        {longToneBestRun?.run.recorded_at && <div className="insightsMuted insightsMuted--right">記録日: {longToneBestRun.run.recorded_at.slice(0, 10)}</div>}
      </>
    );
  }

  if (metricTab === "pitch_accuracy") {
    return (
      <>
        <PitchAccuracySummaryCard pitchAccuracy={pitchAccuracy} />
        {pitchAccuracyRecordedAt && <div className="insightsMuted">記録日: {pitchAccuracyRecordedAt.slice(0, 10)}</div>}
      </>
    );
  }

  if (metricTab === "volume_stability") {
    return (
      <>
        <TopStyleVolumeCard volume={volume} />
        {volumeRecordedAt && <div className="insightsMuted insightsMuted--right">記録日: {volumeRecordedAt.slice(0, 10)}</div>}
      </>
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

function TopStyleVolumeCard({ volume }: { volume: ReturnType<typeof asVolumeResult> | null }) {
  return (
    <div className="insightsGaugePanel">
      <div className="insightsGaugeLead">
        許容幅内率 (平均±3dB)
      </div>
      <div className="insightsGaugeRow">
        <TopStyleGauge
          value={volume?.loudness_range_pct ?? null}
          unit="%"
          progress={volume?.loudness_range_pct != null ? Math.max(0, Math.min(1, volume.loudness_range_pct / 100)) : 0}
          tone="volume"
        />
        <div className="insightsGaugeMeta insightsGaugeMeta--side">
          <span>平均 {formatDb(volume?.avg_loudness_db ?? null)}</span>
          <span>範囲 {volume?.loudness_range_db != null ? `${volume.loudness_range_db.toFixed(1)} dB` : "-"}</span>
        </div>
      </div>
    </div>
  );
}

function TopStyleLongToneCard({
  seconds,
  bestSeconds,
  note,
}: {
  seconds: number | null;
  bestSeconds: number | null;
  note: string | null;
}) {
  const progress = seconds != null ? Math.max(0, Math.min(1, seconds / 60)) : 0;
  return (
    <div className="insightsGaugePanel">
      <div className="insightsGaugeRow">
        <TopStyleGauge value={seconds} unit="sec" progress={progress} tone="longTone" />
        <div className="insightsGaugeMeta insightsGaugeMeta--side">
          <span>ベスト {bestSeconds != null ? `${bestSeconds.toFixed(1)}s` : "—"}</span>
          <span>音程 {note ?? "-"}</span>
        </div>
      </div>
    </div>
  );
}

function TopStyleGauge({
  value,
  unit,
  progress,
  tone,
}: {
  value: number | null;
  unit: string;
  progress: number;
  tone: "longTone" | "volume";
}) {
  const p = Math.max(0, Math.min(1, progress));
  const valueLabel =
    value != null ? (unit === "%" ? Math.round(value).toString() : value.toFixed(1)) : "-";
  return (
    <div className="insightsMiniRingWrap">
      <div
        className={`insightsMiniRing${tone === "volume" ? " insightsMiniRing--volume" : ""}`}
        style={{ ["--ring-progress" as string]: String(p) }}
        aria-hidden="true"
      >
        <span className="insightsMiniRing__label">
          <strong>{valueLabel}</strong>
          <small>{unit}</small>
        </span>
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

function SimpleTrendChart({
  points,
  yMode = "number",
  compact = false,
}: {
  points: MeasurementPoint[];
  yMode?: "number" | "note";
  compact?: boolean;
}) {
  const width = compact ? Math.max(280, 92 + points.length * 30) : 760;
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
  const xTicks = buildAdaptiveXTicks(points.length);

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", minWidth: compact ? width : 520, height: 220 }} aria-hidden="true">
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

function LongToneTrendChart({ points, compact = false }: { points: MeasurementPoint[]; compact?: boolean }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(null);
  const width = compact ? Math.max(320, 40 + Math.max(0, points.length - 1) * 38) : Math.max(640, 56 + Math.max(0, points.length - 1) * 40);
  const height = compact ? 340 : 380;
  const axisWidth = compact ? 42 : 48;
  const padTop = compact ? 22 : 24;
  const padBottom = compact ? 52 : 56;
  const padLeft = 0;
  const padRight = compact ? 22 : 28;
  const values = points.map((p) => p.value).filter((v): v is number => v != null);
  const axis = buildAutoNumericAxis({
    values,
    hardMin: 0,
    minSpan: 4,
    minPaddingRatio: 0.12,
    maxPaddingRatio: 0.18,
    maxTicks: 6,
  });
  const min = axis.min;
  const max = axis.max;
  const yTicks = axis.ticks;
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
  const bestBadgeX = bestPoint ? Math.min(width - padRight - 20, Math.max(padLeft + 20, bestPoint.x)) : null;
  const bestBadgeY = bestPoint ? Math.max(padTop + 14, bestPoint.y - 22) : null;
  const latestPoint = plotted.length > 0 ? plotted[plotted.length - 1] : null;

  const linePath = plotted.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath =
    plotted.length >= 2
      ? `${linePath} L ${plotted[plotted.length - 1].x} ${height - padBottom} L ${plotted[0].x} ${height - padBottom} Z`
      : "";

  const xTicks = buildAdaptiveXTicks(points.length);
  const xAxisY = height - padBottom;
  const selectedPoint = plotted.find((p) => p.index === selectedIndex) ?? null;

  useEffect(() => {
    const updateTooltip = () => {
      if (!selectedPoint || !frameRef.current || !scrollRef.current || !tooltipRef.current) {
        setTooltipPos(null);
        return;
      }
      const frameRect = frameRef.current.getBoundingClientRect();
      const scrollRect = scrollRef.current.getBoundingClientRect();
      const tipRect = tooltipRef.current.getBoundingClientRect();
      const pointClientX = scrollRect.left + (selectedPoint.x - scrollRef.current.scrollLeft);
      const pointClientY = scrollRect.top + selectedPoint.y;
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
  }, [selectedPoint, width, height]);

  return (
    <div className="insightsFixedTrend">
      <div className="insightsTrendScrollHint">左右にスクロールして大きく確認できます</div>
      <div className="insightsFixedTrend__frame" ref={frameRef}>
        <div className="insightsFixedTrend__axis" style={{ width: `${axisWidth}px`, minWidth: `${axisWidth}px`, maxWidth: `${axisWidth}px` }}>
          <svg viewBox={`0 0 ${axisWidth} ${height}`} className="insightsFixedTrend__axisSvg" aria-hidden="true">
            <line x1={axisWidth - 1} y1={padTop} x2={axisWidth - 1} y2={xAxisY} stroke="var(--ins-range-axis-line, #9fc2ea)" />
            {yTicks.map((v) => {
              const y = padTop + (1 - (v - min) / range) * plotH;
              return (
                <g key={`lt-axis-y-${v}`}>
                  <line x1={axisWidth - 5} y1={y} x2={axisWidth - 1} y2={y} stroke="#8eb7e8" strokeWidth="1.1" />
                  <text x={axisWidth - 7} y={y + 4} textAnchor="end" className="insightsFixedTrend__yLabel">
                    {formatNumberForTick(v, axis.step)}s
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="insightsFixedTrend__scroll" ref={scrollRef}>
          <div className="insightsFixedTrend__plotInner" style={{ minWidth: `${width}px` }}>
            <svg viewBox={`0 0 ${width} ${height}`} className="insightsFixedTrend__svg" style={{ width: `${width}px` }} aria-hidden="true">
              <defs>
                <linearGradient id="longtoneGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8866ff" stopOpacity={0.34} />
                  <stop offset="95%" stopColor="#8866ff" stopOpacity={0.06} />
                </linearGradient>
                <filter id="longtoneDotShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="1.8" floodColor="rgba(136,102,255,0.3)" />
                </filter>
              </defs>

              {yTicks.map((v) => {
                const y = padTop + (1 - (v - min) / range) * plotH;
                return (
                  <line key={`lt-y-${v}`} x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="rgba(95, 112, 134, 0.16)" />
                );
              })}

              {xTicks.map((idx) => {
                const p = points[idx];
                const x = padLeft + step * idx;
                return (
                  <g key={`lt-x-${idx}`}>
                    <line x1={x} y1={padTop} x2={x} y2={xAxisY} stroke="rgba(95, 112, 134, 0.14)" />
                    <text x={x} y={height - 8} textAnchor="middle" className="insightsFixedTrend__xLabel" style={{ fontSize: 11, opacity: 0.76 }}>
                      {p?.date ? p.date.slice(5) : ""}
                    </text>
                  </g>
                );
              })}

              <line x1={padLeft} y1={xAxisY} x2={width - padRight} y2={xAxisY} stroke="rgba(95, 112, 134, 0.18)" />
              <line x1={padLeft} y1={padTop} x2={padLeft} y2={xAxisY} stroke="rgba(95, 112, 134, 0.18)" />

              {areaPath && <path d={areaPath} fill="url(#longtoneGradient)" />}
              {linePath && <path d={linePath} fill="none" stroke="#8866ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

              {plotted.map((p) => {
                const isLatest = latestPoint != null && latestPoint.index === p.index;
                const isSelected = selectedPoint != null && selectedPoint.index === p.index;
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
                      r={isSelected ? (isLatest ? 9 : 8) : isLatest ? 7.5 : 6}
                      fill="#fff"
                      stroke="#8866ff"
                      strokeWidth={isSelected ? 3 : 2}
                      onClick={() => setSelectedIndex((prev) => (prev === p.index ? null : p.index))}
                    />
                  </g>
                );
              })}

              {bestPoint && bestBadgeX != null && bestBadgeY != null && (
                <g transform={`translate(${bestBadgeX}, ${bestBadgeY})`}>
                  <rect x={-18} y={-14} width={36} height={16} rx={8} fill="rgba(184,137,0,0.95)" />
                  <text x={0} y={-3} textAnchor="middle" style={{ fontSize: 9, fontWeight: 900, fill: "#fff", letterSpacing: "0.03em" }}>
                    BEST
                  </text>
                </g>
              )}

              {selectedPoint && (
                <line
                  x1={selectedPoint.x}
                  y1={padTop}
                  x2={selectedPoint.x}
                  y2={xAxisY}
                  stroke="#8866ff"
                  strokeWidth="1.6"
                  strokeDasharray="4 4"
                  opacity="0.7"
                />
              )}

              {points.map((p, i) => {
                const x = padLeft + step * i;
                const left = i === 0 ? padLeft : x - step / 2;
                const right = i === points.length - 1 ? width - padRight : x + step / 2;
                return (
                  <rect
                    key={`lt-hit-${p.date}-${i}`}
                    x={left}
                    y={padTop}
                    width={Math.max(18, right - left)}
                    height={height - padTop - padBottom}
                    fill="transparent"
                    onClick={() => setSelectedIndex((prev) => (prev === i ? null : i))}
                    onTouchStart={() => setSelectedIndex(i)}
                  />
                );
              })}
            </svg>
          </div>
        </div>
        {selectedPoint && (
          <div
            ref={tooltipRef}
            className="insightsFixedTrend__tooltip"
            style={
              tooltipPos
                ? { left: `${tooltipPos.left}px`, top: `${tooltipPos.top}px` }
                : { left: "-9999px", top: "-9999px" }
            }
          >
            <div>{selectedPoint.date}</div>
            <div>ロングトーン: {selectedPoint.value.toFixed(1)}秒</div>
          </div>
        )}
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
  autoScale,
  compact = false,
}: {
  points: MeasurementPoint[];
  color: string;
  unit: string;
  min?: number;
  max?: number;
  yTicks?: number[];
  tickFormatter?: (value: number) => string;
  higherIsBetter?: boolean;
  autoScale?: {
    hardMin?: number;
    hardMax?: number;
    minSpan?: number;
    maxTicks?: number;
    minPaddingRatio?: number;
    maxPaddingRatio?: number;
  };
  compact?: boolean;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(null);
  const width = compact ? Math.max(320, 40 + Math.max(0, points.length - 1) * 38) : Math.max(640, 56 + Math.max(0, points.length - 1) * 40);
  const height = compact ? 340 : 380;
  const axisWidth = compact ? 42 : 48;
  const padTop = compact ? 22 : 24;
  const padBottom = compact ? 52 : 56;
  const padLeft = 0;
  const padRight = compact ? 22 : 28;
  const values = points.map((p) => p.value).filter((v): v is number => v != null);
  const computedAxis =
    autoScale != null
      ? buildAutoNumericAxis({
          values,
          hardMin: autoScale.hardMin,
          hardMax: autoScale.hardMax,
          minSpan: autoScale.minSpan ?? 1,
          maxTicks: autoScale.maxTicks ?? 6,
          minPaddingRatio: autoScale.minPaddingRatio ?? 0.1,
          maxPaddingRatio: autoScale.maxPaddingRatio ?? 0.1,
        })
      : null;
  const domainMin = computedAxis?.min ?? min;
  const domainMax = computedAxis?.max ?? max;
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
  const bestBadgeX = bestPoint ? Math.min(width - padRight - 20, Math.max(padLeft + 20, bestPoint.x)) : null;
  const bestBadgeY = bestPoint ? Math.max(padTop + 14, bestPoint.y - 22) : null;
  const latestPoint = plotted.length > 0 ? plotted[plotted.length - 1] : null;
  const linePath = plotted.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath =
    plotted.length >= 2
      ? `${linePath} L ${plotted[plotted.length - 1].x} ${height - padBottom} L ${plotted[0].x} ${height - padBottom} Z`
      : "";
  const xTicks = Array.from(
    new Set(points.length <= 1 ? [0] : [0, Math.floor((points.length - 1) * 0.33), Math.floor((points.length - 1) * 0.66), points.length - 1])
  );
  const yAxisTicks = yTicks ?? computedAxis?.ticks ?? [0, 20, 40, 60, 80, 100];
  const tickStep = computedAxis?.step ?? (yAxisTicks.length >= 2 ? Math.abs(yAxisTicks[1] - yAxisTicks[0]) : 1);
  const xAxisY = height - padBottom;
  const isSemitoneAxis = unit === "半音";
  const selectedPoint = plotted.find((p) => p.index === selectedIndex) ?? null;
  const formatAxisTick = (value: number) => {
    if (tickFormatter) {
      const formatted = tickFormatter(value);
      return isSemitoneAxis ? formatted.replace(/半音/g, "") : formatted;
    }
    const rendered = formatNumberForTick(value, tickStep);
    return isSemitoneAxis ? `${rendered}` : `${rendered}${unit}`;
  };

  useEffect(() => {
    const updateTooltip = () => {
      if (!selectedPoint || !frameRef.current || !scrollRef.current || !tooltipRef.current) {
        setTooltipPos(null);
        return;
      }
      const frameRect = frameRef.current.getBoundingClientRect();
      const scrollRect = scrollRef.current.getBoundingClientRect();
      const tipRect = tooltipRef.current.getBoundingClientRect();
      const pointClientX = scrollRect.left + (selectedPoint.x - scrollRef.current.scrollLeft);
      const pointClientY = scrollRect.top + selectedPoint.y;
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
  }, [selectedPoint, width, height]);

  return (
    <div className="insightsFixedTrend">
      <div className="insightsTrendScrollHint">左右にスクロールして大きく確認できます</div>
      <div className="insightsFixedTrend__frame" ref={frameRef}>
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
        <div className="insightsFixedTrend__scroll" ref={scrollRef}>
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
                  <line key={`score-y-${v}`} x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="rgba(95, 112, 134, 0.16)" />
                );
              })}

              {xTicks.map((idx) => {
                const p = points[idx];
                const x = padLeft + step * idx;
                return (
                  <g key={`score-x-${idx}`}>
                    <line x1={x} y1={padTop} x2={x} y2={xAxisY} stroke="rgba(95, 112, 134, 0.14)" />
                    <text x={x} y={height - 8} textAnchor="middle" className="insightsFixedTrend__xLabel" style={{ fontSize: 11, opacity: 0.76 }}>
                      {p?.date ? p.date.slice(5) : ""}
                    </text>
                  </g>
                );
              })}

              <line x1={padLeft} y1={xAxisY} x2={width - padRight} y2={xAxisY} stroke="rgba(95, 112, 134, 0.18)" />
              <line x1={padLeft} y1={padTop} x2={padLeft} y2={xAxisY} stroke="rgba(95, 112, 134, 0.18)" />

              {areaPath && <path d={areaPath} fill={`url(#scoreGradient-${color.replace("#", "")})`} />}
              {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

              {plotted.map((p) => {
                const isLatest = latestPoint != null && latestPoint.index === p.index;
                const isSelected = selectedPoint != null && selectedPoint.index === p.index;
                return (
                  <g key={`score-dot-${p.index}`}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isSelected ? (isLatest ? 9 : 8) : isLatest ? 7.5 : 6}
                      fill="#fff"
                      stroke={color}
                      strokeWidth={isSelected ? 3 : 2}
                      onClick={() => setSelectedIndex((prev) => (prev === p.index ? null : p.index))}
                    />
                  </g>
                );
              })}

              {bestPoint && bestBadgeX != null && bestBadgeY != null && (
                <g transform={`translate(${bestBadgeX}, ${bestBadgeY})`}>
                  <rect x={-18} y={-14} width={36} height={16} rx={8} fill="rgba(184,137,0,0.95)" />
                  <text x={0} y={-3} textAnchor="middle" style={{ fontSize: 9, fontWeight: 900, fill: "#fff", letterSpacing: "0.03em" }}>
                    BEST
                  </text>
                </g>
              )}

              {selectedPoint && (
                <line
                  x1={selectedPoint.x}
                  y1={padTop}
                  x2={selectedPoint.x}
                  y2={xAxisY}
                  stroke={color}
                  strokeWidth="1.6"
                  strokeDasharray="4 4"
                  opacity="0.7"
                />
              )}

              {points.map((p, i) => {
                const x = padLeft + step * i;
                const left = i === 0 ? padLeft : x - step / 2;
                const right = i === points.length - 1 ? width - padRight : x + step / 2;
                return (
                  <rect
                    key={`score-hit-${p.date}-${i}`}
                    x={left}
                    y={padTop}
                    width={Math.max(18, right - left)}
                    height={height - padTop - padBottom}
                    fill="transparent"
                    onClick={() => setSelectedIndex((prev) => (prev === i ? null : i))}
                    onTouchStart={() => setSelectedIndex(i)}
                  />
                );
              })}
            </svg>
          </div>
        </div>
        {selectedPoint && (
          <div
            ref={tooltipRef}
            className="insightsFixedTrend__tooltip"
            style={
              tooltipPos
                ? { left: `${tooltipPos.left}px`, top: `${tooltipPos.top}px` }
                : { left: "-9999px", top: "-9999px" }
            }
          >
            <div>{selectedPoint.date}</div>
            <div>{isSemitoneAxis ? `平均ズレ: ${selectedPoint.value.toFixed(2)}半音` : `結果: ${selectedPoint.value.toFixed(1)}${unit}`}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function RangeBandTrendChart({ points, compact = false }: { points: RangeBandPoint[]; compact?: boolean }) {
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

  const compactMode = compact || isMobile;
  const layout = compactMode
    ? {
        height: 500,
        padTop: 44,
        padBottom: 74,
        axisWidth: 42,
        plotPadLeft: 0,
        plotPadRight: 30,
        plotEdgeInset: 18,
        pxPerPoint: 46,
        yTickMax: 6,
        yTickMinGap: 42,
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
        height: 540,
        padTop: 46,
        padBottom: 78,
        axisWidth: 52,
        plotPadLeft: 0,
        plotPadRight: 28,
        plotEdgeInset: 0,
        pxPerPoint: 52,
        yTickMax: 10,
        yTickMinGap: 34,
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

  const minPlotWidth = compactMode ? 340 : 680;
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
  let min = Math.floor(minRaw) - 6;
  let max = Math.ceil(maxRaw) + 6;
  if (max - min < 22) {
    const center = (max + min) / 2;
    min = Math.floor(center - 11);
    max = Math.ceil(center + 11);
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

  const xTicks = buildAdaptiveXTicks(points.length);

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
      <div className="insightsTrendScrollHint">左右にスクロールして大きく確認できます</div>
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
                  <line x1={axisWidth - 5} y1={y} x2={axisWidth - 1} y2={y} stroke={isC ? "var(--ins-range-grid-major, #8eb7e8)" : "var(--ins-range-grid-minor, #c5daf2)"} strokeWidth={isC ? 1.2 : 1} />
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
          <linearGradient id="rangeTrendBand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ins-range-band-start, #3b82f6)" stopOpacity={isMobile ? 0.24 : 0.32} />
            <stop offset="100%" stopColor="var(--ins-range-band-end, #3b82f6)" stopOpacity={isMobile ? 0.08 : 0.14} />
          </linearGradient>
          <linearGradient id="rangeTrendHigh" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--ins-range-high-line-start, #2563eb)" />
            <stop offset="100%" stopColor="var(--ins-range-high-line-end, #3b82f6)" />
          </linearGradient>
        </defs>

        <rect
          x={padLeft}
          y={padTop}
          width={width - padLeft - padRight}
          height={height - padTop - padBottom}
          fill="var(--ins-range-plot-bg-start, #fff)"
          rx={12}
        />
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
              <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke={isC ? "var(--ins-range-grid-major, #8eb7e8)" : "var(--ins-range-grid-minor, #c5daf2)"} strokeWidth={isC ? 1.2 : 1} />
            </g>
          );
        })}

        {xTicks.map((idx) => {
          const x = plotLeft + step * idx;
          return <line key={`range-x-grid-${idx}`} x1={x} y1={padTop} x2={x} y2={xAxisY} stroke="rgba(95, 112, 134, 0.14)" />;
        })}

        <line x1={padLeft} y1={xAxisY} x2={width - padRight} y2={xAxisY} stroke="rgba(95, 112, 134, 0.18)" />
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={xAxisY} stroke="rgba(95, 112, 134, 0.18)" />

        {bandAreaPath && <path d={bandAreaPath} fill="url(#rangeTrendBand)" stroke="none" />}

        {lowPath && <path d={lowPath} fill="none" stroke="var(--ins-range-low-line, #93c5fd)" strokeWidth="1.8" strokeDasharray="4 4" />}
        {highPath && <path d={highPath} fill="none" stroke="url(#rangeTrendHigh)" strokeWidth="3" />}

        {hovered && <circle cx={hovered.x} cy={hovered.lowY} r={layout.lowDotR} fill="#60a5fa" stroke="#fff" strokeWidth="1.1" />}
        {decorated.map((p) => (
          <circle
            key={`range-high-${p.index}`}
            cx={p.x}
            cy={p.highY}
            r={p.improvedFromPrev ? layout.highDotStrongR : layout.highDotR}
            fill={p.improvedFromPrev ? "var(--ins-range-dot-strong, #2563eb)" : "var(--ins-range-dot, #3b82f6)"}
            opacity={p.improvedFromPrev ? layout.highDotStrongOpacity : layout.highDotNormalOpacity}
            stroke="#fff"
            strokeWidth={p.improvedFromPrev ? 1.5 : 0.9}
            onClick={() => setHoveredIndex((prev) => (prev === p.index ? null : p.index))}
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
              fill="rgba(184,137,0,0.95)"
              opacity="1"
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
            stroke="var(--ins-range-hover-line, #3b82f6)"
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
              onClick={() => setHoveredIndex((prev) => (prev === i ? null : i))}
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
            <div className="insightsRangeTrend__tooltipDate">{hovered.date}</div>
            <div className="insightsRangeTrend__tooltipRow">
              <span>最高音</span>
              <strong>{midiToNote(hovered.high)}</strong>
            </div>
            <div className="insightsRangeTrend__tooltipRow">
              <span>最低音</span>
              <strong>{midiToNote(hovered.low)}</strong>
            </div>
            <div className="insightsRangeTrend__tooltipRow">
              <span>音域</span>
              <strong>{(hovered.widthSemitone / 12).toFixed(1)} oct</strong>
            </div>
            <div className="insightsRangeTrend__tooltipRow">
              <span>前回比</span>
              <strong>{hovered.deltaTop == null ? "-" : `${hovered.deltaTop > 0 ? "+" : ""}${hovered.deltaTop}半音`}</strong>
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

function buildAdaptiveXTicks(pointCount: number): number[] {
  if (pointCount <= 0) return [];
  if (pointCount === 1) return [0];
  if (pointCount <= 3) return [0, pointCount - 1];
  if (pointCount <= 5) return [0, Math.floor((pointCount - 1) * 0.5), pointCount - 1];
  if (pointCount <= 7) return [0, Math.floor((pointCount - 1) * 0.5), pointCount - 1];
  if (pointCount <= 9) {
    return Array.from(
      new Set([0, Math.floor((pointCount - 1) * 0.33), Math.floor((pointCount - 1) * 0.66), pointCount - 1])
    );
  }
  return Array.from(
    new Set([
      0,
      Math.floor((pointCount - 1) * 0.25),
      Math.floor((pointCount - 1) * 0.5),
      Math.floor((pointCount - 1) * 0.75),
      pointCount - 1,
    ])
  );
}

function buildAutoNumericAxis(params: {
  values: number[];
  hardMin?: number;
  hardMax?: number;
  minSpan?: number;
  maxTicks?: number;
  minPaddingRatio?: number;
  maxPaddingRatio?: number;
}): { min: number; max: number; ticks: number[]; step: number } {
  const {
    values,
    hardMin,
    hardMax,
    minSpan = 1,
    maxTicks = 6,
    minPaddingRatio = 0.1,
    maxPaddingRatio = 0.1,
  } = params;

  if (values.length === 0) {
    const fallbackMin = hardMin ?? 0;
    const fallbackMax = hardMax ?? Math.max(fallbackMin + minSpan, minSpan);
    const ticks = buildNiceTicks(fallbackMin, fallbackMax, maxTicks);
    const tickMin = ticks[0] ?? fallbackMin;
    const tickMax = ticks[ticks.length - 1] ?? fallbackMax;
    return {
      min: tickMin,
      max: tickMax,
      ticks: ticks.length ? ticks : [tickMin, tickMax],
      step: ticks.length >= 2 ? Math.abs(ticks[1] - ticks[0]) : Math.max(0.1, tickMax - tickMin),
    };
  }

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const span = Math.max(minSpan, dataMax - dataMin);
  let min = dataMin - span * minPaddingRatio;
  let max = dataMax + span * maxPaddingRatio;

  if (max - min < minSpan) {
    const center = (max + min) / 2;
    min = center - minSpan / 2;
    max = center + minSpan / 2;
  }

  if (hardMin != null) min = Math.max(min, hardMin);
  if (hardMax != null) max = Math.min(max, hardMax);

  if (max - min < minSpan) {
    const center = (dataMax + dataMin) / 2;
    min = center - minSpan / 2;
    max = center + minSpan / 2;
    if (hardMin != null && min < hardMin) {
      min = hardMin;
      max = hardMin + minSpan;
    }
    if (hardMax != null && max > hardMax) {
      max = hardMax;
      min = hardMax - minSpan;
    }
    if (hardMin != null) min = Math.max(min, hardMin);
    if (hardMax != null) max = Math.min(max, hardMax);
  }

  const ticks = buildNiceTicks(min, max, maxTicks);
  const tickMin = ticks[0] ?? min;
  const tickMax = ticks[ticks.length - 1] ?? max;
  return {
    min: tickMin,
    max: tickMax,
    ticks: ticks.length ? ticks : [tickMin, tickMax],
    step: ticks.length >= 2 ? Math.abs(ticks[1] - ticks[0]) : Math.max(0.1, tickMax - tickMin),
  };
}

function buildNiceTicks(min: number, max: number, maxTicks: number): number[] {
  const safeMaxTicks = Math.max(2, maxTicks);
  const safeRange = Math.max(0.000001, max - min);
  const step = niceNumber(safeRange / (safeMaxTicks - 1), true);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + step * 0.5; v += step) {
    ticks.push(roundTo(v, step));
  }
  if (ticks.length === 0) return [roundTo(min, step), roundTo(max, step)];
  return ticks;
}

function niceNumber(value: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(Math.max(value, 0.000001)));
  const fraction = value / Math.pow(10, exponent);
  let niceFraction: number;
  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }
  return niceFraction * Math.pow(10, exponent);
}

function roundTo(value: number, step: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return value;
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  const pow = 10 ** Math.min(decimals, 6);
  return Math.round(value * pow) / pow;
}

function formatNumberForTick(value: number, step: number): string {
  if (step >= 1) return `${Math.round(value)}`;
  if (step >= 0.1) return value.toFixed(1);
  return value.toFixed(2);
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

function LongToneHistoryList({
  runs,
  latestLabel,
  bestLabel,
  lockedFromIndex = null,
  onRequestUnlock,
  embedded = false,
}: {
  runs: MeasurementRun[];
  latestLabel: string;
  bestLabel: string;
  lockedFromIndex?: number | null;
  onRequestUnlock?: () => void;
  embedded?: boolean;
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

  const displayRows = [...rowsWithCompare].reverse().map((row, index) => ({ ...row, listIndex: index }));
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
      {!embedded && (
        <div className="insightsCard__head">
          <div className="insightsCard__title">測定履歴</div>
        </div>
      )}
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
                {group.rows.slice(0, 30).map(({ run, sec, note, deltaSec, bestRatio, isNewBest, listIndex }) => {
                  const isUp = deltaSec != null && deltaSec > 0;
                  const isDown = deltaSec != null && deltaSec < 0;
                  const locked = lockedFromIndex != null && listIndex >= lockedFromIndex;
                  const showUnlockCta = locked && listIndex === lockedFromIndex;
                  return (
                    <>
                      {showUnlockCta && (
                        <button type="button" className="insightsHistoryLockBanner" onClick={onRequestUnlock}>
                          <span className="insightsHistoryLockBanner__kicker">PREMIUM</span>
                          <span className="insightsHistoryLockBanner__title">プレミアムプランで全期間閲覧可能になります</span>
                          <span className="insightsHistoryLockBanner__sub">詳細</span>
                        </button>
                      )}
                      <div
                        key={`long-tone-run-${run.id}`}
                        className={`insightsHistoryRow insightsLongToneHistoryRow${locked ? " is-locked" : ""}`}
                        role={locked ? "button" : undefined}
                        tabIndex={locked ? 0 : undefined}
                        onClick={locked ? onRequestUnlock : undefined}
                        onKeyDown={
                          locked
                            ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  onRequestUnlock?.();
                                }
                              }
                            : undefined
                        }
                      >
                        {locked && <div className="insightsHistoryRow__lock" />}
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
                    </>
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
  lockedFromIndex = null,
  onRequestUnlock,
  embedded = false,
}: {
  runs: MeasurementRun[];
  latestLabel: string;
  bestLabel: string;
  valueExtractor: (run: MeasurementRun) => number | null;
  detailRenderer: (run: MeasurementRun) => string;
  valueFormatter?: (value: number) => string;
  deltaFormatter?: (delta: number) => string;
  higherIsBetter?: boolean;
  lockedFromIndex?: number | null;
  onRequestUnlock?: () => void;
  embedded?: boolean;
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

  const displayRows = [...rowsWithCompare].reverse().map((row, index) => ({ ...row, listIndex: index }));
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
      {!embedded && (
        <div className="insightsCard__head">
          <div className="insightsCard__title">測定履歴</div>
        </div>
      )}
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
                {group.rows.slice(0, 30).map(({ run, score, delta, ratio, detail, isNewBest, listIndex }) => {
                  const isUp = delta != null && (higherIsBetter ? delta > 0 : delta < 0);
                  const isDown = delta != null && (higherIsBetter ? delta < 0 : delta > 0);
                  const locked = lockedFromIndex != null && listIndex >= lockedFromIndex;
                  const showUnlockCta = locked && listIndex === lockedFromIndex;
                  return (
                    <>
                      {showUnlockCta && (
                        <button type="button" className="insightsHistoryLockBanner" onClick={onRequestUnlock}>
                          <span className="insightsHistoryLockBanner__kicker">PREMIUM</span>
                          <span className="insightsHistoryLockBanner__title">プレミアムプランで全期間閲覧可能になります</span>
                          <span className="insightsHistoryLockBanner__sub">詳細</span>
                        </button>
                      )}
                      <div
                        key={`score-run-${run.id}`}
                        className={`insightsHistoryRow insightsLongToneHistoryRow${locked ? " is-locked" : ""}`}
                        role={locked ? "button" : undefined}
                        tabIndex={locked ? 0 : undefined}
                        onClick={locked ? onRequestUnlock : undefined}
                        onKeyDown={
                          locked
                            ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  onRequestUnlock?.();
                                }
                              }
                            : undefined
                        }
                      >
                        {locked && <div className="insightsHistoryRow__lock" />}
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
                    </>
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

function rangeTopMidiForTab(result: ReturnType<typeof asRangeResult>, tab: RangeVoiceTab): number | null {
  if (!result) return null;
  if (tab === "chest") return noteToMidi(result.chest_top_note ?? null);
  if (tab === "falsetto") return noteToMidi(result.falsetto_top_note ?? null);
  return noteToMidi(result.highest_note ?? null);
}

function rangeHighNoteForTab(result: ReturnType<typeof asRangeResult>, tab: RangeVoiceTab): string {
  if (!result) return "-";
  if (tab === "chest") return result.chest_top_note ?? "-";
  if (tab === "falsetto") return result.falsetto_top_note ?? "-";
  return result.highest_note ?? "-";
}

function rangeLowNoteForTab(result: ReturnType<typeof asRangeResult>, tab: RangeVoiceTab): string {
  if (!result) return "-";
  if (tab === "falsetto") return transposeNote(result.lowest_note ?? null, 10) ?? "-";
  return result.lowest_note ?? "-";
}

function formatRangeHistoryDetail(result: ReturnType<typeof asRangeResult>, tab: RangeVoiceTab): string {
  if (!result) return "-";
  const high = rangeHighNoteForTab(result, tab);
  const low = rangeLowNoteForTab(result, tab);
  const highMidi = noteToMidi(high);
  const lowMidi = noteToMidi(low);
  const oct = highMidi != null && lowMidi != null && highMidi >= lowMidi ? ((highMidi - lowMidi) / 12).toFixed(2) : "-";
  return `最高 ${high} / 最低 ${low} / ${oct}oct`;
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
