import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthProvider";
import RequireAuth from "./features/auth/RequireAuth";

import AppLayout from "./components/AppLayout";

import LogPage from "./pages/LogPage";
import LogNewPage from "./pages/LogNewPage";
import TrainingPage from "./pages/TrainingPage";
import InsightsPage from "./pages/InsightsPage";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";

// ✅ Step7 追加ページ
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import HelpGuidePage from "./pages/HelpGuidePage";
import HelpAboutPage from "./pages/HelpAboutPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ルートは /log へ */}
          <Route path="/" element={<Navigate to="/log" replace />} />

          {/* 公開ページ（レイアウト外） */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* 共通ヘッダー/フッター */}
          <Route element={<AppLayout />}>
            {/* 認証が必要なページ */}
            <Route element={<RequireAuth />}>
              <Route path="/log" element={<LogPage />} />
              <Route path="/log/new" element={<LogNewPage />} />
              <Route path="/training" element={<TrainingPage />} />
              <Route path="/insights" element={<InsightsPage />} />

              {/* ✅ Step7：設定/アカウント */}
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/account/profile" element={<ProfilePage />} />
            </Route>

            {/* ✅ Step7：ヘルプは「ログイン不要」にしておく（要件に応じて後でRequireAuth配下に移動OK） */}
            <Route path="/help/guide" element={<HelpGuidePage />} />
            <Route path="/help/about" element={<HelpAboutPage />} />

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
