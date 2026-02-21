export type AnalysisMenu = {
  id: number;
  system_key: string;
  name: string;
  focus_points?: string | null;
  compare_by_scale?: boolean;
  compare_by_tempo?: boolean;
  fixed_scale_type?: string | null;
  fixed_tempo?: number | null;
  selected_metrics?: string[];
  archived: boolean;
  created_at: string;
};
