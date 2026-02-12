export type TrainingLog = {
  id: number;
  practiced_on: string;
  duration_min: number | null;
  menus: string[];           
  notes: string | null;
  falsetto_top_note: string | null;
  chest_top_note: string | null;
  updated_at: string | null;
};