import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { getLastLogPath } from "../features/log/logNavigation";
import { useAuth } from "../features/auth/useAuth";
import { fetchBeginnerMissionGate } from "../features/missions/beginnerMissionGate";
import TutorialModal from "./TutorialModal";

// 画像をimport（ViteならこれでOK）
import logActive from "../assets/tabs/log_active.png";
import logInactive from "../assets/tabs/log_inactive.png";
import trainingActive from "../assets/tabs/training_active.png";
import trainingInactive from "../assets/tabs/training_inactive.png";
import insightsActive from "../assets/tabs/insights_active.png";
import insightsInactive from "../assets/tabs/insights_inactive.png";
import aiChatActive from "../assets/tabs/ai_chat_active.svg";
import aiChatInactive from "../assets/tabs/ai_chat_inactive.svg";
import communityActive from "../assets/tabs/community_active.svg";
import communityInactive from "../assets/tabs/community_inactive.svg";

type TabKey = "log" | "chat" | "training" | "community" | "insights";
const BEGINNER_LAST_PENDING_KEY_PREFIX = "koelogs:beginner_last_pending:user_";

function readBeginnerLastPending(userId: number): number | null {
  try {
    const raw = window.localStorage.getItem(`${BEGINNER_LAST_PENDING_KEY_PREFIX}${userId}`);
    if (raw == null) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

const BASE_TABS: {
  key: TabKey;
  label: string;
  to: string;
  iconActive: string;
  iconInactive: string;
}[] = [
  {
    key: "log",
    label: "ログ",
    to: "/log",
    iconActive: logActive,
    iconInactive: logInactive,
  },
  {
    key: "chat",
    label: "AIチャット",
    to: "/chat",
    iconActive: aiChatActive,
    iconInactive: aiChatInactive,
  },
  {
    key: "training",
    label: "トレーニング",
    to: "/training",
    iconActive: trainingActive,
    iconInactive: trainingInactive,
  },
  {
    key: "community",
    label: "コミュニティ",
    to: "/community",
    iconActive: communityActive,
    iconInactive: communityInactive,
  },
  {
    key: "insights",
    label: "分析",
    to: "/insights",
    iconActive: insightsActive,
    iconInactive: insightsInactive,
  },
];

export default function AppFooterTabs() {
  const navigate = useNavigate();
  const { me } = useAuth();
  const [beginnerCompleted, setBeginnerCompleted] = useState<boolean>(false);
  const [chatLockedModalOpen, setChatLockedModalOpen] = useState(false);
  const logTabTo = getLastLogPath();
  const lastUserIdRef = useRef<number | null>(null);
  const applyBeginnerCompleted = (next: boolean) => {
    setBeginnerCompleted((prev) => (prev ? true : next));
  };

  useEffect(() => {
    let cancelled = false;
    if (!me) {
      setBeginnerCompleted(true);
      lastUserIdRef.current = null;
      return () => {
        cancelled = true;
      };
    }

    if (lastUserIdRef.current !== me.id) {
      lastUserIdRef.current = me.id;
      setBeginnerCompleted(false);
    }

    const lastPending = readBeginnerLastPending(me.id);
    if (lastPending === 0) {
      applyBeginnerCompleted(true);
    } else if (typeof me.beginner_missions_completed === "boolean") {
      applyBeginnerCompleted(me.beginner_missions_completed);
    }

    void (async () => {
      const gate = await fetchBeginnerMissionGate();
      if (cancelled || !gate) return;
      applyBeginnerCompleted(gate.completed);
    })();

    return () => {
      cancelled = true;
    };
  }, [me?.id, me?.beginner_missions_completed]);

  const chatLocked = !!me && !beginnerCompleted;
  const tabs = useMemo(
    () =>
      BASE_TABS.map((tab) => {
        if (tab.key === "log") return { ...tab, to: logTabTo };
        return tab;
      }),
    [logTabTo]
  );

  return (
    <nav style={{ ...styles.nav, gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }} aria-label="mode tabs">
      {tabs.map((t) => (
        <NavLink
          key={t.key}
          to={t.to}
          aria-disabled={t.key === "chat" && chatLocked ? true : undefined}
          onClick={(event) => {
            if (t.key === "chat" && chatLocked) {
              event.preventDefault();
              setChatLockedModalOpen(true);
            }
          }}
          style={({ isActive }) => ({
            ...styles.tab,
            ...(t.key === "chat" && chatLocked ? styles.tabLocked : null),
            ...(isActive ? styles.tabActive : null),
          })}
        >
          {({ isActive }) => (
            <>
              <div style={styles.iconWrap}>
                <img
                  src={isActive ? t.iconActive : t.iconInactive}
                  alt=""
                  aria-hidden="true"
                  style={{
                    ...styles.iconImg,
                    ...(t.key === "chat" && chatLocked ? styles.iconImgLocked : null),
                    ...(isActive ? styles.iconImgActive : null),
                  }}
                />
                {t.key === "chat" && chatLocked && (
                  <span
                    aria-hidden="true"
                    style={{
                      ...styles.lockBadge,
                    }}
                  >
                    🔒
                  </span>
                )}
              </div>
              <div style={styles.labelWrap}>
                <div style={{ ...styles.label, ...(t.key === "chat" && chatLocked ? styles.labelLocked : null) }}>
                  {t.label}
                </div>
              </div>
            </>
          )}
        </NavLink>
      ))}
      <TutorialModal
        open={chatLockedModalOpen}
        badge="LOCKED"
        title="AIチャットはビギナーミッション完了で解放されます"
        paragraphs={[
          "まずはビギナーミッションを進めましょう。",
          "完了すると、AIチャットを利用できるようになります。",
        ]}
        primaryLabel="ビギナーミッションへ"
        onPrimary={() => {
          setChatLockedModalOpen(false);
          navigate("/mypage");
        }}
        secondaryLabel="あとで"
        onSecondary={() => setChatLockedModalOpen(false)}
        onClose={() => setChatLockedModalOpen(false)}
      />
    </nav>
  );
}

const TAB_BAR_H = 58; // ベース高さ（画像っぽい。56〜60で調整可）

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 60,
    boxSizing: "border-box",

    // ✅ 高さは“safe-area込みの合計”にする（固定にしない）
    height: `calc(${TAB_BAR_H}px + env(safe-area-inset-bottom))`,
    paddingBottom: "env(safe-area-inset-bottom)",

    background: "rgb(255, 255, 255)",
    backdropFilter: "blur(10px)",
    borderTop: "1px solid rgba(0,0,0,0.06)",
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
  },

  tab: {
    textDecoration: "none",
    color: "#8e8e93",

    // ✅ 高さいっぱいに広げる（tabの中心がズレない）
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",

    gap: 3,
    paddingTop: 6,
    fontWeight: 700,
    WebkitTapHighlightColor: "transparent",
  },
  tabLocked: {
    opacity: 0.86,
  },

  tabActive: { color: "#ff3b45" },

  iconImg: {
    width: 24,
    height: 24,
    objectFit: "contain",
    display: "block",
  },
  iconWrap: {
    position: "relative",
    width: 24,
    height: 24,
  },
  iconImgLocked: {
    filter: "grayscale(0.38)",
  },
  lockBadge: {
    position: "absolute",
    right: -9,
    top: -8,
    width: 20,
    height: 20,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.9)",
    backgroundColor: "#2f6fb7",
    boxShadow: "0 2px 5px rgba(0,0,0,0.24)",
    color: "#ffffff",
    fontSize: 13,
    lineHeight: "20px",
    textAlign: "center",
    fontWeight: 900,
  },

  labelWrap: {
    display: "grid",
    justifyItems: "center",
    gap: 1,
    lineHeight: 1.1,
  },
  label: { fontSize: 11, whiteSpace: "nowrap" },
  labelLocked: {
    color: "#75849b",
  },
};
