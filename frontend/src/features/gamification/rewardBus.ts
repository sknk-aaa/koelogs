import type { SaveRewards } from "../../types/gamification";

const EVENT_NAME = "gamification:rewards";

export function emitGamificationRewards(rewards: SaveRewards | null | undefined): void {
  if (!rewards) return;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<SaveRewards>(EVENT_NAME, { detail: rewards }));
}

export function onGamificationRewards(listener: (rewards: SaveRewards) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    if (!(event instanceof CustomEvent)) return;
    const rewards = event.detail as SaveRewards | undefined;
    if (!rewards) return;
    listener(rewards);
  };

  window.addEventListener(EVENT_NAME, handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
  };
}

export function mergeRewards(base: SaveRewards | null, extra: SaveRewards | null): SaveRewards | null {
  if (!base && !extra) return null;
  if (!base) return extra;
  if (!extra) return base;

  const seen = new Set<string>();
  const mergedBadges = [...base.unlocked_badges, ...extra.unlocked_badges].filter((badge) => {
    if (seen.has(badge.key)) return false;
    seen.add(badge.key);
    return true;
  });

  return {
    xp_earned: base.xp_earned + extra.xp_earned,
    unlocked_badges: mergedBadges,
    total_xp: Math.max(base.total_xp, extra.total_xp),
    level: Math.max(base.level, extra.level),
    streak_current_days: Math.max(base.streak_current_days, extra.streak_current_days),
    streak_longest_days: Math.max(base.streak_longest_days, extra.streak_longest_days),
    streak_message_days: Math.max(base.streak_message_days ?? 0, extra.streak_message_days ?? 0),
  };
}
