import { Outlet, useLocation } from "react-router-dom";
import AppHeader from "./AppHeader";
import AppFooterTabs from "./AppFooterTabs";

function titleFromPath(pathname: string) {
  if (pathname.startsWith("/training")) return "トレーニング";
  if (pathname.startsWith("/insights")) return "分析";
  // /log, /log/new もまとめてログ扱い
  return "練習ログ";
}

export default function AppLayout() {
  const { pathname } = useLocation();
  const title = titleFromPath(pathname);

  return (
    <div style={styles.page}>
      <AppHeader title={title} />

      {/* フッター固定なので下に余白を作る */}
      <main style={styles.main}>
        <Outlet />
      </main>

      <AppFooterTabs />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(1200px 800px at 50% -200px, #ffd1d6 0%, #f7f7fb 45%, #f2f2f7 100%)",
  },
  main: {
    paddingBottom: "calc(64px + env(safe-area-inset-bottom) + 12px)",
  },
};