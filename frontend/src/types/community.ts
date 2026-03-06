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
  user_id: number;
  training_menu_id: number;
  menu_name: string;
  canonical_key: string;
  improvement_tags: string[];
  effect_level: number;
  used_scale_type: CommunityUsedScaleType;
  used_scale_other_text: string | null;
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
  { key: "chest_voice_strength", label: "地声強化" },
  { key: "falsetto_strength", label: "裏声強化" },
  { key: "mixed_voice_stability", label: "ミドルボイス安定" },
  { key: "vocal_cord_closure", label: "声帯閉鎖（声の芯）" },
  { key: "range_breadth", label: "音域の広さ" },
  { key: "pitch_accuracy", label: "音程精度" },
  { key: "volume_stability", label: "音量安定性" },
  { key: "long_tone_sustain", label: "ロングトーン維持" },
  { key: "less_throat_tension", label: "喉の力み軽減" },
  { key: "less_throat_fatigue", label: "喉の疲れ軽減" },
  { key: "breath_control", label: "ブレスコントロール" },
  { key: "breath_sustain", label: "息の持続" },
];

export type CommunityUsedScaleType =
  | "five_tone"
  | "triad"
  | "one_half_octave"
  | "octave"
  | "octave_repeat"
  | "semitone"
  | "other";

export const COMMUNITY_USED_SCALE_OPTIONS: Array<{ key: CommunityUsedScaleType; label: string }> = [
  { key: "five_tone", label: "5トーン" },
  { key: "triad", label: "トライアド" },
  { key: "one_half_octave", label: "1.5オクターブ" },
  { key: "octave", label: "オクターブ" },
  { key: "octave_repeat", label: "オクターブリピート" },
  { key: "semitone", label: "セミトーン" },
  { key: "other", label: "その他" },
];

export function usedScaleLabel(type: CommunityUsedScaleType, otherText?: string | null): string {
  if (type === "other") {
    return otherText?.trim() ? `その他（${otherText.trim()}）` : "その他";
  }
  return COMMUNITY_USED_SCALE_OPTIONS.find((opt) => opt.key === type)?.label ?? "その他";
}
