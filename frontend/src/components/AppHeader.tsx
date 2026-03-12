import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";
import HamburgerDrawer, { type DrawerSection } from "./HamburgerDrawer";
import { avatarIconPath } from "../features/profile/avatarIcons";

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

function headerTitleForPath(pathname: string): string {
  if (pathname.startsWith("/log/new")) return "NEW LOG";
  if (pathname.startsWith("/training")) return "TRAINING";
  if (pathname.startsWith("/insights/time")) return "PRACTICE TIME";
  if (pathname.startsWith("/insights/notes")) return "MEASURE DETAILS";
  if (pathname.startsWith("/insights")) return "INSIGHTS";
  if (pathname.startsWith("/community/rankings")) return "RANKINGS";
  if (pathname.startsWith("/community/profile")) return "PROFILE";
  if (pathname.startsWith("/community")) return "COMMUNITY";
  if (pathname.startsWith("/settings/ai")) return "AI SETTINGS";
  if (pathname.startsWith("/settings")) return "SETTINGS";
  if (pathname.startsWith("/profile")) return "ACCOUNT";
  if (pathname.startsWith("/mypage")) return "MY PAGE";
  if (pathname.startsWith("/help/guide")) return "GUIDE";
  if (pathname.startsWith("/help/about")) return "ABOUT";
  if (pathname.startsWith("/help/contact")) return "CONTACT";
  if (pathname.startsWith("/premium")) return "PREMIUM";
  return "";
}

function formatLogHeaderDate(value: string | null): string {
  if (!value) return "";
  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matched) {
    return `${Number(matched[2])}月${Number(matched[3])}日`;
  }
  const monthMatched = value.match(/^(\d{4})-(\d{2})$/);
  if (monthMatched) {
    return `${Number(monthMatched[2])}月`;
  }
  return "";
}

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
  const isMobile = useIsMobile(520);
  const isLogPage = location.pathname === "/log";
  const headerTitle = useMemo(() => headerTitleForPath(location.pathname), [location.pathname]);
  const logHeaderDate = useMemo(() => {
    if (!isLogPage) return "";
    const params = new URLSearchParams(location.search);
    const mode = params.get("mode");
    if (mode === "month") return formatLogHeaderDate(params.get("month"));
    return formatLogHeaderDate(params.get("date")) || formatLogHeaderDate(new Date().toISOString().slice(0, 10));
  }, [isLogPage, location.search]);

  useEffect(() => {
    const id = setTimeout(() => {
      setOpen(false);
    }, 0);

    return () => clearTimeout(id);
  }, [location.pathname]);

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

  const onClickLogHeaderDate = useCallback(() => {
    window.dispatchEvent(new CustomEvent("koelog:open-monthly-logs"));
  }, []);

  return (
    <>
      <header style={styles.header}>
        <div style={styles.inner}>
          <div style={styles.left} aria-hidden="true">
            <div style={styles.sideSpacer} />
          </div>
          <div style={styles.center}>
            {isLogPage ? (
              <button type="button" onClick={onClickLogHeaderDate} style={styles.logTitleBtn} aria-label="今月のログ一覧を開く">
                <span style={styles.logTitleText}>{logHeaderDate}</span>
                <span style={styles.logTitleChevron} aria-hidden="true">▾</span>
              </button>
            ) : headerTitle ? (
              <div style={styles.pageTitle}>{headerTitle}</div>
            ) : null}
          </div>

          <div style={styles.right}>
            {!isLoading && me && !isMobile && (
              <div style={styles.email} title={me.display_name ?? me.email}>
                {me.display_name ?? me.email}
              </div>
            )}

            {!isLoading && !me && !isMobile && (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  style={styles.authBtn}
                >
                  ログイン
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/signup")}
                  style={{ ...styles.authBtn, ...styles.authBtnPrimary }}
                >
                  Sign up
                </button>
              </>
            )}

            {!isLoading && (
              <button
                type="button"
                aria-label="メニューを開く"
                onClick={() => setOpen(true)}
                style={styles.menuBtn}
              >
                <span style={styles.bar} />
                <span style={styles.bar} />
                <span style={styles.bar} />
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
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
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
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    position: "relative",
  },

  left: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 36,
  },
  center: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
    maxWidth: "calc(100% - 132px)",
    pointerEvents: "none",
  },

  right: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    justifyContent: "flex-end",
  },

  sideSpacer: {
    width: 36,
    height: 36,
  },
  logTitleBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "none",
    background: "transparent",
    padding: "6px 10px",
    borderRadius: 12,
    color: "var(--headerTitleText, var(--pageText, var(--text)))",
    cursor: "pointer",
    pointerEvents: "auto",
  },
  logTitleText: {
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: "var(--headerTitleText, var(--pageText, var(--text)))",
    whiteSpace: "nowrap",
  },
  logTitleChevron: {
    fontSize: 14,
    fontWeight: 800,
    opacity: 0.65,
  },
  pageTitle: {
    fontSize: "var(--ui-section-eyebrow-size, 1.05rem)",
    fontWeight: 800,
    letterSpacing: "var(--ui-section-eyebrow-letter-spacing, 0.16em)",
    color: "var(--headerTitleText, var(--ui-section-eyebrow-color, var(--pageText, var(--text))))",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  email: {
    color: "var(--text)",
    fontSize: 12,
    opacity: 0.7,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 220,
  },
  authBtn: {
    height: 38,
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 900,
    padding: "0 10px",
    whiteSpace: "nowrap",
  },
  authBtnPrimary: {
    borderColor: "color-mix(in srgb, var(--accent) 44%, rgba(0,0,0,0.1))",
    background: "var(--accent)",
  },

  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 0,
  },

  bar: {
    display: "block",
    width: 20,
    height: 1.5,
    borderRadius: 999,
    background: "var(--menuLine, rgba(0, 0, 0, 0.78))",
    margin: 0,
  },
};
