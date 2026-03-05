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

export type MonthlyComparisonMetric = {
  current: number | null;
  previous: number | null;
  diff: number | null;
  pct?: number | null;
  current_days?: number;
  previous_days?: number;
};

export type MonthlyLogComparisonData = {
  practice_time: MonthlyComparisonMetric;
  measurement_changes: Array<{
    key: string;
    label: string;
    unit: string;
    better: "higher" | "lower";
    epsilon: number;
    status: "improved" | "declined" | "stable" | "no_data";
    current: {
      value: number | null;
      display: string;
      count: number;
    };
    previous: {
      value: number | null;
      display: string;
      count: number;
    };
    diff: number | null;
    diff_display: string;
    low_sample: boolean;
  }>;
  meta: {
    current_range_label: string;
    previous_range_label: string;
    basis_label: string;
  };
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

export type MonthlyLogComparisonResponse =
  | { data: MonthlyLogComparisonData; error?: undefined }
  | { data: null; error: string };
