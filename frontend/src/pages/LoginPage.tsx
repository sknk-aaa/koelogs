import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../features/auth/useAuth";

import "./AuthPages.css";

type LoginLocationState = { fromPath?: string };

export default function LoginPage() {
  const { login, me } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (me) {
    navigate("/log", { replace: true });
  }

  const state = location.state as LoginLocationState | null;
  const from = state?.fromPath ?? "/log";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("ログインに失敗しました");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="authPage">
      <div className="authPage__bg" aria-hidden="true" />

      <div className="authPage__shell">
        <section className="card authPage__hero">
          <div className="authPage__kicker">Welcome Back</div>
          <h1 className="authPage__title">ログイン</h1>
          <p className="authPage__sub">記録・分析・トレーニングの続きから再開できます。</p>
          <div className="authPage__chips">
            <div className="authPage__chip">練習ログ管理</div>
            <div className="authPage__chip">音源トレーニング</div>
            <div className="authPage__chip">推移分析</div>
          </div>
        </section>

        <section className="card authPage__card">
          <form onSubmit={onSubmit} className="authPage__form">
            <div className="authPage__field">
              <label className="authPage__label">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="authPage__input"
              />
            </div>

            <div className="authPage__field">
              <label className="authPage__label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="authPage__input"
              />
            </div>

            {error && <div className="authPage__error">{error}</div>}

            <button type="submit" disabled={submitting} className="authPage__submit">
              {submitting ? "ログイン中..." : "ログイン"}
            </button>

            <p className="authPage__support">毎日の記録は自動で日付単位に整理されます。</p>
          </form>

          <div className="authPage__link">
            アカウントが無い？ <Link to="/signup">新規登録</Link>
          </div>
        </section>

        <section className="card authPage__valueCard">
          <div className="authPage__valueTitle">voice-app でできること</div>
          <ul className="authPage__valueList">
            <li>その日の練習メニューと時間を素早く記録</li>
            <li>スケール音源を選んで反復トレーニング</li>
            <li>継続状況や頻度を可視化して改善</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
