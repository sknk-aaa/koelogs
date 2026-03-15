// frontend/src/App.tsx
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./features/auth/AuthProvider";
import RequireAuth from "./features/auth/RequireAuth";
import AppLayout from "./components/AppLayout";

const LogPage = lazy(() => import("./pages/LogPage"));
const LogNewPage = lazy(() => import("./pages/LogNewPage"));
const TrainingPage = lazy(() => import("./pages/TrainingPage"));
const InsightsPage = lazy(() => import("./pages/InsightsPage"));
const InsightsTimePage = lazy(() => import("./pages/InsightsTimePage"));
const LogNotesPage = lazy(() => import("./pages/LogNotesPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AiSettingsPage = lazy(() => import("./pages/AiSettingsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const MyPage = lazy(() => import("./pages/MyPage"));
const AiChatPage = lazy(() => import("./pages/AiChatPage"));
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const CommunityTopicDetailPage = lazy(() => import("./pages/CommunityTopicDetailPage"));
const CommunityProfilePage = lazy(() => import("./pages/CommunityProfilePage"));
const CommunityRankingPage = lazy(() => import("./pages/CommunityRankingPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const HelpGuidePage = lazy(() => import("./pages/HelpGuidePage"));
const HelpAboutPage = lazy(() => import("./pages/HelpAboutPage"));
const HelpContactPage = lazy(() => import("./pages/HelpContactPage"));
const PlanPage = lazy(() => import("./pages/PlanPage"));
const PremiumPlanPage = lazy(() => import("./pages/PremiumPlanPage"));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/" element={<Navigate to="/log" replace />} />

            {/* 公開ページ（レイアウト外） */}
            <Route path="/lp" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* 共通ヘッダー/フッター */}
            <Route element={<AppLayout />}>
              {/* 公開ページ */}
              <Route path="/log" element={<LogPage />} />
              <Route path="/training" element={<TrainingPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/insights/time" element={<InsightsTimePage />} />
              <Route path="/log/notes" element={<LogNotesPage />} />
              <Route path="/insights/notes" element={<Navigate to="/log/notes" replace />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/community/topics/:topicId" element={<CommunityTopicDetailPage />} />
              <Route path="/community/rankings" element={<CommunityRankingPage />} />
              <Route path="/community/profile/:userId" element={<CommunityProfilePage />} />
              <Route path="/chat" element={<AiChatPage />} />
              <Route path="/premium" element={<PremiumPlanPage />} />

              {/* 認証が必要なページ */}
              <Route element={<RequireAuth />}>
                <Route path="/log/new" element={<LogNewPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/settings/ai" element={<AiSettingsPage />} />
                <Route path="/plan" element={<PlanPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/mypage" element={<MyPage />} />
              </Route>

              {/* ヘルプはログイン不要 */}
              <Route path="/help/guide" element={<HelpGuidePage />} />
              <Route path="/help/about" element={<HelpAboutPage />} />
              <Route path="/help/contact" element={<HelpContactPage />} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

function RouteLoading() {
  return (
    <div style={loadingStyles.wrap}>
      <div style={loadingStyles.card}>読み込み中...</div>
    </div>
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

const loadingStyles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "24px 16px",
    background: "#f5f8fb",
  },
  card: {
    minWidth: 160,
    padding: "14px 18px",
    borderRadius: 14,
    background: "#ffffff",
    color: "#304854",
    fontSize: 14,
    fontWeight: 700,
    textAlign: "center",
    boxShadow: "0 8px 28px rgba(15, 23, 42, 0.08)",
  },
};
