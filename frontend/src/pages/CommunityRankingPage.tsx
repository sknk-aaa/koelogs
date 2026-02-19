import { useEffect, useMemo, useState } from "react";

import { fetchCommunityRankings } from "../api/community";
import { useAuth } from "../features/auth/useAuth";
import { avatarIconPath } from "../features/profile/avatarIcons";
import type { CommunityRankingEntry, CommunityRankings } from "../types/community";

import "./CommunityRankingPage.css";

type RankTab = "ai" | "streak" | "weekly";

export default function CommunityRankingPage() {
  const { me } = useAuth();
  const [tab, setTab] = useState<RankTab>("ai");
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState<CommunityRankings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCommunityRankings();
        if (!cancelled) setRankings(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "ランキングの取得に失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const current = useMemo(() => {
    const rows = tabRows(tab, rankings);
    const unit = tabUnit(tab);
    const label = tabLabel(tab);
    const meEntry = me ? rows.find((r) => r.user_id === me.id) : undefined;
    const top = rows[0];
    const main = meEntry ?? top;
    const avg = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.value, 0) / rows.length) : 0;
    const diff = main ? main.value - avg : 0;
    return { rows, unit, label, main, avg, diff };
  }, [tab, rankings, me]);

  return (
    <div className="page communityRanking">
      <section className="card communityRanking__tabs">
        <button
          type="button"
          className={`communityRanking__tabBtn ${tab === "ai" ? "is-active" : ""}`}
          onClick={() => setTab("ai")}
        >
          AI貢献
        </button>
        <button
          type="button"
          className={`communityRanking__tabBtn ${tab === "streak" ? "is-active" : ""}`}
          onClick={() => setTab("streak")}
        >
          連続日数
        </button>
        <button
          type="button"
          className={`communityRanking__tabBtn ${tab === "weekly" ? "is-active" : ""}`}
          onClick={() => setTab("weekly")}
        >
          直近7日練習時間
        </button>
      </section>

      {loading && <section className="card communityRanking__card">読み込み中…</section>}
      {!loading && error && <section className="card communityRanking__card">{error}</section>}

      {!loading && !error && (
        <>
          <section className="card communityRanking__focusCard">
            {current.main ? (
              <>
                <div className="communityRanking__focusTop">
                  <img
                    src={avatarIconPath(current.main.avatar_icon, current.main.avatar_image_url)}
                    alt={current.main.display_name}
                    className="communityRanking__avatar"
                  />
                  <div className="communityRanking__focusMain">
                    <div className="communityRanking__focusName">
                      {current.main.display_name} <span>Lv.{current.main.level}</span>
                    </div>
                    <div className="communityRanking__focusLabel">{current.label}</div>
                  </div>
                  <div className="communityRanking__focusValue">{current.main.value}<span>{current.unit}</span></div>
                </div>
                <div className="communityRanking__focusDiff">
                  平均より {current.diff >= 0 ? `+${current.diff}` : current.diff}
                  {current.unit}
                </div>
              </>
            ) : (
              <div className="communityRanking__empty">データがありません。</div>
            )}
          </section>

          <section className="card communityRanking__listCard">
            <div className="communityRanking__listTitle">トップメンバー</div>
            {current.rows.length === 0 ? (
              <div className="communityRanking__empty">データがありません。</div>
            ) : (
              <div className="communityRanking__rows">
                {current.rows.map((entry, idx) => (
                  <article key={`${entry.user_id}-${idx}`} className={`communityRanking__row ${idx === 0 ? "is-top" : ""}`}>
                    <div className="communityRanking__left">
                      <div className="communityRanking__rank">{idx + 1}</div>
                      <img
                        src={avatarIconPath(entry.avatar_icon, entry.avatar_image_url)}
                        alt={entry.display_name}
                        className="communityRanking__rowAvatar"
                      />
                      <div className="communityRanking__name">
                        {entry.display_name} <span>Lv.{entry.level}</span>
                      </div>
                    </div>
                    <div className="communityRanking__value">{entry.value}{current.unit}</div>
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

function tabRows(tab: RankTab, rankings: CommunityRankings | null): CommunityRankingEntry[] {
  if (!rankings) return [];
  if (tab === "ai") return rankings.ai_contributions;
  if (tab === "streak") return rankings.streak_days;
  return rankings.weekly_duration_min;
}

function tabLabel(tab: RankTab): string {
  if (tab === "ai") return "AIへの貢献数";
  if (tab === "streak") return "連続練習日数";
  return "直近7日練習時間";
}

function tabUnit(tab: RankTab): string {
  if (tab === "ai") return "回";
  if (tab === "streak") return "日";
  return "分";
}
