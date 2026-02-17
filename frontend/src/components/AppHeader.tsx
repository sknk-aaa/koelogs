import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";
import HamburgerDrawer, { type DrawerSection } from "./HamburgerDrawer";

type Props = {
  title: string;
};

function buildMailto() {
  const subject = encodeURIComponent("[voice-app] お問い合わせ");
  const body = encodeURIComponent(
    [
      "以下をご記入ください（可能な範囲でOK）",
      "",
      "■ 種別（不具合 / 要望 / 質問）:",
      "■ 内容:",
      "■ 発生手順（不具合の場合）:",
      "■ 期待する結果:",
      "■ 実際の結果:",
      "■ 環境（OS/ブラウザ）:",
      "",
      "※ 個人情報は書かないでください。",
    ].join("\n")
  );

  // ★必ず差し替え（公開なら捨てアド推奨）
  const to = "your-contact@example.com";
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

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

export default function AppHeader({ title }: Props) {
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

  const onContact = useCallback(() => {
    const mailto = buildMailto();
    window.location.href = mailto;
  }, []);

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
            label: "お問い合わせ（メール）",
            match: "exact",
            onClick: onContact,
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
          ],
        },
        {
          title: "アカウント",
          items: [
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
    [me, navigate, onContact, onLogout]
  );

  const onClickBrand = () => {
    navigate("/log");
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
              voice-app
            </button>
          </div>

          {/* 中央：ページタイトル（左右に影響されず常に中央） */}
          <div style={styles.center} aria-label="ページタイトル" title={title}>
            {title}
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
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
  },

  // ★ sticky の中で absolute 中央を安定させるためのラッパー
  inner: {
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 14px",
    position: "relative",
  },

  left: { display: "flex", alignItems: "center", gap: 10, minWidth: 88 },

  right: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 116,
    justifyContent: "flex-end",
  },

  // ★中央タイトル：画面のど真ん中に固定
  center: {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: 16,
    fontWeight: 900,
    letterSpacing: 0.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "60vw",
    pointerEvents: "none",
  },

  // アプリ名ボタン（リンク風）
  brandBtn: {
    fontSize: 14,
    fontWeight: 900,
    letterSpacing: 0.2,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: "8px 10px",
    borderRadius: 12,
  },

  email: {
    color: "#111",
    fontSize: 12,
    opacity: 0.7,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 220,
  },
  authBtn: {
    height: 34,
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(255,255,255,0.85)",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 900,
    padding: "0 10px",
    whiteSpace: "nowrap",
  },
  authBtnPrimary: {
    borderColor: "color-mix(in srgb, var(--accent) 44%, rgba(0,0,0,0.1))",
    background: "color-mix(in srgb, var(--accent) 14%, white)",
  },

  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(255,255,255,0.85)",
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
    background: "rgba(0,0,0,0.78)",
    margin: "2px 0",
  },
};
