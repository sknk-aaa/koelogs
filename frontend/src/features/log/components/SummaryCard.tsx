import type { RefObject } from "react";
import type { TrainingLog } from "../../../types/trainingLog";
import ColoredTag from "../../../components/ColoredTag";
import { Card } from "../../ui";

type MenuItem = { id: number; name: string; color?: string | null; archived?: boolean | null };

type Props = {
  loading: boolean;
  error: string | null;
  log: TrainingLog | null;
  menuItems: MenuItem[];
  emptyHint: string;
  currentStreakDays: number | null;
  sampleMode?: boolean;

  // ✅ 追加：記録ボタンをカード近くに置く
  recordLabel: string;
  onClickRecord: () => void;
  recordButtonRef?: RefObject<HTMLButtonElement | null>;
  recordButtonClassName?: string;
};

export default function SummaryCard({
  loading,
  error,
  log,
  menuItems,
  emptyHint,
  currentStreakDays,
  sampleMode = false,
  recordLabel,
  onClickRecord,
  recordButtonRef,
  recordButtonClassName,
}: Props) {
  return (
    <Card className="logPage__card">
      <div className="logPage__cardHead">
        <div className="logPage__cardTitle">サマリー</div>

        <div className="logPage__cardHeadRight">
          {sampleMode && (
            <div className="logPage__cardBadge logPage__cardBadge--sample">サンプル</div>
          )}
          {!log && !loading && !error && (
            <div className="logPage__cardBadge logPage__cardBadge--empty">未記録</div>
          )}

          {/* ✅ サマリーの近くに配置（常に見える） */}
          <button
            ref={recordButtonRef}
            className={`logPage__btn logPage__recordBtn ${recordButtonClassName ?? ""}`.trim()}
            onClick={onClickRecord}
          >
            {recordLabel}
          </button>
        </div>
      </div>

      {loading && <div className="logPage__muted">読み込み中…</div>}

      {!loading && error && <div className="logPage__error">取得に失敗しました: {error}</div>}

      {!loading && !error && !log && (
        <div className="logPage__empty">
          <div className="logPage__emptyTitle">記録すると、ここに今日の結果が表示されます</div>
          <div className="logPage__kpiRow" aria-label="記録後の表示イメージ">
            <div className="logPage__kpi logPage__mini logPage__mini--time">
              <div className="logPage__kpiLabel">練習時間</div>
              <div className="logPage__kpiValue">
                <span className="logPage__kpiNumber">-</span>
                <span className="logPage__kpiUnit">分</span>
              </div>
            </div>
            <div className="logPage__kpi logPage__mini logPage__mini--streak">
              <div className="logPage__kpiLabel">連続日数</div>
              <div className="logPage__kpiValue">
                <span className="logPage__kpiNumber">-</span>
                <span className="logPage__kpiUnit">日</span>
              </div>
            </div>
          </div>

          <div className="logPage__section">
            <div className="logPage__sectionTitle">メニュー</div>
            <div className="logPage__muted">-</div>
          </div>

          <div className="logPage__section">
            <div className="logPage__sectionTitle">メモ</div>
            <div className="logPage__notesBox logPage__notesBox--placeholder">-</div>
          </div>

          <div className="logPage__muted">{emptyHint}</div>
        </div>
      )}

      {!loading && !error && log && (
        <>
          <div className="logPage__kpiRow">
            <div className="logPage__kpi logPage__kpi--primary logPage__mini logPage__mini--time">
              <div className="logPage__kpiLabel">練習時間</div>
              <div className="logPage__kpiValue">
                <span className="logPage__kpiNumber">{log.duration_min ?? 0}</span>
                <span className="logPage__kpiUnit">分</span>
              </div>
            </div>
            <div className="logPage__kpi logPage__mini logPage__mini--streak">
              <div className="logPage__kpiLabel">連続日数</div>
              <div className="logPage__kpiValue">
                <span className="logPage__kpiNumber">{currentStreakDays ?? 0}</span>
                <span className="logPage__kpiUnit">日</span>
              </div>
            </div>
          </div>

          <div className="logPage__section">
            <div className="logPage__sectionTitle">メニュー</div>
            {menuItems.length ? (
              <div className="logPage__tags">
                {menuItems.map((m) => (
                  <ColoredTag
                    key={m.id}
                    text={m.name}
                    color={m.color ?? "#E5E7EB"}
                    title={m.archived ? "このメニューは現在アーカイブされています" : undefined}
                    className={m.archived ? "is-archived" : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="logPage__muted">なし</div>
            )}
          </div>

          {log.notes && (
            <div className="logPage__section">
              <div className="logPage__sectionTitle">メモ</div>
              <div className="logPage__notesBox">
                {log.notes.length > 160 ? log.notes.slice(0, 160) + "…" : log.notes}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
