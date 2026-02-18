import type { AnalysisFeedback } from "../../../types/analysisSession";
import "./AnalysisFeedbackPanel.css";

type AnalysisFeedbackPanelProps = {
  feedback?: AnalysisFeedback | null;
  fallbackText?: string | null;
  className?: string;
};

function joinClassName(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
}

export default function AnalysisFeedbackPanel({ feedback, fallbackText, className }: AnalysisFeedbackPanelProps) {
  if (!feedback && !fallbackText) return null;

  if (!feedback || !Array.isArray(feedback.evaluations) || feedback.evaluations.length === 0) {
    if (!fallbackText) return null;
    return <div className={joinClassName("analysisFeedback", className)}>{fallbackText}</div>;
  }

  return (
    <div className={joinClassName("analysisFeedback", className)}>
      {feedback.summary && <div className="analysisFeedback__summary">{feedback.summary}</div>}

      <div className="analysisFeedback__list">
        {feedback.evaluations.map((row, idx) => {
          const scoreLabel = row.score == null ? "評価不可" : `${row.score}点`;
          return (
            <section key={`${row.metric_key}-${idx}`} className="analysisFeedback__item">
              <header className="analysisFeedback__itemHead">
                <div className="analysisFeedback__label">{row.metric_label || row.metric_key}</div>
                <div className="analysisFeedback__score">{scoreLabel}</div>
              </header>
              {row.reason && <div className="analysisFeedback__reason">{row.reason}</div>}
              {Array.isArray(row.evidence) && row.evidence.length > 0 && (
                <div className="analysisFeedback__evidenceWrap">
                  {row.evidence.map((e, evidenceIdx) => (
                    <span key={`${row.metric_key}-evidence-${evidenceIdx}`} className="analysisFeedback__evidence">
                      根拠: {e}
                    </span>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {feedback.note && <div className="analysisFeedback__note">{feedback.note}</div>}
    </div>
  );
}
