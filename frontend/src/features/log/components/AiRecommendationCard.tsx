import type { AiRecommendation } from "../../../types/aiRecommendation";

type Props = {
  rangeDays: number;
  aiLoading: boolean;
  aiError: string | null;
  aiRec: AiRecommendation | null;
  shownText: string;
  collapsible: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
};

export default function AiRecommendationCard({
  rangeDays,
  aiLoading,
  aiError,
  aiRec,
  shownText,
  collapsible,
  expanded,
  onToggleExpanded,
}: Props) {
  const status =
    aiLoading ? "loading" : aiError ? "error" : aiRec ? "saved" : "empty";

  return (
    <div className={`logAi card logPage__card logAi--${status}`}>
      {/* ヘッダー */}
      <div className="logAi__header">
        <div>
          <div className="logAi__title">今日のおすすめメニュー</div>
          <div className="logAi__meta">今日を含めて直近 {rangeDays} 日を参考</div>
        </div>

        <div className="logAi__headerRight">
          {status === "loading" && (
            <div className="logAi__pill logAi__pill--info">生成中</div>
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
          <div className="logAi__text logAi__text--muted">生成中…</div>
        )}

        {!aiLoading && aiError && (
          <div className="logPage__error">
            取得/生成に失敗しました: {aiError}
          </div>
        )}

        {!aiLoading && aiRec && (
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
          </>
        )}
      </div>
    </div>
  );
}
