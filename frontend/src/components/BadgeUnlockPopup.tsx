import { useEffect, useMemo, useState } from "react";

import { onGamificationRewards } from "../features/gamification/rewardBus";
import type { SaveRewardBadge } from "../types/gamification";

import "./BadgeUnlockPopup.css";

type PopupItem = {
  id: string;
  badge: SaveRewardBadge;
};

export default function BadgeUnlockPopup() {
  const [queue, setQueue] = useState<PopupItem[]>([]);

  useEffect(() => {
    return onGamificationRewards((rewards) => {
      if (rewards.unlocked_badges.length === 0) return;
      setQueue((prev) => {
        const next = [...prev];
        for (const badge of rewards.unlocked_badges) {
          next.push({
            id: `${badge.key}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            badge,
          });
        }
        return next;
      });
    });
  }, []);

  const current = useMemo(() => queue[0] ?? null, [queue]);
  const close = () => {
    setQueue((prev) => prev.slice(1));
  };

  if (!current) return null;

  return (
    <div className="badgeUnlockPopup__overlay" role="dialog" aria-modal="true" aria-label="バッジ獲得">
      <section className="badgeUnlockPopup__card">
        <div className="badgeUnlockPopup__aurora" aria-hidden="true" />
        <div className="badgeUnlockPopup__spark badgeUnlockPopup__spark--a" aria-hidden="true" />
        <div className="badgeUnlockPopup__spark badgeUnlockPopup__spark--b" aria-hidden="true" />
        <div className="badgeUnlockPopup__spark badgeUnlockPopup__spark--c" aria-hidden="true" />
        <div className="badgeUnlockPopup__title">バッジを獲得しました</div>
        <div className="badgeUnlockPopup__iconFrame">
          <img src={current.badge.icon_path} alt={current.badge.name} className="badgeUnlockPopup__icon" />
        </div>
        <div className="badgeUnlockPopup__name">{current.badge.name}</div>
        <button type="button" className="badgeUnlockPopup__close" onClick={close}>
          閉じる
        </button>
      </section>
    </div>
  );
}
