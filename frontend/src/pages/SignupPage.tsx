import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { fetchMe } from "../api/auth";
import { useAuth } from "../features/auth/useAuth";
import {
  fetchBeginnerMissionGate,
  hasSeenFirstLoginLanding,
  markFirstLoginLandingSeen,
} from "../features/missions/beginnerMissionGate";
import { saveTutorialStage } from "../features/tutorial/tutorialFlow";

import "./AuthPages.css";

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await signup(email, password, passwordConfirmation);
      let destination = "/log";
      const meAfterSignup = await fetchMe();
      if (meAfterSignup && !hasSeenFirstLoginLanding(meAfterSignup.id)) {
        const beginnerGate = await fetchBeginnerMissionGate();
        markFirstLoginLandingSeen(meAfterSignup.id);
        if (beginnerGate && !beginnerGate.completed) {
          saveTutorialStage(meAfterSignup.id, "log_welcome");
        }
      }
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("登録に失敗しました");
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
          <div className="authPage__kicker">Get Started</div>
          <h1 className="authPage__title">新規登録</h1>
          <p className="authPage__sub">最初のアカウントを作成して、練習ログを積み上げましょう。</p>
          <div className="authPage__chips">
            <div className="authPage__chip">無料ではじめる</div>
            <div className="authPage__chip">継続を見える化</div>
            <div className="authPage__chip">AIおすすめ</div>
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
                autoComplete="new-password"
                className="authPage__input"
              />
            </div>

            <div className="authPage__field">
              <label className="authPage__label">Password (confirm)</label>
              <input
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                autoComplete="new-password"
                className="authPage__input"
              />
            </div>

            {error && <div className="authPage__error">{error}</div>}

            <button type="submit" disabled={submitting} className="authPage__submit">
              {submitting ? "登録中..." : "新規登録"}
            </button>

            <p className="authPage__support">登録後すぐにログ作成とトレーニング機能を利用できます。</p>
          </form>

          <div className="authPage__link">
            既にアカウントがある？ <Link to="/login">ログイン</Link>
          </div>
        </section>

        <section className="card authPage__valueCard">
          <div className="authPage__valueTitle">最初の一歩</div>
          <ul className="authPage__valueList">
            <li>アカウント作成後に目標を1つ設定</li>
            <li>今日の練習ログを1件追加</li>
            <li>分析ページで進捗を確認</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
