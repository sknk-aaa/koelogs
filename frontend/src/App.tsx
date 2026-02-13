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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppHeader title="Training Log" />
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
      </AuthProvider>
    </BrowserRouter>
  );
}
