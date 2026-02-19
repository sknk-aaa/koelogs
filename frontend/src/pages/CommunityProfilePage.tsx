import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { fetchCommunityProfile } from "../api/community";
import { avatarIconPath } from "../features/profile/avatarIcons";
import type { CommunityProfileDetail } from "../types/community";

import "./CommunityProfilePage.css";

export default function CommunityProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = Number.parseInt(params.userId ?? "", 10);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<CommunityProfileDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!Number.isFinite(userId) || userId <= 0) {
        setError("プロフィールが見つかりません。");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await fetchCommunityProfile(userId);
        if (!cancelled) setProfile(data);
      } catch {
        if (!cancelled) {
          setError("プロフィールが非公開、または見つかりません。");
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="page communityProfile">
      <section className="card communityProfile__hero">
        <div className="communityProfile__kicker">Public Profile</div>
        <h1 className="communityProfile__title">公開プロフィール</h1>
      </section>

      {loading && <section className="card communityProfile__card">読み込み中…</section>}
      {!loading && error && <section className="card communityProfile__card">{error}</section>}
      {!loading && !error && profile && (
        <>
          <section className="card communityProfile__card">
            <img
              src={avatarIconPath(profile.avatar_icon, profile.avatar_image_url)}
              alt={profile.display_name}
              className="communityProfile__avatar"
            />
            <div className="communityProfile__name">{profile.display_name}</div>
            <div className="communityProfile__stats">
              <div>Lv: {profile.level}</div>
              <div>連続日数: {profile.streak_current_days} 日</div>
              <div>XP: {profile.total_xp}</div>
              <div>AIで参考にされた数: {profile.ai_contribution_count} 回</div>
            </div>
            {profile.goal_text && <div className="communityProfile__goal">目標: {profile.goal_text}</div>}
          </section>

          <section className="card communityProfile__card">
            <div className="communityProfile__cardTitle">バッジ</div>
            {profile.badges.length === 0 ? (
              <div className="communityProfile__muted">獲得バッジはありません。</div>
            ) : (
              <div className="communityProfile__badges">
                {profile.badges.map((badge) => (
                  <article key={badge.key} className="communityProfile__badge">
                    <img src={badge.icon_path} alt={badge.name} className="communityProfile__badgeIcon" />
                    <div className="communityProfile__badgeName">{badge.name}</div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
