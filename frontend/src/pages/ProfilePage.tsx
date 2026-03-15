import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { updateMe } from "../api/auth";
import { useAuth } from "../features/auth/useAuth";
import { avatarIconPath } from "../features/profile/avatarIcons";

import "./ProfilePage.css";

const BILLING_CYCLE_LABEL = {
  monthly: "Premium 1か月プラン",
  quarterly: "Premium 3か月プラン",
} as const;

function renderProfileSectionIcon(kind: "account" | "identity" | "plan" | "visibility" | "contribution"): React.ReactNode {
  if (kind === "account") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <circle cx="12" cy="8.3" r="3.3" />
        <path d="M6.8 18c.5-2.6 2.6-4.4 5.2-4.4s4.7 1.8 5.2 4.4" />
      </svg>
    );
  }
  if (kind === "identity") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M6.8 6.2h10.4" />
        <path d="M6.8 11h10.4" />
        <path className="accent" d="M6.8 15.8h7.2" />
      </svg>
    );
  }
  if (kind === "plan") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M5.5 8.5 12 4l6.5 4.5" />
        <path d="M7 10.2V18h10v-7.8" />
        <path className="accent" d="M9.5 13h5" />
      </svg>
    );
  }
  if (kind === "visibility") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M3.8 12s3-5 8.2-5 8.2 5 8.2 5-3 5-8.2 5-8.2-5-8.2-5Z" />
        <circle className="accent" cx="12" cy="12" r="2.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M12 4.4 13.8 8l4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L6.2 8.6l4-.6Z" />
    </svg>
  );
}

function formatBillingDate(value: string | null | undefined): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(date);
}

export default function ProfilePage() {
  const { me, refresh } = useAuth();
  const navigate = useNavigate();

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
        <section className="profilePage__hero">
          <p className="profilePage__sub">ログインしてください。</p>
        </section>
      </div>
    );
  }

  const hasPremiumPlan = me.plan_tier === "premium";
  const isCanceling = hasPremiumPlan && Boolean(me.stripe_cancel_at_period_end);
  const currentPlanLabel =
    hasPremiumPlan && (me.billing_cycle === "monthly" || me.billing_cycle === "quarterly")
      ? BILLING_CYCLE_LABEL[me.billing_cycle]
      : "Free";
  const currentPeriodEndLabel = formatBillingDate(me.stripe_current_period_end);

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

  const hasProfileChanges =
    displayName !== (me.display_name ?? "") ||
    avatarIcon !== (me.avatar_icon ?? "note_blue") ||
    avatarImageUrl !== (me.avatar_image_url ?? "") ||
    publicProfileEnabled !== (me.public_profile_enabled ?? false) ||
    rankingParticipationEnabled !== (me.ranking_participation_enabled ?? false);
  const canSave = displayName.trim().length <= 30;
  const canSubmit = hasProfileChanges && canSave && !isSaving;
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
      <section className="profilePage__section">
        <div className="profilePage__sectionHead">
          <div className="profilePage__sectionHeadMain">
            <span className="profilePage__sectionIcon" aria-hidden="true">
              {renderProfileSectionIcon("account")}
            </span>
            <div className="profilePage__sectionEyebrow">ACCOUNT</div>
          </div>
        </div>

        <div className="profilePage__row">
          <div className="profilePage__k">メール</div>
          <div className="profilePage__v">{me.email}</div>
        </div>

        <details className="profilePage__passwordAccordion">
          <summary className="profilePage__passwordSummary">パスワードを変更する</summary>
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
      </section>

      <section className="profilePage__section">
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
            <div className="profilePage__hint">端末画像を設定できます。</div>
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
                className="profilePage__avatarResetBtn profilePage__avatarResetBtn--text"
                onClick={() => setAvatarImageUrl("")}
              >
                カスタム画像を解除
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="profilePage__section">
        <div className="profilePage__sectionHead">
          <div className="profilePage__sectionHeadMain">
            <span className="profilePage__sectionIcon" aria-hidden="true">
              {renderProfileSectionIcon("plan")}
            </span>
            <div className="profilePage__sectionEyebrow">PLAN</div>
          </div>
        </div>

        <div className="profilePage__row">
          <div className="profilePage__k">現在のプラン</div>
          <div className="profilePage__v">{currentPlanLabel}</div>
        </div>

        {hasPremiumPlan && currentPeriodEndLabel ? (
          <div className="profilePage__row">
            <div className="profilePage__k">{isCanceling ? "利用終了予定日" : "次回更新日"}</div>
            <div className="profilePage__v">{currentPeriodEndLabel}</div>
          </div>
        ) : null}

        <button
          type="button"
          className="profilePage__saveBtn profilePage__saveBtn--secondary profilePage__planAction"
          onClick={() => navigate(hasPremiumPlan ? "/plan" : "/premium")}
        >
          {hasPremiumPlan ? "契約を管理" : "プランを見る"}
        </button>
      </section>

      <section className="profilePage__section">
        <div className="profilePage__sectionHead">
          <div className="profilePage__sectionHeadMain">
            <span className="profilePage__sectionIcon" aria-hidden="true">
              {renderProfileSectionIcon("visibility")}
            </span>
            <div className="profilePage__sectionEyebrow">VISIBILITY</div>
          </div>
        </div>

        <div className="profilePage__toggleRow">
          <div>
            <div className="profilePage__k">コミュニティからプロフィール閲覧可能にする</div>
            <div className="profilePage__hint">コミュニティで、他のユーザーがあなたのプロフィールを見られるようになります</div>
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
            <div className="profilePage__hint">コミュニティランキングに表示されます</div>
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

      </section>

      <div className="profilePage__footer">
        <div className="profilePage__note">
          {!hasProfileChanges ? "変更すると保存できます。" : !canSave ? "表示名は30文字以内で保存できます。" : "空欄で保存すると「未設定」になります。"}
        </div>
      </div>

      <div className="profilePage__saveDock" role="region" aria-label="保存操作">
        <div className="profilePage__saveDockInner">
          <button
            type="button"
            onClick={onSave}
            disabled={!canSubmit}
            className="profilePage__saveBtn"
          >
            {isSaving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
