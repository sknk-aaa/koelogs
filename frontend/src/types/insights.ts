// frontend/src/types/insights.ts
import type { GamificationSummary } from "./gamification";

export type InsightsRange = {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  days: number;
};

export type DailyDurationPoint = {
  date: string;         // YYYY-MM-DD
  duration_min: number; // 0.. (missing => 0)
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

export type MeasurementPoint = {
  date: string;
  value: number | null;
};

export type InsightsData = {
  range: InsightsRange;
  daily_durations: DailyDurationPoint[];
  practice_days_count: number; // within range
  total_practice_days_count: number; // all time
  note_series: {
    falsetto: DailyNotePoint[];
    chest: DailyNotePoint[];
  };
  measurement_series?: {
    range: MeasurementPoint[];
    long_tone: MeasurementPoint[];
    volume_stability: MeasurementPoint[];
  };
  streaks: {
    current_days: number;
    longest_days: number;
  };
  top_notes: {
    falsetto: TopNote;
    chest: TopNote;
  };
  gamification: GamificationSummary;
};

export type InsightsResponse =
  | { data: InsightsData; error?: undefined }
  | { data: null; error: string };
