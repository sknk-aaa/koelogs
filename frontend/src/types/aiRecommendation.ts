export type AiRecommendation = {
  id: number;
  generated_for_date: string; // YYYY-MM-DD
  range_days: number;
  recommendation_text: string;
  created_at: string;
};

export type AiRecommendationShowResponse =
  | { data: AiRecommendation }
  | { data: null };

export type AiRecommendationCreateResponse =
  | { data: AiRecommendation }
  | { errors: string[] }
  | { error: string };
