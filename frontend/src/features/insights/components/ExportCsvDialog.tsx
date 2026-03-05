import { useEffect } from "react";

export type CsvExportPeriod = "latest" | "30d" | "90d";
export type CsvMetricFilter = "all" | "range" | "long_tone" | "volume_stability" | "pitch_accuracy";

type Props = {
  open: boolean;
  onClose: () => void;
  period: CsvExportPeriod;
  setPeriod: (v: CsvExportPeriod) => void;
  metric: CsvMetricFilter;
  setMetric: (v: CsvMetricFilter) => void;
  onDownload: () => void;
};

export default function ExportCsvDialog({
  open,
  onClose,
  period,
  setPeriod,
  metric,
  setMetric,
  onDownload,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="csvDialogOverlay" role="presentation" onClick={onClose}>
      <section
        className="csvDialog"
        role="dialog"
        aria-modal="true"
        aria-label="CSV出力"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="csvDialog__head">
          <div className="csvDialog__title">CSV出力</div>
          <button type="button" className="csvDialog__close" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>

        <div className="csvDialog__section">
          <div className="csvDialog__label">期間</div>
          <label className="csvDialog__option">
            <input
              type="radio"
              name="csv-period"
              checked={period === "latest"}
              onChange={() => setPeriod("latest")}
            />
            <span>最新のみ</span>
          </label>
          <label className="csvDialog__option">
            <input
              type="radio"
              name="csv-period"
              checked={period === "30d"}
              onChange={() => setPeriod("30d")}
            />
            <span>直近30日</span>
          </label>
          <label className="csvDialog__option">
            <input
              type="radio"
              name="csv-period"
              checked={period === "90d"}
              onChange={() => setPeriod("90d")}
            />
            <span>直近90日</span>
          </label>
        </div>

        <div className="csvDialog__section">
          <div className="csvDialog__label">指標フィルタ</div>
          <label className="csvDialog__option">
            <input
              type="radio"
              name="csv-metric"
              checked={metric === "all"}
              onChange={() => setMetric("all")}
            />
            <span>すべて</span>
          </label>
          <label className="csvDialog__option">
            <input
              type="radio"
              name="csv-metric"
              checked={metric === "range"}
              onChange={() => setMetric("range")}
            />
            <span>音域</span>
          </label>
          <label className="csvDialog__option">
            <input
              type="radio"
              name="csv-metric"
              checked={metric === "long_tone"}
              onChange={() => setMetric("long_tone")}
            />
            <span>ロングトーン</span>
          </label>
          <label className="csvDialog__option">
            <input
              type="radio"
              name="csv-metric"
              checked={metric === "volume_stability"}
              onChange={() => setMetric("volume_stability")}
            />
            <span>音量安定性</span>
          </label>
          <label className="csvDialog__option">
            <input
              type="radio"
              name="csv-metric"
              checked={metric === "pitch_accuracy"}
              onChange={() => setMetric("pitch_accuracy")}
            />
            <span>音程精度</span>
          </label>
        </div>

        <div className="csvDialog__actions">
          <button type="button" className="csvDialog__btn csvDialog__btn--secondary" onClick={onClose}>
            キャンセル
          </button>
          <button type="button" className="csvDialog__btn csvDialog__btn--primary" onClick={onDownload}>
            ダウンロード
          </button>
        </div>
      </section>
    </div>
  );
}
