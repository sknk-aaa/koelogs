export type AnalysisFeedbackEvaluation = {
  metric_key: string;
  metric_label: string;
  score: number | null;
  reason: string;
  evidence: string[];
};

export type AnalysisFeedback = {
  version: number;
  summary: string;
  evaluations: AnalysisFeedbackEvaluation[];
  note?: string;
};

export type AnalysisSession = {
  id: number;
  analysis_menu_id: number;
  analysis_menu_name?: string | null;
  duration_sec: number;
  measurement_kind: string;
  peak_note?: string | null;
  lowest_note?: string | null;
  pitch_stability_score?: number | null;
  voice_consistency_score?: number | null;
  range_semitones?: number | null;
  recorded_scale_type?: string | null;
  recorded_tempo?: number | null;
  audio_url?: string | null;
  has_audio?: boolean;
  feedback_text?: string | null;
  ai_feedback?: AnalysisFeedback | null;
  raw_metrics?: Record<string, unknown>;
  created_at: string;
};
