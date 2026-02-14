// frontend/src/types/insights.ts
export type InsightsRange = {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  days: number;
};

export type DailyDurationPoint = {
  date: string; // YYYY-MM-DD
  duration_min: number; // 0.. (missing => 0)
};

export type MenuRankingItem = {
  menu: string;
  count: number;
};

export type TopNote = {
  note: string | null; // e.g. "A4"
  midi: number | null; // e.g. 69
};

export type InsightsData = {
  range: InsightsRange;
  daily_durations: DailyDurationPoint[];
  practice_days_count: number; // within range
  menu_ranking: MenuRankingItem[];
  top_notes: {
    falsetto: TopNote;
    chest: TopNote;
  };
};

export type InsightsResponse =
  | { data: InsightsData; error?: undefined }
  | { data: null; error: string };
