import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { fetchCommunityProfile } from "../api/community";
import { BADGE_DISPLAY_TOTAL, getBadgeShortName, renderBadgeIcon } from "../features/gamification/badgeDisplay";
import { avatarIconPath } from "../features/profile/avatarIcons";
import type { CommunityProfileDetail } from "../types/community";

import "./CommunityProfilePage.css";

function ProfileLevelIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path className="accent" d="M12 4.7 13.5 7.8 17 8.3 14.5 10.7 15.1 14.1 12 12.5 8.9 14.1 9.5 10.7 7 8.3 10.5 7.8Z" />
      <path d="M7.8 13.6v2.5c0 .5.3.9.7 1.2l2.7 1.5c.5.3 1.1.3 1.5 0l2.7-1.5c.4-.2.7-.7.7-1.2v-2.5" />
      <path d="M9.7 15.1h4.6" />
    </svg>
  );
}

function ProfileXpIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <circle cx="12" cy="12" r="6.9" />
      <path className="accent" d="M12 8.4v7.2" />
      <path className="accent" d="M8.4 12h7.2" />
      <path d="M17.4 6.6 18.9 5.1" />
      <path d="M5.1 18.9 6.6 17.4" />
    </svg>
  );
}

function ProfileStreakIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M7 5.5h10" />
      <path d="M8 3.8v3.4" />
      <path d="M16 3.8v3.4" />
      <rect x="5.5" y="6.5" width="13" height="12" rx="3" />
      <path className="accent" d="m9.3 12.3 1.9 1.9 3.6-4" />
    </svg>
  );
}

function ProfileContributionIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <circle cx="8.3" cy="12" r="2.1" />
      <circle cx="15.7" cy="8.5" r="2.1" />
      <circle cx="15.7" cy="15.5" r="2.1" />
      <path d="M10.3 11.1 13.7 9.1" />
      <path className="accent" d="M10.3 12.9 13.7 14.9" />
    </svg>
  );
}

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
      {loading && <section className="communityProfile__card communityProfile__card--message">読み込み中…</section>}
      {!loading && error && <section className="communityProfile__card communityProfile__card--message">{error}</section>}
      {!loading && !error && profile && (
        <>
          <section className="communityProfile__summary">
            <div className="communityProfile__identity">
              <img
                src={avatarIconPath(profile.avatar_icon, profile.avatar_image_url)}
                alt={profile.display_name}
                className="communityProfile__avatar"
              />
              <div className="communityProfile__identityText">
                <div className="communityProfile__name">{profile.display_name}</div>
              </div>
            </div>

            <div className="communityProfile__statsGrid">
              <div className="communityProfile__stat">
                <div className="communityProfile__statLabelRow">
                  <span className="communityProfile__statIcon" aria-hidden="true"><ProfileLevelIcon /></span>
                  <div className="communityProfile__statLabel">Lv</div>
                </div>
                <div className="communityProfile__statValue">{profile.level}</div>
              </div>
              <div className="communityProfile__stat">
                <div className="communityProfile__statLabelRow">
                  <span className="communityProfile__statIcon" aria-hidden="true"><ProfileStreakIcon /></span>
                  <div className="communityProfile__statLabel">連続日数</div>
                </div>
                <div className="communityProfile__statValue">{profile.streak_current_days}日</div>
              </div>
              <div className="communityProfile__stat">
                <div className="communityProfile__statLabelRow">
                  <span className="communityProfile__statIcon" aria-hidden="true"><ProfileXpIcon /></span>
                  <div className="communityProfile__statLabel">XP</div>
                </div>
                <div className="communityProfile__statValue">{profile.total_xp}</div>
              </div>
              <div className="communityProfile__stat">
                <div className="communityProfile__statLabelRow">
                  <span className="communityProfile__statIcon" aria-hidden="true"><ProfileContributionIcon /></span>
                  <div className="communityProfile__statLabel">AI貢献</div>
                </div>
                <div className="communityProfile__statValue">{profile.ai_contribution_count}回</div>
              </div>
            </div>
          </section>

          <section className="communityProfile__section">
            <div className="communityProfile__sectionHead">
              <span className="communityProfile__sectionIcon" aria-hidden="true">
                <ProfileContributionIcon />
              </span>
              <span className="communityProfile__sectionEyebrow">CONTRIBUTION</span>
            </div>
            <div className="communityProfile__contribution">
              <div className="communityProfile__contributionValue">
                あなたの投稿は <span className="communityProfile__contributionCount">{profile.ai_contribution_count}回</span> AIおすすめの根拠として使われました
              </div>
              <div className="communityProfile__contributionHelp">
                コミュニティ投稿がAIおすすめ生成時の根拠として採用された回数です。
              </div>
            </div>
          </section>

          <section className="communityProfile__section">
            <div className="communityProfile__sectionHead communityProfile__sectionHead--split">
              <div className="communityProfile__sectionHeadMain">
                <span className="communityProfile__sectionIcon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <circle cx="12" cy="9" r="4.2" />
                    <path d="M9 13.8 7.3 20l4.7-2.4 4.7 2.4-1.7-6.2" />
                  </svg>
                </span>
                <span className="communityProfile__sectionEyebrow">BADGES</span>
              </div>
              <div className="communityProfile__sectionMeta">{profile.badges.length}/{BADGE_DISPLAY_TOTAL}</div>
            </div>
            {profile.badges.length === 0 ? (
              <div className="communityProfile__muted">獲得バッジはありません。</div>
            ) : (
              <div className="communityProfile__badges">
                {profile.badges.map((badge) => (
                  <article key={badge.key} className="communityProfile__badge">
                    <span className="communityProfile__badgeIcon" aria-hidden="true">
                      {renderBadgeIcon(badge.key)}
                    </span>
                    <div className="communityProfile__badgeName">{getBadgeShortName(badge)}</div>
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
