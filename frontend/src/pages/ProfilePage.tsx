import { useMemo, useState } from "react";
import { updateMeDisplayName } from "../api/auth";
import { useAuth } from "../features/auth/useAuth";

export default function ProfilePage() {
  const { me, refresh } = useAuth();

  const initial = useMemo(() => me?.display_name ?? "", [me?.display_name]);
  const [displayName, setDisplayName] = useState(initial);
  const [isSaving, setIsSaving] = useState(false);

  if (!me) {
    return (
      <div style={styles.page}>
        <h1 style={styles.h1}>プロフィール（表示名）</h1>
        <p style={styles.p}>ログインしてください。</p>
      </div>
    );
  }

  const onSave = async () => {
    setIsSaving(true);
    try {
      await updateMeDisplayName(displayName);
      await refresh();
      alert("保存しました");
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = displayName.trim().length <= 30;

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>プロフィール（表示名）</h1>

      <div style={styles.card}>
        <div style={styles.row}>
          <div style={styles.k}>メール</div>
          <div style={styles.v}>{me.email}</div>
        </div>

        <div style={styles.hr} />

        <label style={styles.label}>
          <div style={styles.k}>表示名（30文字まで / 未設定可）</div>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={styles.input}
            maxLength={60} // 入力側は余裕。サーバで30制限。
          />
          <div style={styles.hint}>
            現在：{displayName.trim().length} / 30
            {!canSave && "（30文字以内にしてください）"}
          </div>
        </label>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || !canSave}
          style={{
            ...styles.btn,
            ...(isSaving || !canSave ? styles.btnDisabled : null),
          }}
        >
          {isSaving ? "保存中…" : "保存"}
        </button>

        <div style={styles.note}>
          空欄で保存すると「未設定」になります。
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: "14px 14px 90px",
    maxWidth: 920,
    margin: "0 auto",
    color: "#111",
  },
  h1: { fontSize: 18, fontWeight: 900, margin: "6px 0 10px" },
  p: { fontSize: 13, opacity: 0.8, lineHeight: 1.6, marginBottom: 12 },
  card: {
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  k: { fontSize: 13, fontWeight: 800, opacity: 0.75 },
  v: { fontSize: 13, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis" },
  hr: { height: 1, background: "rgba(0,0,0,0.06)", margin: "12px 0" },
  label: { display: "block" },
  input: {
    width: "100%",
    marginTop: 8,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    outline: "none",
    fontSize: 14,
    fontWeight: 700,
  },
  hint: { marginTop: 6, fontSize: 12, opacity: 0.65 },
  btn: {
    width: "100%",
    marginTop: 12,
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(255,255,255,0.85)",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 900,
  },
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  note: { marginTop: 10, fontSize: 12, opacity: 0.7, lineHeight: 1.6 },
};
