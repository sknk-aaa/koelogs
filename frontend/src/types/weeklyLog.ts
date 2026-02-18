export type WeeklyEffectFeedback = {
  menu_id: number;
  improvement_tags: string[];
};

export type WeeklyLog = {
  id: number;
  week_start: string;
  week_end: string;
  notes: string | null;
  effect_feedbacks: WeeklyEffectFeedback[];
  updated_at?: string | null;
};

export type WeeklyMenuCount = {
  menu_id: number;
  name: string;
  color: string;
  count: number;
};

export type WeeklyLogSummary = {
  week_start: string;
  week_end: string;
  total_duration_min: number;
  practice_days_count: number;
  falsetto_top_note: string | null;
  chest_top_note: string | null;
  menu_counts: WeeklyMenuCount[];
};

export type WeeklyLogResponse =
  | { data: WeeklyLog | null; summary: WeeklyLogSummary; error?: undefined }
  | { data: null; summary: null; error: string };
