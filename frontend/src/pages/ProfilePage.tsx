import { useEffect, useMemo, useState } from "react";

import { updateMeDisplayName } from "../api/auth";
import { useAuth } from "../features/auth/useAuth";

import "./ProfilePage.css";

export default function ProfilePage() {
  const { me, refresh } = useAuth();

  const initial = useMemo(() => me?.display_name ?? "", [me?.display_name]);
  const [displayName, setDisplayName] = useState(initial);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDisplayName(initial);
  }, [initial]);

  if (!me) {
    return (
      <div className="page profilePage">
        <div className="profilePage__bg" aria-hidden="true" />
        <section className="card profilePage__hero">
          <div className="profilePage__kicker">Profile</div>
          <h1 className="profilePage__title">プロフィール</h1>
          <p className="profilePage__sub">ログインしてください。</p>
        </section>
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
    <div className="page profilePage">
      <div className="profilePage__bg" aria-hidden="true" />

      <section className="card profilePage__hero">
        <div className="profilePage__kicker">Profile</div>
        <h1 className="profilePage__title">プロフィール</h1>
        <p className="profilePage__sub">表示名を更新して、記録画面での表示を整えます。</p>
      </section>

      <section className="card profilePage__card">
        <div className="profilePage__cardTitle">アカウント情報</div>

        <div className="profilePage__row">
          <div className="profilePage__k">メール</div>
          <div className="profilePage__v">{me.email}</div>
        </div>

        <div className="profilePage__hr" />

        <label className="profilePage__label">
          <div className="profilePage__k">表示名（30文字まで / 未設定可）</div>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="profilePage__input"
            maxLength={60}
          />
          <div className="profilePage__hint">
            現在: {displayName.trim().length} / 30
            {!canSave && "（30文字以内にしてください）"}
          </div>
        </label>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || !canSave}
          className="profilePage__saveBtn"
        >
          {isSaving ? "保存中…" : "保存"}
        </button>

        <div className="profilePage__note">空欄で保存すると「未設定」になります。</div>
      </section>
    </div>
  );
}
