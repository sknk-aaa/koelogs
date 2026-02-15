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

export default function AppHeader({ title }: Props) {
  const { me, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);

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

  const onContact = () => {
    const mailto = buildMailto();
    window.location.href = mailto;
  };

  const sections: DrawerSection[] = useMemo(
    () => [
      {
        title: "設定",
        items: [
          {
            label: "設定",
            to: "/settings",
            match: "exact",
            onClick: () => navigate("/settings"),
          },
        ],
      },
      {
        title: "アカウント",
        items: [
          {
            label: "プロフィール（表示名）",
            to: "/account/profile",
            match: "exact",
            onClick: () => navigate("/account/profile"),
          },
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
          // ✅ ページ遷移せず、mailto を開く
          {
            label: "お問い合わせ（メール）",
            match: "exact",
            onClick: onContact,
          },
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
            <div style={styles.email} title={me.display_name ?? me.email}>
              {me.display_name ?? me.email}
            </div>
          )}

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
  left: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  title: {
    fontSize: 16,
    fontWeight: 900,
    letterSpacing: 0.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  right: { display: "flex", alignItems: "center", gap: 10 },
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
