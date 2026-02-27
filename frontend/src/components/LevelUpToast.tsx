import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { fetchInsights } from "../api/insights";
import { useAuth } from "../features/auth/useAuth";
import { onGamificationRewards } from "../features/gamification/rewardBus";

import "./LevelUpToast.css";

const LEVEL_SEEN_KEY = "last_seen_level";
const LEVEL_SEEN_USER_KEY = "last_seen_level_user_id";
const AUTO_HIDE_MS = 5000;

type LevelUpPayload = {
  fromLevel: number;
  toLevel: number;
};
type ConfettiStyle = CSSProperties & { "--drift": string; "--spin": string };

const CONFETTI_PARTICLES = Array.from({ length: 18 }).map((_, idx) => {
  const left = ((idx * 37) % 100) + 0.5;
  const delay = ((idx * 53) % 420) / 1000;
  const duration = 0.9 + ((idx * 29) % 90) / 100;
  const drift = -18 + ((idx * 17) % 36);
  const rotate = -160 + ((idx * 41) % 320);
  const size = 5 + (idx % 4);
  const shape = idx % 3;
  return { left, delay, duration, drift, rotate, size, shape };
});

function readSeenLevel() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LEVEL_SEEN_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.floor(parsed));
}

function writeSeenLevel(level: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LEVEL_SEEN_KEY, String(Math.max(0, Math.floor(level))));
}

function readSeenUserId() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LEVEL_SEEN_USER_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return Math.floor(parsed);
}

function writeSeenUserId(userId: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LEVEL_SEEN_USER_KEY, String(Math.floor(userId)));
}

export default function LevelUpToast() {
  const { me, isLoading } = useAuth();
  const [payload, setPayload] = useState<LevelUpPayload | null>(null);
  const timerRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current == null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const close = useCallback(() => {
    clearTimer();
    setPayload(null);
  }, [clearTimer]);

  const openToast = useCallback((next: LevelUpPayload) => {
    clearTimer();
    setPayload(next);
    timerRef.current = window.setTimeout(() => {
      setPayload(null);
      timerRef.current = null;
    }, AUTO_HIDE_MS);
  }, [clearTimer]);

  const evaluateLevel = useCallback((currentLevel: number, opts?: { primeOnly?: boolean }) => {
    const safeCurrent = Math.max(1, Math.floor(currentLevel));
    const seen = readSeenLevel();

    if (seen == null || opts?.primeOnly) {
      writeSeenLevel(safeCurrent);
      return;
    }

    if (safeCurrent <= seen) return;

    openToast({ fromLevel: seen, toLevel: safeCurrent });
    writeSeenLevel(safeCurrent);
  }, [openToast]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  useEffect(() => {
    if (isLoading) return;

    if (!me) {
      initializedRef.current = false;
      close();
      return;
    }

    const seenUserId = readSeenUserId();
    const userChanged = seenUserId == null || seenUserId !== me.id;
    if (userChanged) {
      writeSeenUserId(me.id);
      initializedRef.current = false;
      close();
    }

    let cancelled = false;
    void (async () => {
      const res = await fetchInsights(7);
      if (cancelled || !res.data) return;
      const level = res.data.gamification.level;
      evaluateLevel(level, { primeOnly: !initializedRef.current });
      initializedRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [close, evaluateLevel, isLoading, me]);

  useEffect(() => {
    if (!me) return;

    return onGamificationRewards((rewards) => {
      evaluateLevel(rewards.level);
      initializedRef.current = true;
    });
  }, [evaluateLevel, me]);

  const label = useMemo(() => {
    if (!payload) return "";
    if (payload.toLevel <= payload.fromLevel + 1) {
      return `Lv.${payload.toLevel} に到達`;
    }
    return `Lv.${payload.fromLevel} -> Lv.${payload.toLevel}`;
  }, [payload]);

  if (!payload) return null;

  return (
    <aside className="levelUpToast" role="status" aria-live="polite" aria-label="レベルアップ通知">
      <div className="levelUpToast__confetti" aria-hidden="true">
        {CONFETTI_PARTICLES.map((p, idx) => {
          const style: ConfettiStyle = {
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 1.8}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            "--drift": `${p.drift}px`,
            "--spin": `${p.rotate}deg`,
          };
          return (
          <span
            key={`confetti-${idx}`}
            className={`levelUpToast__particle levelUpToast__particle--shape${p.shape}`}
            style={style}
          />
          );
        })}
      </div>
      <img src="/badges/level_up.svg" alt="" className="levelUpToast__badge" aria-hidden="true" />
      <div className="levelUpToast__body">
        <div className="levelUpToast__kicker">LEVEL UP</div>
        <div className="levelUpToast__title">{label}</div>
        <div className="levelUpToast__sub">継続XPが更新されました</div>
      </div>
      <button type="button" className="levelUpToast__close" onClick={close} aria-label="通知を閉じる">
        ×
      </button>
    </aside>
  );
}
