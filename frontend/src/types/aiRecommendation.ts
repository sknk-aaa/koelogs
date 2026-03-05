export type AiCollectiveMenuSummary = {
  menu_label: string;
  count: number;
  scale_distribution: Array<{ label: string; count: number }>;
  detail_comments: string[];
  detail_keywords: string[];
  detail_patterns: {
    improved: string[];
    range: string[];
    focus: string[];
  };
};

export type AiCollectiveSummary = {
  used: boolean;
  window_days: number;
  min_count: number;
  items: Array<{
    tag_key: string;
    tag_label: string;
    menus: AiCollectiveMenuSummary[];
  }>;
};

export type AiRecommendation = {
  id: number;
  generated_for_date: string; // YYYY-MM-DD
  week_start_date: string; // YYYY-MM-DD (Monday)
  range_days: number;
  recommendation_text: string;
  collective_summary?: AiCollectiveSummary | null;
  created_at: string;
};

export type AiRecommendationShowResponse =
  | { data: AiRecommendation }
  | { data: null };

export type AiRecommendationCreateResponse =
  | { data: AiRecommendation }
  | { errors: string[] }
  | { error: string };

export type AiRecommendationThreadMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type AiRecommendationThread = {
  id: number;
  generated_for_date: string;
  model_name: string;
  system_prompt_version: string;
  user_prompt_version: string;
  created_at: string;
};

export type AiRecommendationHistoryItem = {
  id: number;
  generated_for_date: string;
  week_start_date: string;
  range_days: number;
  recommendation_text_preview: string;
  created_at: string;
};
