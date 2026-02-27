import { useState } from "react";
import MetronomeLoader from "../../../components/MetronomeLoader";
import type { AiCollectiveSummary } from "../../../types/aiRecommendation";
import { Card } from "../../ui";

type Props = {
  title: string;
  meta: string;
  aiLoading: boolean;
  aiError: string | null;
  recommendationText: string | null;
  isSaved: boolean;
  sampleMode?: boolean;
  shownText: string | null;
  collapsible: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  collectiveSummary?: AiCollectiveSummary | null;
};

export default function AiRecommendationCard({
  title,
  meta,
  aiLoading,
  aiError,
  recommendationText,
  isSaved,
  sampleMode = false,
  shownText,
  collapsible,
  expanded,
  onToggleExpanded,
  collectiveSummary,
}: Props) {
  const status = aiLoading ? "loading" : aiError ? "error" : isSaved ? "saved" : "empty";

  return (
    <Card className={`logAi logPage__card logAi--${status}`}>
      {/* ヘッダー */}
      <div className="logAi__header">
        <div>
          <div className="logAi__title">{title}</div>
          <div className="logAi__meta">{meta}</div>
        </div>

        <div className="logAi__headerRight">
          {sampleMode && (
            <div className="logAi__pill logAi__pill--sample">サンプル</div>
          )}
          {status === "loading" && (
            <div className="logAi__pill logAi__pill--info logAi__loadingInline">
              生成中
              <MetronomeLoader compact label="" className="logAi__loaderInline" />
            </div>
          )}
          {status === "saved" && (
            <div className="logAi__pill logAi__pill--ok">保存済み</div>
          )}
          {status === "error" && (
            <div className="logAi__pill logAi__pill--ng">エラー</div>
          )}
        </div>
      </div>

      {/* 本文 */}
      <div className="logAi__content">
        {aiLoading && (
          <div className="logAi__text logAi__text--muted logAi__loadingInline">
            生成中…
            <MetronomeLoader compact label="" className="logAi__loaderInline" />
          </div>
        )}

        {!aiLoading && aiError && (
          <div className="logPage__error">
            取得/生成に失敗しました: {aiError}
          </div>
        )}

        {!aiLoading && recommendationText && shownText && (
          <>
            <div className="logAi__text">{shownText}</div>

            {collapsible && (
              <div className="logAi__actions">
                <button
                  type="button"
                  className="logAi__toggle"
                  onClick={onToggleExpanded}
                  aria-expanded={expanded}
                >
                  {expanded ? "折りたたむ" : "続きを読む"}
                  <span
                    className="logAi__toggleIcon"
                    aria-hidden="true"
                  >
                    {expanded ? "▲" : "▼"}
                  </span>
                </button>
              </div>
            )}

            <CollectiveSummaryPanel summary={collectiveSummary} />
          </>
        )}
      </div>
    </Card>
  );
}

