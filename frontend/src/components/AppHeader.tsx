import { useEffect, useMemo, useState, useCallback, type CSSProperties } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";
import HamburgerDrawer, { type DrawerSection } from "./HamburgerDrawer";
import { avatarIconPath } from "../features/profile/avatarIcons";
import { getLastLogPath } from "../features/log/logNavigation";
import { fetchBeginnerMissionGate } from "../features/missions/beginnerMissionGate";
import TutorialModal from "./TutorialModal";

function useIsMobile(breakpointPx = 520) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= breakpointPx;
  });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpointPx);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpointPx]);

  return isMobile;
}

type NavKey = "log" | "chat" | "community";
const BEGINNER_LAST_PENDING_KEY_PREFIX = "koelogs:beginner_last_pending:user_";

function LogTabIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
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
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
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

function CommunityTabIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
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

function LockedChatBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
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

const PRIMARY_NAV: {
  key: NavKey;
  label: string;
  to: string;
  renderIcon: (isActive: boolean) => React.ReactNode;
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
    key: "community",
    label: "コミュニティ",
    to: "/community",
    renderIcon: (isActive) => <CommunityTabIcon active={isActive} />,
  },
];

function renderDrawerSectionIcon(kind: "settings" | "account" | "help"): React.ReactNode {
  if (kind === "settings") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" focusable="false" aria-hidden="true">
        <path d="M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Z" fill="none" stroke="currentColor" strokeWidth="1.9" />
        <path d="M19 12a7 7 0 0 0-.1-1.1l2-1.5-1.9-3.2-2.4 1a7.7 7.7 0 0 0-1.9-1.1l-.3-2.5h-3.8l-.3 2.5a7.7 7.7 0 0 0-1.9 1.1l-2.4-1-1.9 3.2 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.1l-2 1.5 1.9 3.2 2.4-1a7.7 7.7 0 0 0 1.9 1.1l.3 2.5h3.8l.3-2.5a7.7 7.7 0 0 0 1.9-1.1l2.4 1 1.9-3.2-2-1.5c.1-.3.1-.7.1-1.1Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "account") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" focusable="false" aria-hidden="true">
        <circle cx="12" cy="8.3" r="3.3" fill="none" stroke="currentColor" strokeWidth="1.9" />
        <path d="M6.8 18c.5-2.6 2.6-4.4 5.2-4.4s4.7 1.8 5.2 4.4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" focusable="false" aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M9.7 9.4a2.7 2.7 0 1 1 4.6 1.9c-.8.8-1.5 1.3-1.5 2.6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="12" cy="16.9" r="1" fill="currentColor" />
    </svg>
  );
}

