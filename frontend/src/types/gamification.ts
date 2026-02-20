export type BadgeProgress = {
  key: string;
  name: string;
  description: string;
  icon_path: string;
  unlocked: boolean;
  unlocked_at: string | null;
  progress_current: number;
  progress_required: number;
};

export type GamificationSummary = {
  total_xp: number;
  level: number;
  current_level_total_xp: number;
  next_level_total_xp: number;
  xp_to_next_level: number;
  streak_current_days: number;
  streak_longest_days: number;
  analysis_sessions_count: number;
  ai_recommendations_count: number;
  badge_unlocked_count: number;
  badge_total_count: number;
  next_badge: BadgeProgress | null;
  badges: BadgeProgress[];
};

export type SaveRewardBadge = {
  key: string;
  name: string;
  icon_path: string;
};

export type SaveRewards = {
  xp_earned: number;
  unlocked_badges: SaveRewardBadge[];
  total_xp: number;
  level: number;
  streak_current_days: number;
  streak_longest_days: number;
  streak_message_days?: number | null;
};
