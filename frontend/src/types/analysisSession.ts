export type AnalysisSession = {
  id: number;
  analysis_menu_id: number;
  analysis_menu_name?: string | null;
  duration_sec: number;
  peak_note?: string | null;
  pitch_stability_score?: number | null;
  voice_consistency_score?: number | null;
  range_semitones?: number | null;
  recorded_scale_type?: string | null;
  recorded_tempo?: number | null;
  audio_url?: string | null;
  has_audio?: boolean;
  feedback_text?: string | null;
  raw_metrics?: Record<string, unknown>;
  created_at: string;
};