export default function AppHeader() {
  const { me, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [beginnerCompleted, setBeginnerCompleted] = useState<boolean>(false);
  const [chatLockedModalOpen, setChatLockedModalOpen] = useState(false);
  const isMobile = useIsMobile(520);
  const lastUserIdRef = useState<{ current: number | null }>({ current: null })[0];
  const logTabTo = getLastLogPath();
  const applyBeginnerCompleted = (next: boolean) => {
    setBeginnerCompleted((prev) => (prev ? true : next));
  };

  useEffect(() => {
    const id = setTimeout(() => {
      setOpen(false);
    }, 0);

    return () => clearTimeout(id);
  }, [location.pathname]);

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
  }, [me]);

  const onLogout = useCallback(async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (e) {
      console.error(e);
      alert("ログアウトに失敗しました");
    }
  }, [logout, navigate]);

  const sections: DrawerSection[] = useMemo(
    () => {
      const baseHelp: DrawerSection = {
        title: "HELP",
        icon: renderDrawerSectionIcon("help"),
        items: [
          {
            label: "使い方",
            to: "/help/guide",
            match: "exact",
            onClick: () => navigate("/help/guide"),
          },
          {
            label: "このアプリについて",
            to: "/help/about",
            match: "exact",
            onClick: () => navigate("/help/about"),
          },
          {
            label: "お問い合わせ",
            to: "/help/contact",
            match: "exact",
            onClick: () => navigate("/help/contact"),
          },
        ],
      };

      if (!me) {
        return [
          {
            title: "ACCOUNT",
            icon: renderDrawerSectionIcon("account"),
            items: [
              { label: "ログイン", onClick: () => navigate("/login"), to: "/login", match: "exact" },
              { label: "Sign up", onClick: () => navigate("/signup"), to: "/signup", match: "exact" },
            ],
          },
          baseHelp,
        ];
      }

      return [
        {
          title: "ACCOUNT",
          icon: renderDrawerSectionIcon("account"),
          items: [
            {
              label: "マイページ",
              to: "/mypage",
              match: "exact",
              onClick: () => navigate("/mypage"),
            },
            {
              label: "アカウント設定",
              to: "/profile",
              match: "exact",
              onClick: () => navigate("/profile"),
            },
            {
              label: me.plan_tier === "premium" ? "プラン管理" : "プレミアムプラン",
              onClick: () => navigate(me.plan_tier === "premium" ? "/plan" : "/premium"),
              to: me.plan_tier === "premium" ? "/plan" : "/premium",
              match: "exact",
            },
          ],
        },
        {
          title: "SETTINGS",
          icon: renderDrawerSectionIcon("settings"),
          items: [
            { label: "設定", onClick: () => navigate("/settings"), to: "/settings", match: "exact" },
            { label: "AIカスタム指示", onClick: () => navigate("/settings/ai"), to: "/settings/ai", match: "exact" },
          ],
        },
        baseHelp,
      ];
    },
    [me, navigate, onLogout]
  );
  const chatLocked = !!me && !beginnerCompleted;
  const navItems = useMemo(
    () =>
      PRIMARY_NAV.map((item) => {
        if (item.key === "log") return { ...item, to: logTabTo };
        return item;
      }),
    [logTabTo]
  );
  const headerStyles = useMemo(() => buildHeaderStyles(isMobile), [isMobile]);

  return (
    <>
      <header style={headerStyles.header}>
        <div style={headerStyles.inner}>
          <div style={headerStyles.left}>
            <button
              type="button"
              onClick={() => navigate("/log")}
              style={headerStyles.brandButton}
              aria-label="Koelogsのホームへ移動"
            >
              <img src="/Koelogs-icon.png" alt="" style={headerStyles.brandIcon} />
              {!isMobile && <img src="/koelog-logo.svg" alt="Koelogs" style={headerStyles.brandLogo} />}
            </button>
          </div>
          <div style={headerStyles.right}>
            <div style={headerStyles.center}>
              <nav style={headerStyles.primaryNav} aria-label="primary navigation">
                {navItems.map((item) => (
                  <NavLink
                    key={item.key}
                    to={item.to}
                    aria-disabled={item.key === "chat" && chatLocked ? true : undefined}
                    onClick={(event) => {
                      if (item.key === "chat" && chatLocked) {
                        event.preventDefault();
                        setChatLockedModalOpen(true);
                      }
                    }}
                    style={({ isActive }) => ({
                      ...headerStyles.primaryNavLink,
                      ...(isActive ? headerStyles.primaryNavLinkActive : null),
                      ...(item.key === "chat" && chatLocked ? headerStyles.primaryNavLinkLocked : null),
                    })}
                  >
                    {({ isActive }) => (
                      <>
                        <span style={headerStyles.primaryNavIconWrap}>
                          <span style={headerStyles.primaryNavIcon}>{item.renderIcon(isActive)}</span>
                          {item.key === "chat" && chatLocked && (
                            <span style={headerStyles.lockBadge}>
                              <LockedChatBadgeIcon />
                            </span>
                          )}
                        </span>
                        <span style={headerStyles.primaryNavLabel}>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>
            {!isLoading && (
              <button
                type="button"
                aria-label="メニューを開く"
                onClick={() => setOpen(true)}
                style={headerStyles.menuBtn}
              >
                <span style={headerStyles.bar} />
                <span style={headerStyles.bar} />
                <span style={headerStyles.bar} />
              </button>
            )}
          </div>
        </div>
      </header>

      <HamburgerDrawer
        open={open}
        onClose={() => setOpen(false)}
        headerTitle="MENU"
        headerSub={isLoading ? "読み込み中…" : me ? "ログイン中" : "未ログイン"}
        profile={
          me
            ? {
                avatar: (
                  <img
                    src={avatarIconPath(me.avatar_icon, me.avatar_image_url)}
                    alt=""
                    style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }}
                  />
                ),
                name: me.display_name ?? me.email,
                planLabel: me.plan_tier === "premium" ? "PREMIUM" : "FREE",
              }
            : undefined
        }
        sections={sections}
        footerItem={me ? { label: "ログアウト", variant: "danger", onClick: onLogout } : undefined}
        activePath={location.pathname}
      />
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
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  header: {
    height: 56,
    position: "sticky",
    top: 0,
    zIndex: 80,
    background: "var(--headerBg, #ffffff)",
    borderBottom: "1px solid var(--headerBorder, transparent)",
    color: "var(--pageText, var(--text))",
  },

  inner: {
    height: "100%",
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "center",
    gap: 10,
    padding: "0 14px",
  },

  left: {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
  },
  center: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    minWidth: 0,
    overflow: "hidden",
  },

  right: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    minWidth: 0,
  },

  brandButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    minHeight: 34,
    padding: "0 6px 0 4px",
    borderRadius: 12,
    border: "none",
    background: "transparent",
    cursor: "pointer",
  },
  brandIcon: {
    width: 24,
    height: 24,
    display: "block",
    objectFit: "contain",
  },
  brandLogo: {
    height: 15,
    width: "auto",
    display: "block",
  },
  primaryNav: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    width: "auto",
    maxWidth: "100%",
  },
  primaryNavLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    minHeight: 34,
    border: "none",
    borderRadius: 12,
    padding: "0 9px",
    justifyContent: "center",
    textDecoration: "none",
    color: "var(--headerTitleText, color-mix(in srgb, var(--pageText, var(--text)) 72%, transparent))",
    minWidth: "fit-content",
    flexShrink: 1,
  },
  primaryNavLinkActive: {
    color: "var(--accent)",
    background: "color-mix(in srgb, var(--accent) 10%, transparent)",
  },
  primaryNavLinkLocked: {
    opacity: 0.84,
  },
  primaryNavIconWrap: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  primaryNavIcon: {
    width: 18,
    height: 18,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryNavLabel: {
    fontSize: 10.5,
    fontWeight: 800,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  lockBadge: {
    position: "absolute",
    right: -5,
    top: -5,
    width: 16,
    height: 16,
    borderRadius: 999,
    border: "1px solid rgba(89, 117, 137, 0.18)",
    backgroundColor: "#f6fafc",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    color: "#7e919d",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  menuBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    padding: 0,
  },

  bar: {
    display: "block",
    width: 16,
    height: 1.5,
    borderRadius: 999,
    background: "var(--menuLine, rgba(0, 0, 0, 0.78))",
    margin: 0,
  },
};

function buildHeaderStyles(isMobile: boolean): Record<string, CSSProperties> {
  if (isMobile) return styles;

  return {
    ...styles,
    header: {
      ...styles.header,
      height: 72,
      borderBottom: "1px solid color-mix(in srgb, var(--pageText, var(--text)) 8%, transparent)",
    },
    inner: {
      ...styles.inner,
      gap: 22,
      padding: "0 32px",
    },
    center: {
      ...styles.center,
      justifyContent: "flex-start",
    },
    right: {
      ...styles.right,
      gap: 12,
    },
    brandButton: {
      ...styles.brandButton,
      gap: 13,
      minHeight: 46,
      padding: "0 14px 0 2px",
    },
    brandIcon: {
      ...styles.brandIcon,
      width: 38,
      height: 38,
    },
    brandLogo: {
      ...styles.brandLogo,
      height: 25,
    },
    primaryNav: {
      ...styles.primaryNav,
      gap: 8,
    },
    primaryNavLink: {
      ...styles.primaryNavLink,
      minHeight: 44,
      gap: 9,
      padding: "0 20px",
      borderRadius: 16,
    },
    primaryNavIcon: {
      ...styles.primaryNavIcon,
      width: 20,
      height: 20,
    },
    primaryNavLabel: {
      ...styles.primaryNavLabel,
      fontSize: 13.5,
      letterSpacing: "0.01em",
    },
    menuBtn: {
      ...styles.menuBtn,
      width: 40,
      height: 40,
      borderRadius: 14,
    },
    bar: {
      ...styles.bar,
      width: 18,
    },
  };
}
