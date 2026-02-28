import { type ReactNode, useId, useMemo, useState } from "react";
import MetronomeLoader from "../../../components/MetronomeLoader";
import InfoModal from "../../../components/InfoModal";
import type { AiCollectiveSummary } from "../../../types/aiRecommendation";
import { Card } from "../../ui";

type Props = {
  title: string;
  meta?: string;
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
  showFollowupButton?: boolean;
  onOpenFollowup?: (message?: string) => void;
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
  showFollowupButton = false,
  onOpenFollowup,
}: Props) {
  const status = aiLoading ? "loading" : aiError ? "error" : isSaved ? "saved" : "empty";
  const parsedSections = useMemo(() => parseAiSections(recommendationText ?? ""), [recommendationText]);
  const showStructured = parsedSections.length > 0;
  const canCollapseText = collapsible && !showStructured;
  const [followupDraft, setFollowupDraft] = useState("");

  return (
    <Card className={`logAi logPage__card logAi--${status}`}>
      {/* ヘッダー */}
      <div className="logAi__header">
        <div>
          <div className="logAi__title">{title}</div>
          {meta ? <div className="logAi__meta">{meta}</div> : null}
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
          {status === "error" && (
            <div className="logAi__pill logAi__pill--ng">エラー</div>
          )}
          <InfoModal
            title="AIおすすめのつくられかた"
            bodyClassName="logPage__aiInfoBody"
            triggerClassName="logPage__aiInfoBtn"
          >
            <div className="logPage__aiInfoLead">直近の記録と目標から、今日の練習プランをAIが提案します。</div>
            <div className="logPage__aiInfoBlocks">
              <section className="logPage__aiInfoBlock logPage__aiInfoBlock--primary">
                <div className="logPage__aiInfoBlockTitle">
                  <span className="logPage__aiInfoIcon" aria-hidden="true">🎯</span>
                  <span>主に使う</span>
                </div>
                <div className="logPage__aiInfoBlockText">
                  詳細ログは直近14日を使い、選択した参照期間が30/90日の場合は月ログ傾向も補助で参照します。
                </div>
              </section>
              <section className="logPage__aiInfoBlock">
                <div className="logPage__aiInfoBlockTitle">
                  <span className="logPage__aiInfoIcon" aria-hidden="true">💡</span>
                  <span>補助</span>
                </div>
                <div className="logPage__aiInfoBlockText">
                  コミュニティで投稿されたトレーニング内容を参考にすることがあります。
                </div>
              </section>
              <section className="logPage__aiInfoBlock logPage__aiInfoBlock--save">
                <div className="logPage__aiInfoBlockTitle">
                  <span className="logPage__aiInfoIcon" aria-hidden="true">🧠</span>
                  <span>保存</span>
                </div>
                <div className="logPage__aiInfoBlockText">
                  生成結果は当日分として保存され、後から見返せます。
                </div>
              </section>
            </div>
          </InfoModal>
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
            {showStructured ? (
              <StructuredRecommendation sections={parsedSections} />
            ) : (
              <div className="logAi__text">{shownText}</div>
            )}

            {canCollapseText && (
              <div className="logAi__actions">
                {canCollapseText && (
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
                )}
              </div>
            )}

            {showFollowupButton && (
              <section className="logAiQuestion">
                <div className="logAiQuestion__title">💬 このおすすめを具体化するための質問ができます</div>
                <div className="logAiQuestion__row">
                  <input
                    className="logAiQuestion__input"
                    type="text"
                    value={followupDraft}
                    onChange={(e) => setFollowupDraft(e.target.value)}
                    placeholder="質問してみましょう"
                  />
                  <div className="logAiQuestion__actions">
                    <button
                      type="button"
                      className="logAiQuestion__send"
                      onClick={() => {
                        const text = followupDraft.trim();
                        if (!text) return;
                        onOpenFollowup?.(text);
                        setFollowupDraft("");
                      }}
                    >
                      送信
                    </button>
                    <button
                      type="button"
                      className="logAiQuestion__history"
                      onClick={() => onOpenFollowup?.()}
                    >
                      履歴を見る
                    </button>
                  </div>
                </div>
              </section>
            )}

            <CollectiveSummaryPanel summary={collectiveSummary} />
          </>
        )}
      </div>
    </Card>
  );
}

