import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { getLastLogPath } from "../features/log/logNavigation";
import { useAuth } from "../features/auth/useAuth";
import { fetchBeginnerMissionGate } from "../features/missions/beginnerMissionGate";
import { useTheme } from "../features/theme/useTheme";
import TutorialModal from "./TutorialModal";

type TabKey = "log" | "chat" | "training" | "community" | "insights";
const BEGINNER_LAST_PENDING_KEY_PREFIX = "koelogs:beginner_last_pending:user_";

function LogTabIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path
        d="M4 10.6L12 4l8 6.6V19a1 1 0 0 1-1 1h-5.4v-5.3a1 1 0 0 0-1-1h-1.2a1 1 0 0 0-1 1V20H5a1 1 0 0 1-1-1v-8.4Z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatTabIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path
        d="M4.6 6.8a2 2 0 0 1 2-2h10.8a2 2 0 0 1 2 2v7.2a2 2 0 0 1-2 2H10l-3.4 2.8v-2.8H6.6a2 2 0 0 1-2-2V6.8Z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9.2" cy="10.4" r="0.95" fill={active ? "rgba(255,255,255,0.92)" : "currentColor"} />
      <circle cx="12" cy="10.4" r="0.95" fill={active ? "rgba(255,255,255,0.92)" : "currentColor"} />
      <circle cx="14.8" cy="10.4" r="0.95" fill={active ? "rgba(255,255,255,0.92)" : "currentColor"} />
    </svg>
  );
}

function TrainingTabIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <rect
        x="9.1"
        y="4.2"
        width="5.8"
        height="10"
        rx="2.9"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M7.2 11.6a4.8 4.8 0 0 0 9.6 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 16.5v3.3M9.4 19.8h5.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CommunityTabIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <circle cx="9.2" cy="8.2" r="2.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" />
      <path
        d="M4.8 16.9c0-2.2 1.9-4 4.4-4s4.4 1.8 4.4 4"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="16.3" cy="9.1" r="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M14 16.9c.1-1.8 1.5-3.2 3.4-3.2 1 0 1.9.4 2.5 1.1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function InsightsTabIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path d="M4 18.8h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="5.5" y="12.3" width="2.8" height="6.3" rx="0.9" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" />
      <rect x="10.6" y="9.2" width="2.8" height="9.4" rx="0.9" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" />
      <rect x="15.7" y="6.1" width="2.8" height="12.5" rx="0.9" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function LockedChatBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <rect x="6.8" y="10.4" width="10.4" height="8" rx="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M9.2 10.4V8.8a2.8 2.8 0 0 1 5.6 0v1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
  renderIcon: (isActive: boolean) => ReturnType<typeof LogTabIcon>;
}[] = [
  {
    key: "log",
    label: "ログ",
    to: "/log",
    renderIcon: (isActive) => <LogTabIcon active={isActive} />,
  },
  {
    key: "chat",
    label: "AIチャット",
    to: "/chat",
    renderIcon: (isActive) => <ChatTabIcon active={isActive} />,
  },
  {
    key: "training",
    label: "トレーニング",
    to: "/training",
    renderIcon: (isActive) => <TrainingTabIcon active={isActive} />,
  },
  {
    key: "community",
    label: "コミュニティ",
    to: "/community",
    renderIcon: (isActive) => <CommunityTabIcon active={isActive} />,
  },
  {
    key: "insights",
    label: "分析",
    to: "/insights",
    renderIcon: (isActive) => <InsightsTabIcon active={isActive} />,
  },
];

export default function AppFooterTabs() {
  const navigate = useNavigate();
  const { me } = useAuth();
  const { resolvedMode } = useTheme();
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
  const styles = useMemo(() => buildStyles(resolvedMode), [resolvedMode]);
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
                <span style={{ ...styles.iconSvgWrap, ...(t.key === "chat" && chatLocked ? styles.iconSvgLocked : null) }}>
                  {t.renderIcon(isActive)}
                </span>
                {t.key === "chat" && chatLocked && (
                  <span
                    aria-hidden="true"
                    style={{
                      ...styles.lockBadge,
                    }}
                  >
                    <LockedChatBadgeIcon />
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

function buildStyles(mode: "light" | "dark"): Record<string, React.CSSProperties> {
  const inactiveColor = mode === "dark" ? "rgba(222, 233, 252, 0.74)" : "#9a9aa0";
  const activeColor = mode === "dark" ? "#60a5fa" : "var(--accent)";
  const navBackground =
    mode === "dark"
      ? "rgba(13, 20, 38, 0.98)"
      : "#ffffff";
  const navBorder = mode === "dark" ? "1px solid rgba(129, 154, 209, 0.24)" : "1px solid #ececec";

  return {
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

    background: navBackground,
    backdropFilter: "blur(10px)",
    borderTop: navBorder,
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
  },

  tab: {
    textDecoration: "none",
    color: inactiveColor,

    // ✅ 高さいっぱいに広げる（tabの中心がズレない）
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",

    gap: 4,
    paddingTop: 4,
    fontWeight: 700,
    WebkitTapHighlightColor: "transparent",
  },
  tabLocked: {
    opacity: 0.86,
  },

  tabActive: {
    color: activeColor,
    background: "transparent",
  },

  iconSvgWrap: {
    width: 24,
    height: 24,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "inherit",
  },
  iconWrap: {
    position: "relative",
    width: 24,
    height: 24,
  },
  iconSvgLocked: {
    filter: "grayscale(0.38)",
  },
  lockBadge: {
    position: "absolute",
    right: -7,
    top: -6,
    width: 18,
    height: 18,
    borderRadius: 999,
    border: mode === "dark" ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(89, 117, 137, 0.18)",
    backgroundColor: mode === "dark" ? "rgba(255,255,255,0.06)" : "#f6fafc",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    color: mode === "dark" ? "rgba(230,238,252,0.82)" : "#7e919d",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  labelWrap: {
    display: "grid",
    justifyItems: "center",
    gap: 1,
    lineHeight: 1.1,
  },
  label: { fontSize: 11, whiteSpace: "nowrap", fontWeight: 700 },
  labelLocked: {
    color: "#75849b",
  },
  };
}
