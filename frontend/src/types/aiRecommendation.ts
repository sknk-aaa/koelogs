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
