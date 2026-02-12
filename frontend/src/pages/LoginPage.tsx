import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";

export default function LoginPage() {
  const { login, me } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 既にログイン済みなら /log へ逃がす（無限ループ防止）
  if (me) {
    navigate("/log", { replace: true });
  }

type LoginLocationState = { fromPath?: string };
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
    <div style={{ padding: 16, maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Login</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 13, opacity: 0.75, marginBottom: 6 }}>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            style={{
              width: "100%",
              height: 40,
              padding: "0 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, opacity: 0.75, marginBottom: 6 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            style={{
              width: "100%",
              height: 40,
              padding: "0 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
            }}
          />
        </div>

        {error && <div style={{ color: "#b00020" }}>{error}</div>}

        <button type="submit" disabled={submitting} style={{ height: 42, borderRadius: 12, border: "none", cursor: "pointer" }}>
          {submitting ? "Logging in..." : "Login"}
        </button>
      </form>

      <div style={{ marginTop: 12, fontSize: 13, opacity: 0.8 }}>
        アカウントが無い？ <Link to="/signup">Signup</Link>
      </div>
    </div>
  );
}
