import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";
import HamburgerDrawer, { type DrawerSection } from "./HamburgerDrawer";
import { useCallback} from "react";

type Props = {
  title: string;
};

export default function AppHeader({ title }: Props) {
  const { me, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);

  // ルート遷移したら閉じる（戻る/リンク移動含む）
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
    () => [
      {
        title: "設定",
        items: [{ label: "設定", onClick: () => navigate("/settings") }],
      },
      {
        title: "アカウント",
        items: [
          { label: "プロフィール（表示名）", onClick: () => navigate("/account/profile") },
          {
            label: "ログアウト",
            variant: "danger",
            onClick: onLogout,
            disabled: !me,
          },
        ],
      },
      {
        title: "ヘルプ",
        items: [
          { label: "使い方", onClick: () => navigate("/help/guide") },
          { label: "このアプリについて", onClick: () => navigate("/help/about") },
          { label: "お問い合わせ", onClick: () => navigate("/help/contact") },
        ],
      },
    ],
    [navigate, onLogout, me]
  );

  return (
    <>
      <header style={styles.header}>
        <div style={styles.left}>
          <div style={styles.title} title={title}>
            {title}
          </div>
        </div>

        <div style={styles.right}>
          {!isLoading && me && (
            <div style={styles.email} title={me.email}>
              {me.email}
            </div>
          )}

          {/* ✅ ハンバーガー */}
          <button
            type="button"
            aria-label="メニューを開く"
            onClick={() => {
              console.log("hamburger clicked");
              setOpen(true);
            }}
            style={styles.menuBtn}
          >
            <span style={styles.bar} />
            <span style={styles.bar} />
            <span style={styles.bar} />
          </button>
        </div>
      </header>

      {/* ✅ 重要：header の「外」に出す（クリップ/スタッキング問題を回避） */}
      <HamburgerDrawer
        open={open}
        onClose={() => setOpen(false)}
        headerTitle="メニュー"
        headerSub={isLoading ? "読み込み中…" : me ? "ログイン中" : "未ログイン"}
        sections={sections}
      />
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    height: 56,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 14px",
    position: "sticky",
    top: 0,
    zIndex: 80,
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: 900,
    letterSpacing: 0.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: 10,
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
