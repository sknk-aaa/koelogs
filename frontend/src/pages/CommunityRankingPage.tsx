import { useEffect, useLayoutEffect, useMemo, useState } from "react";

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
  const [animateBars, setAnimateBars] = useState(true);

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

  useLayoutEffect(() => {
    setAnimateBars(false);
    const id = window.requestAnimationFrame(() => setAnimateBars(true));
    return () => window.cancelAnimationFrame(id);
  }, [tab]);

  const current = useMemo(() => {
    const rows = tabRows(tab, rankings);
    const unit = tabUnit(tab);
    const label = tabLabel(tab);
    const meEntryIndex = me ? rows.findIndex((r) => r.user_id === me.id) : -1;
    const meEntry = meEntryIndex >= 0 ? rows[meEntryIndex] : undefined;
    const avg = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.value, 0) / rows.length) : 0;
    const diff = meEntry ? meEntry.value - avg : null;
    const max = rows[0]?.value ?? 0;
    const total = rows.length;
    const meRank = meEntry ? meEntryIndex + 1 : null;
    const diffType = diff === null ? "none" : diff > 0 ? "up" : diff < 0 ? "down" : "even";
    return { rows, unit, label, meEntry, avg, diff, max, total, meRank, diffType };
  }, [tab, rankings, me]);

  return (
    <div className={`page communityRanking communityRanking--${tab}`}>
      <section className="card communityRanking__tabs">
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
        <button
          type="button"
          className={`communityRanking__tabBtn ${tab === "ai" ? "is-active" : ""}`}
          onClick={() => setTab("ai")}
        >
          AI貢献
        </button>
      </section>

      {loading && <section className="card communityRanking__card">読み込み中…</section>}
      {!loading && error && <section className="card communityRanking__card">{error}</section>}

      {!loading && !error && (
        <>
          <section className="card communityRanking__focusCard">
            {current.total > 0 ? (
              <>
                <div className="communityRanking__focusTop">
                  <div className="communityRanking__focusLeft">
                    {current.meEntry ? (
                      <img
                        src={avatarIconPath(current.meEntry.avatar_icon, current.meEntry.avatar_image_url)}
                        alt={current.meEntry.display_name}
                        className="communityRanking__avatar"
                      />
                    ) : me ? (
                      <img
                        src={avatarIconPath(me.avatar_icon, me.avatar_image_url)}
                        alt={me.display_name ?? "あなた"}
                        className="communityRanking__avatar"
                      />
                    ) : (
                      <div className="communityRanking__avatarPlaceholder" aria-hidden="true" />
                    )}
                    <div className="communityRanking__focusMain">
                      <div className="communityRanking__focusName">
                        {current.meEntry?.display_name ?? me?.display_name ?? "ゲスト"}
                        {current.meEntry?.level ? <span>Lv.{current.meEntry.level}</span> : null}
                      </div>
                    </div>
                  </div>

                  <div className="communityRanking__focusValue">
                    {current.meEntry ? formatValueForTab(tab, current.meEntry.value) : "-"}
                    <span>{current.unit}</span>
                  </div>
                </div>

                <div className="communityRanking__focusMeta">
                  <div className="communityRanking__focusRank">
                    {current.meRank ? `${current.meRank}位 / ${current.total}人` : `- / ${current.total}人`}
                  </div>

                  {current.diff !== null ? (
                    <div className={`communityRanking__focusDiff is-${current.diffType}`}>
                      平均より{" "}
                      {current.diff >= 0 ? "+" : ""}
                      {tab === "weekly" ? formatWeeklyHoursFromMinutes(current.diff) : current.diff}
                      {current.unit}
                    </div>
                  ) : (
                    <div className="communityRanking__focusHint">ランキング参加条件を満たすと表示されます</div>
                  )}
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
                {current.rows.map((entry, idx) => {
                  const ratio = current.max > 0 ? (entry.value / current.max) * 100 : 0;
                  const barWidth = ratio > 0 ? Math.max(6, Math.round(ratio)) : 0;
                  const rankClass =
                    idx === 0
                      ? "is-top1"
                      : idx === 1
                        ? "is-top2"
                        : idx === 2
                          ? "is-top3"
                          : "";
                  const isMe = current.meEntry?.user_id === entry.user_id;
                  return (
                    <article
                      key={`${entry.user_id}-${idx}`}
                      className={`communityRanking__row ${rankClass} ${isMe ? "is-me" : ""}`}
                    >
                      <div className="communityRanking__rowMain">
                        <div className="communityRanking__left">
                          <div className="communityRanking__rank">
                            {idx < 3 ? (
                              <span className="communityRanking__rankBlock">{idx + 1}</span>
                            ) : (
                              <div className="communityRanking__rankNumber">{idx + 1}</div>
                            )}
                            {idx === 0 ? (
                              <span className="communityRanking__rankCrown" aria-hidden="true">
                                <svg viewBox="0 0 24 18" role="img" focusable="false">
                                  <path
                                    d="M2 16h20l-2-8-4 4-4-8-4 8-4-4-2 8z"
                                    fill="currentColor"
                                  />
                                </svg>
                              </span>
                            ) : null}
                          </div>

                          <img
                            src={avatarIconPath(entry.avatar_icon, entry.avatar_image_url)}
                            alt={entry.display_name}
                            className="communityRanking__rowAvatar"
                          />

                          <div className="communityRanking__name">
                            {entry.display_name} <span>Lv.{entry.level}</span>
                            {isMe ? <span className="communityRanking__youTag">YOU</span> : null}
                          </div>
                        </div>

                        <div className="communityRanking__value">
                          {formatValueForTab(tab, entry.value)}
                          <span>{current.unit}</span>
                        </div>
                      </div>

                      <div className="communityRanking__bar">
                        <span style={{ width: animateBars ? `${barWidth}%` : "0%" }} />
                      </div>
                    </article>
                  );
                })}
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
  return "時間";
}

/**
 * weekly_duration_min (minutes) を「時間」表示に変換する。
 * - 小数1桁（例: 90分 -> 1.5）
 * - 2.0 のような末尾 .0 は落とす
 */
function formatWeeklyHoursFromMinutes(min: number): string {
  if (!Number.isFinite(min)) return "-";
  const hours = min / 60;

  const rounded = Math.round(hours * 10) / 10; // 小数1桁
  const s = String(rounded);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

function formatValueForTab(tab: RankTab, value: number): string {
  if (tab === "weekly") return formatWeeklyHoursFromMinutes(value);
  return String(value);
}