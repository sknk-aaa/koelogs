// frontend/src/App.tsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./features/auth/AuthProvider";
import RequireAuth from "./features/auth/RequireAuth";
import AppLayout from "./components/AppLayout";

import LogPage from "./pages/LogPage";
import LogNewPage from "./pages/LogNewPage";
import TrainingPage from "./pages/TrainingPage";
import InsightsPage from "./pages/InsightsPage";
import InsightsTimePage from "./pages/InsightsTimePage";
import InsightsMenusPage from "./pages/InsightsMenusPage";
import InsightsNotesPage from "./pages/InsightsNotesPage";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import SettingsPage from "./pages/SettingsPage";
import AiSettingsPage from "./pages/AiSettingsPage";
import ProfilePage from "./pages/ProfilePage";
import MyPage from "./pages/MyPage";
import AiChatPage from "./pages/AiChatPage";
import CommunityPage from "./pages/CommunityPage";
import CommunityProfilePage from "./pages/CommunityProfilePage";
import CommunityRankingPage from "./pages/CommunityRankingPage";
import HelpGuidePage from "./pages/HelpGuidePage";
import HelpAboutPage from "./pages/HelpAboutPage";
import HelpContactPage from "./pages/HelpContactPage";
import PremiumPlanPage from "./pages/PremiumPlanPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/log" replace />} />

          {/* 公開ページ（レイアウト外） */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* 共通ヘッダー/フッター */}
          <Route element={<AppLayout />}>
            {/* 公開ページ */}
            <Route path="/log" element={<LogPage />} />
            <Route path="/training" element={<TrainingPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/insights/time" element={<InsightsTimePage />} />
            <Route path="/insights/menus" element={<InsightsMenusPage />} />
            <Route path="/insights/notes" element={<InsightsNotesPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/community/rankings" element={<CommunityRankingPage />} />
            <Route path="/community/profile/:userId" element={<CommunityProfilePage />} />
            <Route path="/premium" element={<PremiumPlanPage />} />

            {/* 認証が必要なページ */}
            <Route element={<RequireAuth />}>
              <Route path="/log/new" element={<LogNewPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/ai" element={<AiSettingsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/mypage" element={<MyPage />} />
              <Route path="/chat" element={<AiChatPage />} />
            </Route>

            {/* ヘルプはログイン不要 */}
            <Route path="/help/guide" element={<HelpGuidePage />} />
            <Route path="/help/about" element={<HelpAboutPage />} />
            <Route path="/help/contact" element={<HelpContactPage />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div style={styles.wrap}>
      <h1 style={styles.h1}>ページが見つかりません</h1>
      <p style={styles.p}>URLをご確認ください。</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    padding: "16px 14px 90px",
    maxWidth: 920,
    margin: "0 auto",
    color: "#111",
  },
  h1: { fontSize: 18, fontWeight: 900, margin: "6px 0 8px" },
  p: { fontSize: 13, opacity: 0.8, lineHeight: 1.6 },
};
