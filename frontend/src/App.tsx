import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LogPage from "./pages/LogPage";
import LogNewPage from "./pages/LogNewPage";
import TrainingPage from "./pages/TrainingPage";
import InsightsPage from "./pages/InsightsPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";

import { AuthProvider } from "./features/auth/AuthProvider";
import RequireAuth from "./features/auth/RequireAuth";
import AppHeader from "./components/AppHeader";
import AppFooter from "./components/AppFooterTabs";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <AppHeader title="Training Log" />

          <div style={{ flex: 1, paddingBottom: 65 }}>
            <Routes>
              <Route path="/" element={<Navigate to="/log" replace />} />

              {/* 公開ページ */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              {/* 認証が必要なページ */}
              <Route element={<RequireAuth />}>
                <Route path="/log" element={<LogPage />} />
                <Route path="/log/new" element={<LogNewPage />} />
                <Route path="/training" element={<TrainingPage />} />
                <Route path="/insights" element={<InsightsPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/log" replace />} />
            </Routes>
          </div>

          <AppFooter />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
