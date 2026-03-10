import { Fragment, type ReactNode, useMemo, useState } from "react";
import MetronomeLoader from "../../../components/MetronomeLoader";
import InfoModal from "../../../components/InfoModal";
import type { AiCollectiveSummary } from "../../../types/aiRecommendation";
import { Card } from "../../ui";
import AiRecommendationInfoContent from "./AiRecommendationInfoContent";

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
            <AiRecommendationInfoContent />
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
                <div className="logAiQuestion__title">おすすめについて質問する</div>
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
    if (m[2].includes("補足")) continue;
    sections.push({
      order: m[1],
      title: m[2],
      lines: lines.slice(1),
    });
  }

  return sections;
}

type ParsedMenuEntry = { name: string; time?: string; desc: string; evidence?: string; webSource?: string; communityQuote?: string };

function StructuredRecommendation({ sections }: { sections: AiSection[] }) {
  return (
    <div className="logAi__structured">
      {sections.map((section) => {
        const sectionKey = `${section.order}-${section.title}`;
        const isState = section.title.includes("今の状態") || section.title.includes("テーマに関しての現状");
        const isMenus = section.title.includes("おすすめメニュー");
        const title = normalizeSectionTitle(section.title);
        const summaryTheme = conciseThemeLine(section.lines);
        const stateSummary = summarizeStateEntries(section.lines);
        const menuEntries = isMenus ? parseMenuEntries(section.lines) : [];
        return (
          <section key={sectionKey} className={`logAiSection ${sectionToneClass(title)}`}>
            <SectionHeading title={title} />
            {isState ? (
              <div className="logAiSection__body">
                <div className="logAiStateList">
                  {stateSummary.map((line, idx) => (
                    <p key={`state-${idx}`}>{renderHighlighted(line)}</p>
                  ))}
                </div>
              </div>
            ) : isMenus && menuEntries.length > 0 ? (
              <div className="logAiMenus">
                {menuEntries.map((entry, idx) => (
                  <article key={`menu-${entry.name}-${idx}`} className="logAiMenuRow">
                    <div className="logAiMenuRow__top">
                      <span className="logAiMenuRow__name">{renderHighlighted(entry.name)}</span>
                      {entry.time ? <span className="logAiMenuRow__time">{renderHighlighted(entry.time)}</span> : null}
                    </div>
                    <div className="logAiMenuRow__desc">{renderHighlightedMultiline(entry.desc)}</div>
                    {entry.evidence ? (
                      <div className="logAiMenuRow__evidence">{renderHighlighted(`根拠: ${entry.evidence}`)}</div>
                    ) : null}
                    {entry.webSource ? (
                      <div className="logAiMenuRow__evidence">{renderHighlighted(`Web出典: ${entry.webSource}`)}</div>
                    ) : null}
                    {entry.communityQuote ? (
                      <div className="logAiMenuRow__evidence">{renderHighlighted(`コミュニティ原文: 「${entry.communityQuote}」`)}</div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : title.includes("今週のテーマ") ? (
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
  if (title.includes("今週のテーマ")) return "logAiSection--theme";
  if (title.includes("最近の変化") || title.includes("テーマに関しての現状")) return "logAiSection--state";
  if (title.includes("今週のメニュー")) return "logAiSection--menu";
  if (title.includes("補足")) return "logAiSection--note";
  return "";
}

function normalizeSectionTitle(title: string): string {
  if (title.includes("今日の方針") || title.includes("今週の方針") || title.includes("今週のテーマ")) return "今週のテーマ";
  if (title.includes("今の状態") || title.includes("テーマに関しての現状")) return "テーマに関しての現状";
  if (title.includes("おすすめメニュー")) return "今週のメニュー";
  if (title.includes("補足")) return "補足";
  return title;
}

function SectionHeading({ title }: { title: string }) {
  const kind =
    title.includes("今週のテーマ")
      ? "theme"
      : title.includes("テーマに関しての現状")
        ? "state"
        : title.includes("今週のメニュー")
          ? "menu"
          : "default";

  return (
    <div className="logAiSection__title">
      <span className={`logAiSection__icon logAiSection__icon--${kind}`} aria-hidden="true">
        <SectionIcon kind={kind} />
      </span>
      <span>{title}</span>
    </div>
  );
}

function SectionIcon({ kind }: { kind: "theme" | "state" | "menu" | "default" }) {
  if (kind === "theme") {
    return (
      <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
        <path d="M10 2l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="10" cy="10" r="1.2" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "state") {
    return (
      <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
        <path d="M3 14l4-4 3 2 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 17h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "menu") {
    return (
      <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
        <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6.5 8h7M6.5 11h7M6.5 14h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="10" cy="10" r="1.2" fill="currentColor" />
    </svg>
  );
}

function conciseThemeLine(lines: string[]): string {
  const first = lines.map((line) => line.replace(/^・\s*/, "").trim()).find((line) => line.length > 0) ?? "";
  if (!first) return "今週のテーマを1つに絞って進める";
  const oneSentence = first.split("。")[0].trim();
  return oneSentence.length > 0 ? oneSentence : first;
}

function summarizeStateEntries(lines: string[]): string[] {
  const bases = lines
    .map((line) => line.replace(/^・\s*/, "").replace(/^[-•]\s*/, "").trim())
    .filter((line) => line.length > 0);
  if (bases.length === 0) return [ "変化データを収集中" ];
  return bases;
}

function parseMenuEntries(lines: string[]): ParsedMenuEntry[] {
  const out: ParsedMenuEntry[] = [];
  const normalized = lines
    .map((line) => line.replace(/^・\s*/, "").trim())
    .filter((line) => line.length > 0);

  const isDurationLine = (value: string): boolean => /^\d+\s*(分|min|mins|minutes)$/i.test(value.trim());
  const isHeaderLine = (idx: number): boolean => {
    const current = normalized[idx];
    if (!current) return false;
    if (current.includes("｜")) return true;
    if (idx + 1 < normalized.length && isDurationLine(normalized[idx + 1])) return true;
    if (/^(やり方|なぜ有効か|失敗時|根拠|コミュニティ原文)[:：]/.test(current)) return false;
    if (/^[\/／]\s*(やり方|なぜ有効か|失敗時|根拠|コミュニティ原文)[:：]/.test(current)) return false;
    const next = normalized[idx + 1] ?? "";
    if (/^(やり方|なぜ有効か|失敗時|根拠)[:：]/.test(next)) return true;
    return false;
  };

  for (let i = 0; i < normalized.length; i += 1) {
    if (!isHeaderLine(i)) continue;

    let nameRaw = normalized[i];
    let timeRaw = "";
    if (nameRaw.includes("｜")) {
      const split = nameRaw.split("｜", 2);
      nameRaw = split[0]?.trim() ?? "";
      timeRaw = split[1]?.trim() ?? "";
    } else if (i + 1 < normalized.length && isDurationLine(normalized[i + 1])) {
      timeRaw = normalized[i + 1].trim();
      i += 1;
    }

    let j = i + 1;
    const descParts: string[] = [];
    let evidence: string | undefined;
    let webSource: string | undefined;
    let communityQuote: string | undefined;
    while (j < normalized.length && !isHeaderLine(j)) {
      const row = normalized[j].replace(/^[\/／]\s*(?=(やり方|なぜ有効か|失敗時|根拠|Web出典|コミュニティ原文)[:：])/, "");
      if (/^(?:[\/／]\s*)?根拠[:：]/.test(row)) {
        evidence = row.replace(/^(?:[\/／]\s*)?根拠[:：]\s*/, "").trim();
      } else if (/^(?:[\/／]\s*)?Web出典[:：]/.test(row)) {
        webSource = row.replace(/^(?:[\/／]\s*)?Web出典[:：]\s*/, "").trim();
      } else if (/^(?:[\/／]\s*)?コミュニティ原文[:：]/.test(row)) {
        communityQuote = row.replace(/^(?:[\/／]\s*)?コミュニティ原文[:：]\s*/, "").replace(/^「/, "").replace(/」$/, "").trim();
      } else {
        descParts.push(row);
      }
      j += 1;
    }

    const desc = descParts.join("\n").replace(/^狙い[:：]?\s*/, "").trim();
    out.push({
      name: nameRaw.trim(),
      time: timeRaw.trim() || undefined,
      desc: desc || "やり方の記述なし",
      evidence: evidence && evidence.length > 0 ? evidence : undefined,
      webSource: webSource && webSource.length > 0 ? webSource : undefined,
      communityQuote: communityQuote && communityQuote.length > 0 ? communityQuote : undefined,
    });
    i = j - 1;
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

function renderHighlightedMultiline(text: string) {
  const rows = text.split("\n");
  return (
    <>
      {rows.map((row, idx) => (
        <Fragment key={`ml-${idx}`}>
          {idx > 0 ? <br /> : null}
          {renderMenuDescriptionRow(row)}
        </Fragment>
      ))}
    </>
  );
}

function renderMenuDescriptionRow(text: string) {
  const m = text.match(/^(やり方|なぜ有効か|失敗時)[:：]\s*(.*)$/);
  if (!m) return renderHighlighted(text);
  return (
    <>
      <span className="logAiMenuRow__label">{m[1]}:</span>
      {m[2] ? " " : null}
      {m[2] ? renderHighlighted(m[2]) : null}
    </>
  );
}
