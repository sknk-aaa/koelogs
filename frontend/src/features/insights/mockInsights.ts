import type { DailyDurationPoint, InsightsData, MenuRankingItem } from "../../types/insights";

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

function buildMenuRanking(days: number): MenuRankingItem[] {
  const scale = Math.max(1, Math.round(days / 30));
  return [
    { menu_id: 101, name: "リップロール", color: "#F59E0B", count: 12 * scale },
    { menu_id: 102, name: "ハミング", color: "#34D399", count: 10 * scale },
    { menu_id: 103, name: "ミックス練習", color: "#60A5FA", count: 8 * scale },
    { menu_id: 104, name: "母音トレーニング", color: "#F472B6", count: 7 * scale },
    { menu_id: 105, name: "地声強化", color: "#A78BFA", count: 5 * scale },
  ];
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
    menu_ranking: buildMenuRanking(safeDays),
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
  };
}
