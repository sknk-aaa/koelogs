import type { DailyDurationPoint, DailyNotePoint, InsightsData, MeasurementPoint } from "../../types/insights";

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(base: Date, diff: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + diff);
  return d;
}

function buildDailyDurations(days: number, endDate: Date): DailyDurationPoint[] {
  const pattern = [0, 18, 26, 34, 22, 0, 38, 30, 24, 16];
  const out: DailyDurationPoint[] = [];

  for (let i = 0; i < days; i += 1) {
    const date = addDays(endDate, -(days - 1 - i));
    const base = pattern[i % pattern.length];
    const wave = (i % 6) * 2;
    const duration = base === 0 ? 0 : base + wave;

    out.push({
      date: toISO(date),
      duration_min: duration,
    });
  }

  return out;
}

function buildNoteSeries(days: number, endDate: Date, baseMidi: number): DailyNotePoint[] {
  const pattern = [0, 1, -1, 0, 2, 0, -2, 1];
  const out: DailyNotePoint[] = [];

  for (let i = 0; i < days; i += 1) {
    const date = addDays(endDate, -(days - 1 - i));
    const miss = i % 5 === 0;
    out.push({
      date: toISO(date),
      midi: miss ? null : baseMidi + pattern[i % pattern.length],
    });
  }

  return out;
}

function buildMeasurementSeries(days: number, endDate: Date, base: number, wave = 3): MeasurementPoint[] {
  const out: MeasurementPoint[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = addDays(endDate, -(days - 1 - i));
    const miss = i % 7 === 0;
    out.push({
      date: toISO(date),
      value: miss ? null : base + ((i % 6) - 2) * wave,
    });
  }
  return out;
}

export function makeMockInsights(days: number): InsightsData {
  const safeDays = Math.max(7, days);
  const toDate = new Date();
  const fromDate = addDays(toDate, -(safeDays - 1));

  const dailyDurations = buildDailyDurations(safeDays, toDate);
  const practiceDaysCount = dailyDurations.filter((p) => p.duration_min > 0).length;

  return {
    range: {
      from: toISO(fromDate),
      to: toISO(toDate),
      days: safeDays,
    },
    daily_durations: dailyDurations,
    practice_days_count: practiceDaysCount,
    total_practice_days_count: practiceDaysCount,
    note_series: {
      falsetto: buildNoteSeries(safeDays, toDate, 69),
      chest: buildNoteSeries(safeDays, toDate, 64),
    },
    measurement_series: {
      falsetto_peak: buildMeasurementSeries(safeDays, toDate, 70, 1),
      chest_peak: buildMeasurementSeries(safeDays, toDate, 64, 1),
      range: buildMeasurementSeries(safeDays, toDate, 11, 1),
      long_tone: buildMeasurementSeries(safeDays, toDate, 14, 0.6),
      pitch_accuracy: buildMeasurementSeries(safeDays, toDate, 74, 1.2),
      volume_stability: buildMeasurementSeries(safeDays, toDate, 78, 1.4),
    },
    streaks: {
      current_days: 3,
      longest_days: 11,
    },
    top_notes: {
      falsetto: {
        note: "A4",
        midi: 69,
        date: toISO(addDays(toDate, -9)),
      },
      chest: {
        note: "E4",
        midi: 64,
        date: toISO(addDays(toDate, -4)),
      },
    },
    gamification: {
      total_xp: 185,
      level: 3,
      current_level_total_xp: 100,
      next_level_total_xp: 225,
      xp_to_next_level: 40,
      streak_current_days: 3,
      streak_longest_days: 11,
      analysis_sessions_count: 0,
      ai_recommendations_count: 1,
      badge_unlocked_count: 2,
      badge_total_count: 5,
      next_badge: {
        key: "streak_7",
        name: "7-Day Streak",
        description: "7日連続で記録",
        icon_path: "/badges/streak_7.svg",
        unlocked: false,
        unlocked_at: null,
        progress_current: 3,
        progress_required: 7,
      },
      badges: [
        {
          key: "first_log",
          name: "First Record",
          description: "はじめて記録を保存",
          icon_path: "/badges/first_log.svg",
          unlocked: true,
          unlocked_at: toISO(addDays(toDate, -14)),
          progress_current: 1,
          progress_required: 1,
        },
        {
          key: "streak_3",
          name: "3-Day Streak",
          description: "3日連続で記録",
          icon_path: "/badges/streak_3.svg",
          unlocked: true,
          unlocked_at: toISO(addDays(toDate, -2)),
          progress_current: 3,
          progress_required: 3,
        },
        {
          key: "streak_7",
          name: "7-Day Streak",
          description: "7日連続で記録",
          icon_path: "/badges/streak_7.svg",
          unlocked: false,
          unlocked_at: null,
          progress_current: 3,
          progress_required: 7,
        },
        {
          key: "streak_30",
          name: "30-Day Streak",
          description: "30日連続で記録",
          icon_path: "/badges/streak_30.svg",
          unlocked: false,
          unlocked_at: null,
          progress_current: 11,
          progress_required: 30,
        },
        {
          key: "xp_500",
          name: "XP 500",
          description: "累計XP 500到達",
          icon_path: "/badges/xp_500.svg",
          unlocked: false,
          unlocked_at: null,
          progress_current: 185,
          progress_required: 500,
        },
      ],
    },
  };
}