type AiSection = {
  order: string;
  title: string;
  lines: string[];
};

function parseAiSections(text: string): AiSection[] {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];

  const blocks = normalized
    .split(/\n(?=\d\)\s*)/g)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

  const sections: AiSection[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((v) => v.trim()).filter((v) => v.length > 0);
    if (lines.length === 0) continue;
    const first = lines[0];
    const m = first.match(/^(\d)\)\s*(.+)$/);
    if (!m) continue;
    sections.push({
      order: m[1],
      title: m[2],
      lines: lines.slice(1),
    });
  }

  return sections;
}

function StructuredRecommendation({ sections }: { sections: AiSection[] }) {
  const [stateExpandedByKey, setStateExpandedByKey] = useState<Record<string, boolean>>({});

  return (
    <div className="logAi__structured">
      {sections.map((section) => {
        const sectionKey = `${section.order}-${section.title}`;
        const isState = section.title.includes("今の状態");
        const isMenus = section.title.includes("おすすめメニュー");
        const title = normalizeSectionTitle(section.title);
        const summaryTheme = conciseThemeLine(section.lines);
        const stateSummary = summarizeStateLines(section.lines);
        const stateExpanded = stateExpandedByKey[sectionKey] === true;
        const menuEntries = isMenus ? parseMenuEntries(section.lines) : [];
        return (
          <section key={sectionKey} className={`logAiSection ${sectionToneClass(title)}`}>
            <div className="logAiSection__title">{title}</div>
            {isState ? (
              <div className="logAiState">
                <div className="logAiStateList">
                  {stateSummary.map((line, idx) => (
                    <div key={`state-${idx}`} className="logAiStateItem">{renderHighlighted(line)}</div>
                  ))}
                </div>
                <div className="logAiState__actions">
                  <button
                    type="button"
                    className="logAiState__toggle"
                    onClick={() =>
                      setStateExpandedByKey((prev) => ({ ...prev, [sectionKey]: !stateExpanded }))
                    }
                  >
                    {stateExpanded ? "詳細を閉じる ▲" : "詳細を見る ▼"}
                  </button>
                </div>
                {stateExpanded && (
                  <div className="logAiState__detail">
                    {chunkByLines(section.lines, 3).map((chunk, idx) => (
                      <p key={`state-detail-${idx}`}>{renderHighlighted(chunk.join("\n"))}</p>
                    ))}
                  </div>
                )}
              </div>
            ) : isMenus && menuEntries.length > 0 ? (
              <div className="logAiMenus">
                {menuEntries.map((entry, idx) => (
                  <article key={`menu-${entry.name}-${idx}`} className="logAiMenuRow">
                    <div className="logAiMenuRow__top">
                      <span className="logAiMenuRow__name">{renderHighlighted(entry.name)}</span>
                      <span className="logAiMenuRow__time">{renderHighlighted(entry.time)}</span>
                    </div>
                    <div className="logAiMenuRow__desc">{renderHighlighted(entry.desc)}</div>
                  </article>
                ))}
              </div>
            ) : title.includes("今日のテーマ") ? (
              <div className="logAiTheme">{renderHighlighted(summaryTheme)}</div>
            ) : (
              <div className="logAiSection__body">
                {chunkByLines(section.lines, 3).map((chunk, idx) => (
                  <p key={`chunk-${idx}`}>{renderHighlighted(chunk.join("\n"))}</p>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function sectionToneClass(title: string): string {
  if (title.includes("今日のテーマ")) return "logAiSection--theme";
  if (title.includes("最近の変化")) return "logAiSection--state";
  if (title.includes("今日のメニュー")) return "logAiSection--menu";
  if (title.includes("補足")) return "logAiSection--note";
  return "";
}

function normalizeSectionTitle(title: string): string {
  if (title.includes("今日の方針")) return "🎯 今日のテーマ";
  if (title.includes("今の状態")) return "📈 最近の変化";
  if (title.includes("おすすめメニュー")) return "🗂 今日のメニュー";
  if (title.includes("補足")) return "📝 補足";
  return `🧩 ${title}`;
}

function conciseThemeLine(lines: string[]): string {
  const first = lines.map((line) => line.replace(/^・\s*/, "").trim()).find((line) => line.length > 0) ?? "";
  if (!first) return "今日のテーマを1つに絞って進める";
  const oneSentence = first.split("。")[0].trim();
  return oneSentence.length > 0 ? oneSentence : first;
}

function summarizeStateLines(lines: string[]): string[] {
  const icons = [ "🔼", "🎯", "🫁" ];
  const bases = lines
    .map((line) => line.replace(/^・\s*/, "").replace(/^[-•]\s*/, "").trim())
    .filter((line) => line.length > 0)
    .slice(0, 3);
  if (bases.length === 0) return [ "🔼 変化データを収集中" ];

  return bases.map((line, idx) => `${icons[idx] ?? "📌"} ${line}`);
}

function parseMenuEntries(lines: string[]): Array<{ name: string; time: string; desc: string }> {
  const out: Array<{ name: string; time: string; desc: string }> = [];
  const normalized = lines
    .map((line) => line.replace(/^・\s*/, "").trim())
    .filter((line) => line.length > 0);

  for (let i = 0; i < normalized.length; i += 1) {
    const current = normalized[i];
    if (!current.includes("｜")) continue;
    const [nameRaw, timeRaw] = current.split("｜", 2);
    const descRaw = normalized[i + 1] ?? "";
    const desc = descRaw.replace(/^狙い[:：]?\s*/, "").trim();
    out.push({
      name: nameRaw.trim(),
      time: timeRaw.trim(),
      desc: desc || "狙いの記述なし",
    });
    i += 1;
  }
  return out;
}

function chunkByLines(lines: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < lines.length; i += size) {
    out.push(lines.slice(i, i + size));
  }
  return out;
}

function renderHighlighted(text: string) {
  const tokenRe = /([+-]?\d+(?:\.\d+)?(?:秒|分|日|dB|半音|%))|([A-G][#b]?\d)/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let idx = 0;
  for (const m of text.matchAll(tokenRe)) {
    const hit = m[0];
    const at = m.index ?? 0;
    if (at > last) nodes.push(text.slice(last, at));
    if (m[1]) {
      nodes.push(<strong key={`m-${idx}`} className="logAiToken logAiToken--metric">{hit}</strong>);
    } else {
      nodes.push(<span key={`n-${idx}`} className="logAiToken logAiToken--note">{hit}</span>);
    }
    idx += 1;
    last = at + hit.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

function CollectiveSummaryPanel({ summary }: { summary?: AiCollectiveSummary | null }) {
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [isOpen, setIsOpen] = useState(false);
  const collectiveBodyId = useId();

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
        <div className="logAi__collectiveHeadLeft">参考にしたコミュニティ投稿</div>
        <button
          type="button"
          className="logAi__collectiveToggle"
          aria-expanded={isOpen}
          aria-controls={collectiveBodyId}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {isOpen ? "閉じる" : "表示する"} {isOpen ? "▲" : "▼"}
        </button>
      </div>
      {isOpen && (
        <div id={collectiveBodyId} className="logAi__collectiveRows">
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
                  const isExpandedComment = expandedComments[commentKey] === true;
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
                          {!isExpandedComment ? (
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
                                setExpandedComments((prev) => ({ ...prev, [commentKey]: !isExpandedComment }))
                              }
                            >
                              {isExpandedComment ? "閉じる" : `もっと見る（${menu.detail_comments.length}件）`}
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
      )}
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
