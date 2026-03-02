import { Outlet, useLocation } from "react-router-dom";
import AppHeader from "./AppHeader";
import AppFooterTabs from "./AppFooterTabs";
import BadgeUnlockPopup from "./BadgeUnlockPopup";
import LevelUpToast from "./LevelUpToast";
import { PageContainer } from "../features/ui";

export default function AppLayout() {
  const { pathname } = useLocation();
  const isPremiumPage = pathname.startsWith("/premium");
  const hideFooterTabs = pathname.startsWith("/log/new") || pathname.startsWith("/chat") || isPremiumPage;
  const hideHeader = pathname.startsWith("/chat") || isPremiumPage;

  return (
    <div style={styles.page}>
      {!hideHeader && <AppHeader />}
      <main style={{ ...styles.main, paddingBottom: isPremiumPage ? 0 : styles.main.paddingBottom }}>
        {isPremiumPage ? (
          <Outlet />
        ) : (
          <PageContainer>
            <Outlet />
          </PageContainer>
        )}
      </main>
      {!hideFooterTabs && <AppFooterTabs />}
      <LevelUpToast />
      <BadgeUnlockPopup />
    </div>
  );
}
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    overflowX: "clip",
  },
  main: {
    paddingBottom: "calc(64px + env(safe-area-inset-bottom) + 12px)",
  },
};
