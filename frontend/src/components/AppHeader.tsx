import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";
import HamburgerDrawer, { type DrawerSection } from "./HamburgerDrawer";
import { getLastLogPath } from "../features/log/logNavigation";

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

export default function AppHeader() {
  const { me, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile(520);
  const isLogPage = location.pathname === "/log";
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
        title: "ヘルプ",
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
            title: "アカウント",
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
          title: "設定",
          items: [
            { label: "設定", onClick: () => navigate("/settings"), to: "/settings", match: "exact" },
            { label: "AIカスタム指示", onClick: () => navigate("/settings/ai"), to: "/settings/ai", match: "exact" },
            { label: "練習メニュー管理", onClick: () => navigate("/log/new?panel=menus"), to: "/log/new", match: "exact" },
          ],
        },
        {
          title: "アカウント",
          items: [
            {
              label: "マイページ",
              to: "/mypage",
              match: "exact",
              onClick: () => navigate("/mypage"),
            },
            {
              label: "プロフィール（表示名）",
              to: "/profile",
              match: "exact",
              onClick: () => navigate("/profile"),
            },
            {
              label: "ログアウト",
              variant: "danger",
              onClick: onLogout,
            },
          ],
        },
        baseHelp,
      ];
    },
    [me, navigate, onLogout]
  );

  const onClickBrand = () => {
    navigate(getLastLogPath());
  };

  const onClickLogHeaderDate = useCallback(() => {
    window.dispatchEvent(new CustomEvent("koelog:open-monthly-logs"));
  }, []);

  const headerStyle = isLogPage
    ? { ...styles.header, background: "#ffffff", backdropFilter: "none" }
    : styles.header;

  return (
    <>
      <header style={headerStyle}>
        <div style={styles.inner}>
          <div style={styles.left}>
            {isLogPage ? <div style={styles.logSpacer} aria-hidden="true" /> : (
              <button
                type="button"
                onClick={onClickBrand}
                style={styles.brandBtn}
                aria-label="ログページへ"
                title="ログへ"
              >
                <img
                  src="/koelog-logo.svg"
                  alt="KoeLog"
                  style={styles.brandLogo}
                  className="appHeader__logo"
                />
              </button>
            )}
          </div>

          <div style={styles.center}>
            {isLogPage && (
              <button type="button" onClick={onClickLogHeaderDate} style={styles.logTitleBtn} aria-label="今月のログ一覧を開く">
                <span style={styles.logTitleText}>{logHeaderDate}</span>
                <span style={styles.logTitleChevron} aria-hidden="true">▾</span>
              </button>
            )}
          </div>

          <div style={styles.right}>
            {!isLogPage && !isLoading && me && !isMobile && (
              <div style={styles.email} title={me.display_name ?? me.email}>
                {me.display_name ?? me.email}
              </div>
            )}

            {!isLogPage && !isLoading && !me && (
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
        headerTitle="メニュー"
        headerSub={isLoading ? "読み込み中…" : me ? "ログイン中" : "未ログイン"}
        sections={sections}
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
    background: "var(--headerBg)",
    backdropFilter: "blur(10px)",
    color: "var(--pageText, var(--text))",
  },

  // ★ sticky の中で absolute 中央を安定させるためのラッパー
  inner: {
    height: "100%",
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto",
    alignItems: "center",
    padding: "0 16px",
    position: "relative",
  },

  left: { display: "flex", alignItems: "center", gap: 10 },
  center: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
  },

  right: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    justifyContent: "flex-end",
  },

  // ★中央タイトル：画面のど真ん中に固定
  // アプリ名ボタン（リンク風）
  brandBtn: {
    letterSpacing: 0.2,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: "6px 4px",
    borderRadius: 12,
    display: "inline-flex",
    alignItems: "center",
    lineHeight: 0,
  },

  brandLogo: {
    display: "block",
    height: 40,
    width: "auto",
    transform: "translate(6px, 2px)",
  },
  logSpacer: {
    width: 40,
    height: 40,
  },
  logTitleBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "none",
    background: "transparent",
    padding: "6px 10px",
    borderRadius: 12,
    color: "var(--pageText, var(--text))",
    cursor: "pointer",
  },
  logTitleText: {
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: "var(--pageText, var(--text))",
  },
  logTitleChevron: {
    fontSize: 14,
    fontWeight: 800,
    opacity: 0.65,
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
    background: "var(--menuLine)",
    margin: 0,
  },
};
