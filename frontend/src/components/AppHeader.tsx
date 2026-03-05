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

export default function AppHeader() {
  const { me, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile(520);

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

  return (
    <>
      <header style={styles.header}>
        {/* absolute中央を確実にするための relative ラッパー */}
        <div style={styles.inner}>
          {/* 左：アプリ名（クリックで /log） */}
          <div style={styles.left}>
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
          </div>

          {/* 右：ログイン状態に応じて切り替え */}
          <div style={styles.right}>
            {!isLoading && me && !isMobile && (
              <div style={styles.email} title={me.display_name ?? me.email}>
                {me.display_name ?? me.email}
              </div>
            )}

            {!isLoading && !me && (
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
    borderBottom: "1px solid var(--headerBorder)",
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
    width: 40,
    height: 40,
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    padding: 0,
  },

  bar: {
    display: "block",
    width: 18,
    height: 2,
    borderRadius: 999,
    background: "var(--menuLine)",
    margin: "2px 0",
  },
};
