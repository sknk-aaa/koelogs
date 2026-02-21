import type { TrainingLog } from "./trainingLog";

export type MonthlyLogSummary = {
  total_duration_min: number;
  total_menu_count: number;
  menu_counts: Array<{
    menu_id: number;
    name: string;
    color: string | null;
    count: number;
  }>;
};

export type MonthlyLogData = {
  month: string;
  month_start: string;
  month_end: string;
  notes: string | null;
  summary: MonthlyLogSummary;
  daily_logs: TrainingLog[];
};

export type MonthlyLogResponse =
  | { data: MonthlyLogData; error?: undefined }
  | { data: null; error: string };
