import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";

type Props = {
  title: string;
};

export default function AppHeader({ title }: Props) {
  const { me, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (e) {
      console.error(e);
      alert("ログアウトに失敗しました");
    }
  };

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <div style={styles.title}>{title}</div>
      </div>

      <div style={styles.right}>
        {isLoading ? (
          <span style={{ opacity: 0.7, fontSize: 12 }}>...</span>
        ) : me ? (
          <>
            <span style={styles.email}>{me.email}</span>
            <button onClick={onLogout} style={styles.button}>
              Logout
            </button>
          </>
        ) : (
          <div style={styles.linkRow}>
            <Link to="/signup" style={styles.link}>
              Signup
            </Link>
            <Link to="/login" style={styles.link}>
              Login
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    backgroundColor: "red",
    height: 56,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 14px",
    position: "sticky",
    top: 0,
    zIndex: 20,
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: 0.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  email: {
    color: "black",
    fontSize: 12,
    opacity: 0.75,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  linkRow: {
    display: "flex",
    gap: 10,
    fontSize: 13,
  },
  link: {
    textDecoration: "none",
    color: "inherit",
    opacity: 0.9,
    fontWeight: 600,
  },
  button: {
    backgroundColor: "black",
    height: 34,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
};
