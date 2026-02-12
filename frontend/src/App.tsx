import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import TrainingPage from "./pages/TrainingPage";
import LogPage from "./pages/LogPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import RequireAuth from "./features/auth/RequireAuth";
import { AuthProvider } from "./features/auth/AuthProvider";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/log" replace />} />

          {/* public（レイアウト外） */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* 共通ヘッダー/フッター */}
          <Route element={<AppLayout />}>
            {/* ログイン必須 */}
            <Route element={<RequireAuth />}>
              <Route path="/log" element={<LogPage />} />
              <Route path="/training" element={<TrainingPage />} />
              <Route path="/log/new" element={<div style={{ padding: 16 }}>Log New Page (TODO)</div>} />
              <Route path="/insights" element={<div style={{ padding: 16 }}>Insights Page (TODO)</div>} />
            </Route>

            <Route path="*" element={<Navigate to="/log" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
