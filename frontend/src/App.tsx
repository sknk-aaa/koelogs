import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import TrainingPage from "./pages/TrainingPage";
import LogPage from "./pages/LogPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/log" replace />} />

        {/* 共通ヘッダー/フッターを適用する範囲 */}
        <Route element={<AppLayout />}>
          <Route path="/log" element={<LogPage />} />

          <Route path="/training" element={<TrainingPage />} />

          {/* Step4-2以降で実装 */}
          <Route path="/log/new" element={<div style={{ padding: 16 }}>Log New Page (TODO)</div>} />
          <Route path="/insights" element={<div style={{ padding: 16 }}>Insights Page (TODO)</div>} />

          <Route path="*" element={<Navigate to="/log" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
