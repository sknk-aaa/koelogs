import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import GoogleSignInButton from "../components/GoogleSignInButton";
import { fetchMe, requestEmailVerification, requestPasswordReset, resetPassword, verifyEmail } from "../api/auth";
import { useAuth } from "../features/auth/useAuth";
import {
  fetchBeginnerMissionGate,
  hasSeenFirstLoginLanding,
  markFirstLoginLandingSeen,
} from "../features/missions/beginnerMissionGate";
import { saveTutorialStage } from "../features/tutorial/tutorialFlow";
import { isValidEmailFormat, normalizeEmail } from "../utils/email";

import "./AuthPages.css";

type LoginLocationState = { fromPath?: string; from?: string; notice?: string; email?: string };

export default function LoginPage() {
  const { login, loginWithGoogle, me } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (me) {
      navigate("/log", { replace: true });
    }
  }, [me, navigate]);

  const state = location.state as LoginLocationState | null;
  const from = state?.fromPath ?? state?.from ?? "/log";
  const resetToken = useMemo(() => {
    const value = new URLSearchParams(location.search).get("reset_token");
    return value?.trim() ?? "";
  }, [location.search]);
  const verifyToken = useMemo(() => {
    const value = new URLSearchParams(location.search).get("verify_token");
    return value?.trim() ?? "";
  }, [location.search]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resetRequestEmail, setResetRequestEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [showResetRequest, setShowResetRequest] = useState(false);
  const [resetCompleted, setResetCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  const showResetForm = resetToken.length > 0 && !resetCompleted;

  useEffect(() => {
    if (typeof state?.notice === "string" && state.notice) {
      setNotice(state.notice);
    }
    if (typeof state?.email === "string" && state.email) {
      setEmail(state.email);
      setVerificationEmail(state.email);
    }
  }, [state?.email, state?.notice]);

  useEffect(() => {
    if (!verifyToken) return;
    let cancelled = false;

    (async () => {
      setVerifyingEmail(true);
      setError(null);
      try {
        const message = await verifyEmail(verifyToken);
        if (cancelled) return;
        setNotice(message);
        navigate("/login", { replace: true, state: { notice: message } });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "メール確認に失敗しました");
      } finally {
        if (!cancelled) setVerifyingEmail(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, verifyToken]);

  const finishAuthenticatedNavigation = async (destination: string) => {
    const shouldCheckFirstLanding = destination.startsWith("/log");
    if (shouldCheckFirstLanding) {
      const meAfterLogin = await fetchMe();
      if (meAfterLogin && !hasSeenFirstLoginLanding(meAfterLogin.id)) {
        const beginnerGate = await fetchBeginnerMissionGate();
        markFirstLoginLandingSeen(meAfterLogin.id);
        if (beginnerGate && !beginnerGate.completed && !destination.startsWith("/mypage")) {
          saveTutorialStage(meAfterLogin.id, "log_welcome");
        }
      }
    }

    navigate(destination, { replace: true });
  };

  const onLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

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

      await login(normalizedEmail, password);
      await finishAuthenticatedNavigation(from);
    } catch (err: unknown) {
      const code = err instanceof Error && "code" in err ? (err as Error & { code?: string }).code : undefined;
      if (code === "email_not_verified") {
        setVerificationEmail(normalizeEmail(email));
      }
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("ログインに失敗しました");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onRequestResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const normalizedEmail = normalizeEmail(resetRequestEmail);
      if (!normalizedEmail) {
        throw new Error("メールアドレスを入力してください。");
      }
      if (!isValidEmailFormat(normalizedEmail)) {
        throw new Error("メールアドレスの形式が正しくありません。");
      }
      await requestPasswordReset(normalizedEmail);
      setNotice("入力したメールアドレス宛に、再設定メールを送信しました。");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("メール送信に失敗しました");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      await resetPassword(resetToken, newPassword, newPasswordConfirmation);
      setResetCompleted(true);
      setNotice("パスワードを再設定しました。新しいパスワードでログインしてください。");
      setNewPassword("");
      setNewPasswordConfirmation("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("パスワード再設定に失敗しました");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onResendVerification = async () => {
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const normalizedEmail = normalizeEmail(verificationEmail || email);
      if (!normalizedEmail) {
        throw new Error("確認メールを再送するメールアドレスを入力してください。");
      }
      if (!isValidEmailFormat(normalizedEmail)) {
        throw new Error("メールアドレスの形式が正しくありません。");
      }
      const message = await requestEmailVerification(normalizedEmail);
      setNotice(message);
      setVerificationEmail(normalizedEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "確認メールの再送に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogleCredential = async (credential: string) => {
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      await loginWithGoogle(credential);
      await finishAuthenticatedNavigation(from);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Googleログインに失敗しました");
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
          {showResetForm ? (
            <form onSubmit={onResetPasswordSubmit} className="authPage__form">
              <div className="authPage__field">
                <label className="authPage__label">新しいパスワード</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="authPage__input"
                />
              </div>

              <div className="authPage__field">
                <label className="authPage__label">新しいパスワード（確認）</label>
                <input
                  type="password"
                  value={newPasswordConfirmation}
                  onChange={(e) => setNewPasswordConfirmation(e.target.value)}
                  autoComplete="new-password"
                  className="authPage__input"
                />
              </div>

              {error && <div className="authPage__error">{error}</div>}
              {notice && <div className="authPage__notice">{notice}</div>}

              <button type="submit" disabled={submitting} className="authPage__submit">
                {submitting ? "再設定中..." : "パスワードを再設定"}
              </button>

              <p className="authPage__support">このリンクの有効期限は30分です。</p>
            </form>
          ) : showResetRequest ? (
            <form onSubmit={onRequestResetSubmit} className="authPage__form">
              <div className="authPage__field">
                <label className="authPage__label">Email</label>
                <input
                  type="email"
                  value={resetRequestEmail}
                  onChange={(e) => setResetRequestEmail(e.target.value)}
                  autoComplete="email"
                  className="authPage__input"
                />
              </div>

              {error && <div className="authPage__error">{error}</div>}
              {notice && <div className="authPage__notice">{notice}</div>}

              <button type="submit" disabled={submitting} className="authPage__submit">
                {submitting ? "送信中..." : "再設定メールを送る"}
              </button>

              <button
                type="button"
                className="authPage__ghostButton"
                onClick={() => {
                  setShowResetRequest(false);
                  setError(null);
                  setNotice(null);
                }}
              >
                ログインに戻る
              </button>
            </form>
          ) : (
            <form onSubmit={onLoginSubmit} className="authPage__form">
              <div className="authPage__field">
                <label className="authPage__label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setVerificationEmail("");
                  }}
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
              {notice && <div className="authPage__notice">{notice}</div>}

              <button type="submit" disabled={submitting} className="authPage__submit">
                {submitting ? "ログイン中..." : "ログイン"}
              </button>

              <GoogleSignInButton
                text="signin_with"
                onCredential={onGoogleCredential}
                disabled={submitting || verifyingEmail}
              />

              <div className="authPage__actions">
                <button
                  type="button"
                  className="authPage__ghostButton"
                  onClick={() => {
                    setShowResetRequest(true);
                    setError(null);
                    setNotice(null);
                    setResetRequestEmail(email);
                  }}
                >
                  パスワードを忘れた？
                </button>
                {verificationEmail ? (
                  <button
                    type="button"
                    className="authPage__ghostButton"
                    onClick={onResendVerification}
                    disabled={submitting || verifyingEmail}
                  >
                    確認メールを再送
                  </button>
                ) : null}
              </div>

              <p className="authPage__support">
                {verifyingEmail
                  ? "メールアドレス確認を処理しています..."
                  : "メール確認が完了するとログインできるようになります。"}
              </p>
            </form>
          )}

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
