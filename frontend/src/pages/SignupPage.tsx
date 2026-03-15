import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AuthHeader from "../components/AuthHeader";
import BrandLogo from "../components/BrandLogo";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { fetchMe } from "../api/auth";
import { useAuth } from "../features/auth/useAuth";
import {
  fetchBeginnerMissionGate,
  hasSeenFirstLoginLanding,
  markFirstLoginLandingSeen,
} from "../features/missions/beginnerMissionGate";
import { saveTutorialStage } from "../features/tutorial/tutorialFlow";
import { isValidEmailFormat, normalizeEmail } from "../utils/email";

import "./AuthPages.css";

export default function SignupPage() {
  const { loginWithGoogle, signup } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) {
        throw new Error("メールアドレスを入力してください。");
      }
      if (!isValidEmailFormat(normalizedEmail)) {
        throw new Error("メールアドレスの形式が正しくありません。");
      }
      if (!password) {
        throw new Error("パスワードを入力してください。");
      }
      if (password !== passwordConfirmation) {
        throw new Error("確認用パスワードが一致しません。");
      }
      if (!termsAccepted) {
        throw new Error("利用規約とプライバシーポリシーへの同意が必要です。");
      }

      const result = await signup(normalizedEmail, password, passwordConfirmation);
      navigate("/login", {
        replace: true,
        state: {
          notice: result.message,
          email: normalizedEmail,
        },
      });
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

  const onGoogleCredential = async (credential: string) => {
    if (!termsAccepted) {
      setError("Googleで登録するには、利用規約とプライバシーポリシーへの同意が必要です。");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await loginWithGoogle(credential);
      const meAfterLogin = await fetchMe();
      if (meAfterLogin && !hasSeenFirstLoginLanding(meAfterLogin.id)) {
        const beginnerGate = await fetchBeginnerMissionGate();
        markFirstLoginLandingSeen(meAfterLogin.id);
        if (beginnerGate && !beginnerGate.completed) {
          saveTutorialStage(meAfterLogin.id, "log_welcome");
        }
      }
      navigate("/log", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Googleログインに失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="authPage authPage--signup">
      <div className="authPage__bg" aria-hidden="true" />
      <AuthHeader />

      <div className="authPage__shell">
        <section className="authPage__hero">
          <div className="authPage__brand">
            <BrandLogo alt="Koelogs" className="authPage__brandImage" />
          </div>
        </section>

        <section className="authPage__card">
          <div className="authPage__cardHeader">
            <h1 className="authPage__cardTitle">新規登録</h1>
            <p className="authPage__cardSub">アカウントを作成して記録を始めましょう。</p>
          </div>

          <form onSubmit={onSubmit} className="authPage__form">
            <GoogleSignInButton
              text="signup_with"
              onCredential={onGoogleCredential}
              disabled={submitting || !termsAccepted}
            />

            <div className="authPage__field">
              <label className="authPage__label">Email</label>
              <input
                type="email"
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

            <label className="authPage__consent">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="authPage__consentCheckbox"
              />
              <span className="authPage__consentText">
                <Link to="/help/terms" target="_blank" rel="noreferrer">
                  利用規約
                </Link>
                {" "}
                と
                {" "}
                <Link to="/help/privacy" target="_blank" rel="noreferrer">
                  プライバシーポリシー
                </Link>
                {" "}
                に同意します
              </span>
            </label>

            {error && <div className="authPage__error">{error}</div>}

            <button type="submit" disabled={submitting} className="authPage__submit">
              {submitting ? "登録中..." : "新規登録"}
            </button>

            <p className="authPage__support">メール登録では確認メールを送信します。Google を使う場合はそのままログインできます。</p>
          </form>

          <div className="authPage__link">
            登録済みの方はこちら → <Link to="/login">ログイン</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
