import { Outlet, useLocation } from "react-router-dom";
import AppHeader from "./AppHeader";
import AppFooterTabs from "./AppFooterTabs";
import BadgeUnlockPopup from "./BadgeUnlockPopup";
import { PageContainer } from "../features/ui";

export default function AppLayout() {
  const { pathname } = useLocation();
  const hideFooterTabs = pathname.startsWith("/log/new");

  return (
    <div style={styles.page}>
      <AppHeader />
      <main style={styles.main}>
        <PageContainer>
          <Outlet />
        </PageContainer>
      </main>
      {!hideFooterTabs && <AppFooterTabs />}
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
