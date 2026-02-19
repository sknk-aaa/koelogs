export type CommunityPublicProfile = {
  public: boolean;
  user_id?: number;
  display_name?: string;
  avatar_icon?: string;
  avatar_image_url?: string | null;
  level?: number;
  streak_current_days?: number;
  total_xp?: number;
  badges?: Array<{
    key: string;
    name: string;
    icon_path: string;
  }>;
  goal_text?: string | null;
};

export type CommunityPost = {
  id: number;
  training_menu_id: number;
  menu_name: string;
  canonical_key: string;
  improvement_tags: string[];
  effect_level: number;
  comment: string | null;
  published: boolean;
  practiced_on: string | null;
  created_at: string;
  favorite_count: number;
  favorited_by_me: boolean;
  user: CommunityPublicProfile;
};

export type CommunityProfileDetail = {
  user_id: number;
  display_name: string;
  avatar_icon: string;
  avatar_image_url: string | null;
  level: number;
  streak_current_days: number;
  total_xp: number;
  ai_contribution_count: number;
  badges: Array<{
    key: string;
    name: string;
    icon_path: string;
  }>;
  goal_text: string | null;
};

export type CommunityRankingEntry = {
  user_id: number;
  display_name: string;
  avatar_icon: string;
  avatar_image_url: string | null;
  level: number;
  value: number;
};

export type CommunityRankings = {
  ai_contributions: CommunityRankingEntry[];
  streak_days: CommunityRankingEntry[];
  weekly_duration_min: CommunityRankingEntry[];
};

export const IMPROVEMENT_TAG_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "high_note_ease", label: "高音の出しやすさ" },
  { key: "pitch_stability", label: "音程の安定" },
  { key: "passaggio_smoothness", label: "換声点の滑らかさ" },
  { key: "less_breathlessness", label: "息切れしにくさ" },
  { key: "volume_stability", label: "声量の安定" },
  { key: "less_throat_tension", label: "喉の力み軽減" },
  { key: "resonance_clarity", label: "声の抜け・響き" },
  { key: "long_tone_sustain", label: "ロングトーン維持" },
];
