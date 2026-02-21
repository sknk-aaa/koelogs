import { Outlet, useLocation } from "react-router-dom";
import AppHeader from "./AppHeader";
import AppFooterTabs from "./AppFooterTabs";

function titleFromPath(pathname: string) {
  if (pathname.startsWith("/training")) return "トレーニング";
  if (pathname.startsWith("/insights")) return "分析";
  if (pathname.startsWith("/community/rankings")) return "ランキング";
  if (pathname.startsWith("/community")) return "コミュニティ";
  if (pathname.startsWith("/mypage")) return "マイページ";
  if (pathname.startsWith("/settings")) return "設定";
  if (pathname.startsWith("/account") || pathname.startsWith("/profile")) return "アカウント";
  if (pathname.startsWith("/help")) return "ヘルプ";
  return "練習ログ";
}

export default function AppLayout() {
  const { pathname } = useLocation();
  const title = titleFromPath(pathname);
  const hideFooterTabs = pathname.startsWith("/log/new");

  return (
    <div style={styles.page}>
      <AppHeader title={title} />
      <main style={styles.main}>
        <Outlet />
      </main>
      {!hideFooterTabs && <AppFooterTabs />}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    overflowX: "clip",
    background:
      "radial-gradient(1200px 800px at 50% -200px, var(--bgTop) 0%, var(--bgMid) 45%, var(--bgBottom) 100%)",
  },
  main: {
    paddingBottom: "calc(64px + env(safe-area-inset-bottom) + 12px)",
  },
};