function CollectiveSummaryPanel({ summary }: { summary?: AiCollectiveSummary | null }) {
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  if (!summary) return null;
  if (!summary.used || summary.items.length === 0) {
    return (
      <section className="logAi__collective">
        <div className="logAi__collectiveHead">参考にしたコミュニティ投稿</div>
        <div className="logAi__collectiveMuted">
          直近{summary.window_days}日 / タグ×メニュー{summary.min_count}件以上の条件を満たす投稿が不足しているため、今回は集合知を利用していません。
        </div>
      </section>
    );
  }

  return (
    <section className="logAi__collective">
      <div className="logAi__collectiveHead">
        参考にしたコミュニティ投稿
        <span>直近{summary.window_days}日 / {summary.min_count}件以上</span>
      </div>
      <div className="logAi__collectiveRows">
        {summary.items.map((item) => (
          <article key={item.tag_key} className="logAi__collectiveRow">
            <div className="logAi__collectiveRowHead">
              <div className="logAi__collectiveTag">{item.tag_label}</div>
              <span className="logAi__collectiveTagPill">改善タグ</span>
            </div>
            <div className="logAi__collectiveMenus" role="list" aria-label={`${item.tag_label}のメニュー分布と詳細`}>
              {item.menus.map((menu) => {
                const totalMenuCount = Math.max(item.menus.reduce((sum, m) => sum + m.count, 0), 1);
                const ratio = Math.round((menu.count / totalMenuCount) * 100);
                const scaleTotal = Math.max(menu.scale_distribution.reduce((sum, s) => sum + s.count, 0), 1);
                const commentKey = `${item.tag_key}-${menu.menu_label}`;
                const isExpanded = expandedComments[commentKey] === true;
                const previewComments = menu.detail_comments.slice(0, 2);
                const hasMoreComments = menu.detail_comments.length > 2;
                return (
                  <div key={`${item.tag_key}-${menu.menu_label}`} className="logAi__collectiveMenuCard" role="listitem">
                    <div className="logAi__collectiveBarTop">
                      <span className="logAi__collectiveMenuName">{menu.menu_label}</span>
                      <span className="logAi__collectiveCount">{menu.count}件 ({ratio}%)</span>
                    </div>
                    <div className="logAi__collectiveBarTrack">
                      <span style={{ width: `${Math.max(8, ratio)}%` }} />
                    </div>

                    <div className="logAi__collectiveSectionHead">人気スケール</div>
                    <div className="logAi__scaleChips">
                      {menu.scale_distribution.length > 0 ? (
                        menu.scale_distribution.map((s) => {
                          const pct = Math.round((s.count / scaleTotal) * 100);
                          return (
                            <span key={`${menu.menu_label}-scale-${s.label}`} className="logAi__scaleChip">
                              {s.label} {pct}%
                            </span>
                          );
                        })
                      ) : (
                        <span className="logAi__collectiveValue">データなし</span>
                      )}
                    </div>

                    <div className="logAi__collectiveSubhead">自由記述</div>
                    {menu.detail_comments.length > 0 ? (
                      <>
                        {!isExpanded ? (
                          <ul className="logAi__collectiveQuotes">
                            {previewComments.map((comment, idx) => (
                              <li key={`${menu.menu_label}-preview-${idx}`}>
                                <span className="logAi__quoteText">
                                  {`💬 ${compactText(formatCommentForDisplay(comment).join(" / "), 84).replace(/\s*\/\s*/g, "\n")}`}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <ul className="logAi__collectiveComments">
                            {menu.detail_comments.map((comment, idx) => {
                              const lines = formatCommentForDisplay(comment);
                              return (
                                <li key={`${menu.menu_label}-comment-${idx}`}>
                                  {lines.map((line, lineIdx) => (
                                    <span key={`${menu.menu_label}-comment-${idx}-line-${lineIdx}`}>
                                      {line}
                                      {lineIdx < lines.length - 1 ? <br /> : null}
                                    </span>
                                  ))}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {hasMoreComments && (
                          <button
                            type="button"
                            className="logAi__moreBtn"
                            onClick={() =>
                              setExpandedComments((prev) => ({ ...prev, [commentKey]: !isExpanded }))
                            }
                          >
                            {isExpanded ? "閉じる" : `もっと見る（${menu.detail_comments.length}件）`}
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="logAi__collectiveNoCommentBadge">コメントなし（{menu.count}件）</span>
                    )}
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatCommentForDisplay(raw: string): string[] {
  const normalized = raw
    .replace(/\s*(どこが良くなった？?|音域|意識した点|意識したポイント)\s*[:：]/g, "\n$1: ")
    .replace(/\s*(改善された点)\s*[:：]/g, "\n$1: ")
    .replace(/\n{2,}/g, "\n")
    .trim();
  const lines = normalized
    .split("\n")
    .map((v) =>
      v
        .trim()
        .replace(/^(どこが良くなった？?|改善された点|音域|意識した点|意識したポイント)\s*[:：]\s*/g, "")
        .trim()
    )
    .filter((v) => v.length > 0);
  return lines.length > 0 ? lines : [ raw.trim() ];
}

function compactText(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}…`;
}
