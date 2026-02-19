import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { updateMe } from "../api/auth";
import { useAuth } from "../features/auth/useAuth";
import { AVATAR_ICON_OPTIONS, avatarIconPath } from "../features/profile/avatarIcons";

import "./ProfilePage.css";

export default function ProfilePage() {
  const { me, refresh } = useAuth();

  const initial = useMemo(() => me?.display_name ?? "", [me?.display_name]);
  const [displayName, setDisplayName] = useState(initial);
  const [avatarIcon, setAvatarIcon] = useState(me?.avatar_icon ?? "note_blue");
  const [avatarImageUrl, setAvatarImageUrl] = useState(me?.avatar_image_url ?? "");
  const [publicProfileEnabled, setPublicProfileEnabled] = useState(me?.public_profile_enabled ?? false);
  const [rankingParticipationEnabled, setRankingParticipationEnabled] = useState(
    me?.ranking_participation_enabled ?? false
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    setDisplayName(initial);
    setAvatarIcon(me?.avatar_icon ?? "note_blue");
    setAvatarImageUrl(me?.avatar_image_url ?? "");
    setPublicProfileEnabled(me?.public_profile_enabled ?? false);
    setRankingParticipationEnabled(me?.ranking_participation_enabled ?? false);
  }, [initial, me?.avatar_icon, me?.avatar_image_url, me?.public_profile_enabled, me?.ranking_participation_enabled]);

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
      const payload: {
        display_name?: string;
        avatar_icon: string;
        avatar_image_url?: string;
        public_profile_enabled: boolean;
        ranking_participation_enabled: boolean;
      } = {
        avatar_icon: avatarIcon,
        public_profile_enabled: publicProfileEnabled,
        ranking_participation_enabled: rankingParticipationEnabled,
      };
      if (canSave) payload.display_name = displayName;
      payload.avatar_image_url = avatarImageUrl.trim() || "";

      const updated = await updateMe(payload);

      // API返却値をそのまま反映し、保存直後のON/OFF戻りを防ぐ
      setDisplayName(updated.display_name ?? "");
      setAvatarIcon(updated.avatar_icon ?? "note_blue");
      setAvatarImageUrl(updated.avatar_image_url ?? "");
      setPublicProfileEnabled(updated.public_profile_enabled);
      setRankingParticipationEnabled(updated.ranking_participation_enabled);

      // AuthContextの再取得は失敗しても画面状態は維持する
      try {
        await refresh();
      } catch {
        // no-op
      }

      if (!canSave) {
        alert("公開設定を保存しました（表示名は30文字以内のため未更新です）");
      } else {
        alert("保存しました");
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = displayName.trim().length <= 30;
  const canSavePassword = currentPassword.length > 0 && newPassword.length > 0 && newPassword === newPasswordConfirm;

  const onSavePassword = async () => {
    if (!canSavePassword) return;
    setIsSavingPassword(true);
    try {
      await updateMe({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: newPasswordConfirm,
      });
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      try {
        await refresh();
      } catch {
        // no-op
      }
      alert("パスワードを変更しました");
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "パスワード変更に失敗しました");
    } finally {
      setIsSavingPassword(false);
    }
  };
  const onPickAvatarFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("画像ファイルを選択してください。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      if (!value) return;
      setAvatarImageUrl(value);
    };
    reader.readAsDataURL(file);
  };

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

        <details className="profilePage__passwordAccordion">
          <summary className="profilePage__passwordSummary">パスワードを再設定する</summary>
          <div className="profilePage__passwordBody">
            <label className="profilePage__label">
              <div className="profilePage__k">現在のパスワード</div>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="profilePage__input"
                autoComplete="current-password"
              />
            </label>
            <label className="profilePage__label">
              <div className="profilePage__k">新しいパスワード</div>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="profilePage__input"
                autoComplete="new-password"
              />
            </label>
            <label className="profilePage__label">
              <div className="profilePage__k">新しいパスワード（確認）</div>
              <input
                type="password"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                className="profilePage__input"
                autoComplete="new-password"
              />
              {!canSavePassword &&
                (currentPassword.length > 0 || newPassword.length > 0 || newPasswordConfirm.length > 0) && (
                  <div className="profilePage__hint">入力を確認してください（3項目必須・確認一致）</div>
                )}
            </label>
            <button
              type="button"
              onClick={onSavePassword}
              disabled={!canSavePassword || isSavingPassword}
              className="profilePage__saveBtn profilePage__saveBtn--secondary"
            >
              {isSavingPassword ? "変更中…" : "パスワードを変更"}
            </button>
          </div>
        </details>

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

        <div className="profilePage__hr" />

        <div className="profilePage__label">
          <div className="profilePage__k">アイコン</div>
          <div className="profilePage__avatarPreview">
            <img
              src={avatarIconPath(avatarIcon, avatarImageUrl)}
              alt="現在のアイコン"
              className="profilePage__avatarPreviewImg"
            />
          </div>
          <div className="profilePage__avatarCustom">
            <div className="profilePage__hint">自由設定: 画像URLを貼るか、端末画像を選択できます。</div>
            <input
              value={avatarImageUrl}
              onChange={(e) => setAvatarImageUrl(e.target.value)}
              className="profilePage__input"
              placeholder="https://... または data:image/... "
            />
            <div className="profilePage__avatarActions">
              <label className="profilePage__avatarFileBtn">
                画像を選択
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPickAvatarFile(e.target.files?.[0] ?? null)}
                  className="profilePage__avatarFileInput"
                />
              </label>
              <button
                type="button"
                className="profilePage__avatarResetBtn"
                onClick={() => setAvatarImageUrl("")}
              >
                カスタム画像を解除
              </button>
            </div>
          </div>
          <div className="profilePage__avatarGrid">
            {AVATAR_ICON_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={`profilePage__avatarBtn ${avatarIcon === opt.key ? "is-active" : ""}`}
                onClick={() => setAvatarIcon(opt.key)}
              >
                <img src={avatarIconPath(opt.key)} alt={opt.label} className="profilePage__avatarBtnImg" />
              </button>
            ))}
          </div>
        </div>

        <div className="profilePage__hr" />

        <div className="profilePage__toggleRow">
          <div>
            <div className="profilePage__k">コミュニティからプロフィール閲覧可能にする</div>
            <div className="profilePage__hint">ONでコミュニティ投稿からあなたのプロフィールを閲覧できます</div>
          </div>
          <label className="profilePage__switch">
            <input
              type="checkbox"
              checked={publicProfileEnabled}
              onChange={(e) => setPublicProfileEnabled(e.target.checked)}
            />
            <span>{publicProfileEnabled ? "ON" : "OFF"}</span>
          </label>
        </div>

        <div className="profilePage__toggleRow">
          <div>
            <div className="profilePage__k">ランキングに参加する</div>
            <div className="profilePage__hint">ONでコミュニティランキング（AI貢献/連続日数/直近7日練習時間）に表示されます</div>
          </div>
          <label className="profilePage__switch">
            <input
              type="checkbox"
              checked={rankingParticipationEnabled}
              onChange={(e) => setRankingParticipationEnabled(e.target.checked)}
            />
            <span>{rankingParticipationEnabled ? "ON" : "OFF"}</span>
          </label>
        </div>

        <div className="profilePage__previewCard">
          <div className="profilePage__k">公開プロフィールの見え方</div>
          <div className="profilePage__hint">
            コミュニティでは「アイコン / 名前 / Lv / 連続日数 / XP / バッジ / AI貢献度」が表示されます。
          </div>
          <Link
            to={`/community/profile/${me.id}`}
            className={`profilePage__previewLink ${publicProfileEnabled ? "" : "is-disabled"}`}
            aria-disabled={!publicProfileEnabled}
            onClick={(e) => {
              if (!publicProfileEnabled) e.preventDefault();
            }}
          >
            公開プロフィールを確認する
          </Link>
        </div>

        <div className="profilePage__hr" />

        <div className="profilePage__contribution">
          <div className="profilePage__awardIcon" aria-hidden="true">🏅</div>
          <div>
          <div className="profilePage__contributionValue">
            あなたのデータは <span className="profilePage__contributionCount">{me.ai_contribution_count}回</span> AI改善根拠に使われました
          </div>
          <div className="profilePage__contributionHelp">
            AIおすすめ生成時に、あなたのコミュニティ投稿が根拠として採用された回数です。
            同じおすすめ内で複数回使われても1回として数えます。
          </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="profilePage__saveBtn"
        >
          {isSaving ? "保存中…" : "保存"}
        </button>

        <div className="profilePage__note">空欄で保存すると「未設定」になります。</div>
      </section>
    </div>
  );
}
