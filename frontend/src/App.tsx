import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import TrainingPage from "./pages/TrainingPage";
import LoginPage from "./pages/LoginPage";
import LogPage from "./pages/LogPage";
import RequireAuth from "./features/auth/RequireAuth";
import { AuthProvider } from "./features/auth/AuthProvider";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/log" replace />} />

          {/* ログイン画面はLayout外 */}
          <Route path="/login" element={<LoginPage />} />

          {/* 共通ヘッダー/フッターを適用する範囲 */}
          <Route element={<AppLayout />}>
            {/* ここから下をログイン必須にする */}
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
