import { useAuth } from "../features/auth/useAuth";

export default function ProfilePage() {
  const { me } = useAuth();

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>プロフィール（表示名）</h1>
      <p style={styles.p}>
        表示名はまだ未実装です。まずはページと導線だけ作っています。
      </p>

      <div style={styles.card}>
        <div style={styles.row}>
          <div style={styles.k}>メール</div>
          <div style={styles.v}>{me?.email ?? "—"}</div>
        </div>

        <div style={styles.hr} />

        <div style={styles.row}>
          <div style={styles.k}>表示名</div>
          <div style={styles.v}>未実装</div>
        </div>

        <div style={styles.note}>
          次のステップで「users.display_name」をDBに追加し、更新APIを作ればここが完成します。
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "14px 14px 90px", maxWidth: 920, margin: "0 auto", color: "#111" },
  h1: { fontSize: 18, fontWeight: 900, margin: "6px 0 10px" },
  p: { fontSize: 13, opacity: 0.8, lineHeight: 1.6, marginBottom: 12 },
  card: {
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
  },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  k: { fontSize: 13, fontWeight: 800, opacity: 0.75 },
  v: { fontSize: 13, fontWeight: 900 },
  hr: { height: 1, background: "rgba(0,0,0,0.06)", margin: "12px 0" },
  note: { marginTop: 10, fontSize: 12, opacity: 0.7, lineHeight: 1.6 },
};
