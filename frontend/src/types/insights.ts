// frontend/src/types/insights.ts
export type InsightsRange = {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  days: number;
};

export type DailyDurationPoint = {
  date: string;         // YYYY-MM-DD
  duration_min: number; // 0.. (missing => 0)
};

export type MenuRankingItem = {
  menu_id: number;
  name: string;
  color: string;
  count: number;
};

export type TopNote = {
  note: string | null; // e.g. "A4"
  midi: number | null; // e.g. 69
  date: string | null; // YYYY-MM-DD（その最高音を記録した日付。なければ null）
};

export type DailyNotePoint = {
  date: string; // YYYY-MM-DD
  midi: number | null; // 欠損日は null
};

export type InsightsData = {
  range: InsightsRange;
  daily_durations: DailyDurationPoint[];
  practice_days_count: number; // within range
  menu_ranking: MenuRankingItem[];
  note_series: {
    falsetto: DailyNotePoint[];
    chest: DailyNotePoint[];
  };
  streaks: {
    current_days: number;
    longest_days: number;
  };
  top_notes: {
    falsetto: TopNote;
    chest: TopNote;
  };
};

export type InsightsResponse =
  | { data: InsightsData; error?: undefined }
  | { data: null; error: string };
