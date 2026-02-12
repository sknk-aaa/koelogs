export type TrainingLog = {
  id: number;
  practiced_on: string; // YYYY-MM-DD
  duration_min: number | null;
  menus: string | null; // JSON文字列（Step4-1）
  notes: string | null;
  falsetto_top_note: string | null;
  chest_top_note: string | null;
  updated_at: string | null;
};

export type TrainingLogResponse = {
  data: TrainingLog | null;
  error?: string;
};