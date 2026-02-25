import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { fetchMe, updateMe } from "../api/auth";
import { useAuth } from "../features/auth/useAuth";
import {
  improvementTagLabel,
  improvementTagToneClass,
  normalizeImprovementTags,
} from "../features/improvementTags/improvementTags";
import { IMPROVEMENT_TAG_OPTIONS } from "../types/community";

import "./AiSettingsPage.css";

const CUSTOM_MAX = 600;
const TEMPLATE = "練習頻度：\n課題：\n環境：\n目標：";

function normalizeInstructions(value: string): string {
  return value.trim();
}

function sameStringArray(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, index) => v === b[index]);
}

export default function AiSettingsPage() {
  const { refresh } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [customInstructions, setCustomInstructions] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [initialCustomInstructions, setInitialCustomInstructions] = useState("");
  const [initialSelectedTags, setInitialSelectedTags] = useState<string[]>([]);

  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (!me) {
          setError("ログインが必要です");
          return;
        }

        const custom = me.ai_custom_instructions ?? "";
        const tags = normalizeImprovementTags(me.ai_improvement_tags ?? []);
        setCustomInstructions(custom);
        setSelectedTags(tags);
        setInitialCustomInstructions(custom);
        setInitialSelectedTags(tags);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "読み込みに失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 2800);
    return () => window.clearTimeout(timer);
  }, [status]);

  const normalizedDraftInstructions = useMemo(
    () => normalizeInstructions(customInstructions),
    [customInstructions]
  );
  const normalizedDraftTags = useMemo(
    () => normalizeImprovementTags(selectedTags),
    [selectedTags]
  );

  const isOverLimit = normalizedDraftInstructions.length > CUSTOM_MAX;
  const isDirty =
    normalizedDraftInstructions !== normalizeInstructions(initialCustomInstructions) ||
    !sameStringArray(normalizedDraftTags, initialSelectedTags);
  const canSave = !loading && !saving && !isOverLimit;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = prev.includes(tag) ? prev.filter((v) => v !== tag) : [...prev, tag];
      return normalizeImprovementTags(next);
    });
  };

  const clearTags = () => {
    setSelectedTags([]);
  };

  const insertTemplate = () => {
    setCustomInstructions((prev) => {
      if (!prev.trim()) return TEMPLATE;
      const suffix = prev.endsWith("\n") ? "" : "\n";
      return `${prev}${suffix}${TEMPLATE}`;
    });
  };

  const onSave = async () => {
    if (!canSave) return;
    if (!isDirty) {
      setStatus("変更はありません");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await updateMe({
        ai_custom_instructions: normalizedDraftInstructions,
        ai_improvement_tags: normalizedDraftTags,
      });
      await refresh();

      const nextCustom = updated.ai_custom_instructions ?? "";
      const nextTags = normalizeImprovementTags(updated.ai_improvement_tags ?? []);
      setCustomInstructions(nextCustom);
      setSelectedTags(nextTags);
      setInitialCustomInstructions(nextCustom);
      setInitialSelectedTags(nextTags);
      setStatus("AIカスタム指示を保存しました");
      void refresh().catch(() => undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page aiSettingsPage">
      <div className="aiSettingsPage__bg" aria-hidden="true" />

      <section className="card aiSettingsPage__hero">
        <div className="aiSettingsPage__kicker">AI Custom</div>
        <h1 className="aiSettingsPage__title">AIカスタム指示</h1>
        <p className="aiSettingsPage__sub">カスタム指示と改善したい項目を、AIおすすめ生成に反映できます。</p>
      </section>

      {status && (
        <div className="aiSettingsPage__toast" role="status" aria-live="polite">
          {status}
        </div>
      )}

      {error && <div className="aiSettingsPage__error">{error}</div>}

      <section className="card aiSettingsPage__card">
        <div className="aiSettingsPage__sectionHead">
          <h2 className="aiSettingsPage__sectionTitle">カスタム指示</h2>
          <button type="button" className="aiSettingsPage__ghostBtn" onClick={insertTemplate}>
            テンプレ挿入
          </button>
        </div>
        <p className="aiSettingsPage__hint">ここに書いた内容はAIおすすめ生成に反映されます。</p>
        <div className="aiSettingsPage__textareaWrap">
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            className="aiSettingsPage__textarea"
            maxLength={CUSTOM_MAX}
            rows={8}
            placeholder="例: 喉に力が入りやすいので、負担を下げるメニューを優先したい"
          />
          <div className={`aiSettingsPage__counter ${isOverLimit ? "is-over" : ""}`}>
            {normalizedDraftInstructions.length} / {CUSTOM_MAX}
          </div>
        </div>
      </section>

      <section className="card aiSettingsPage__card">
        <div className="aiSettingsPage__sectionHead">
          <h2 className="aiSettingsPage__sectionTitle">改善したい項目</h2>
          {selectedTags.length > 0 && (
            <button type="button" className="aiSettingsPage__ghostBtn" onClick={clearTags}>
              全解除
            </button>
          )}
        </div>
        <p className="aiSettingsPage__hint">複数選択できます。</p>
        <div className="aiSettingsPage__tagsGrid">
          {IMPROVEMENT_TAG_OPTIONS.map((opt) => {
            const selected = selectedTags.includes(opt.key);
            const toneClass = improvementTagToneClass(opt.key);
            return (
              <button
                key={opt.key}
                type="button"
                className={`aiSettingsPage__tag ${toneClass} ${selected ? "is-selected" : ""}`}
                onClick={() => toggleTag(opt.key)}
                aria-pressed={selected}
              >
                <span className="aiSettingsPage__tagCheck" aria-hidden="true">
                  {selected ? "✓" : ""}
                </span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card aiSettingsPage__card">
        <button
          type="button"
          className="aiSettingsPage__previewToggle"
          onClick={() => setPreviewOpen((prev) => !prev)}
          aria-expanded={previewOpen}
        >
          <span className="aiSettingsPage__sectionTitle">プレビュー</span>
          <span className="aiSettingsPage__previewIcon" aria-hidden="true">{previewOpen ? "▲" : "▼"}</span>
        </button>

        {previewOpen && (
          <div className="aiSettingsPage__previewBody">
            <div>
              <div className="aiSettingsPage__previewLabel">改善タグ</div>
              {normalizedDraftTags.length === 0 ? (
                <div className="aiSettingsPage__previewEmpty">未選択</div>
              ) : (
                <div className="aiSettingsPage__previewTags">
                  {normalizedDraftTags.map((tag) => (
                    <span
                      key={`preview-tag-${tag}`}
                      className={`aiSettingsPage__tagPreview ${improvementTagToneClass(tag)}`}
                    >
                      {improvementTagLabel(tag)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="aiSettingsPage__previewLabel">カスタム指示</div>
              {normalizedDraftInstructions.length === 0 ? (
                <div className="aiSettingsPage__previewEmpty">未入力</div>
              ) : (
                <div className="aiSettingsPage__previewText">{customInstructions}</div>
              )}
            </div>
          </div>
        )}
      </section>

      <div className="aiSettingsPage__saveDock" role="region" aria-label="保存操作">
        <div className="aiSettingsPage__saveDockInner">
          <Link to="/log" className="aiSettingsPage__subtleLink">ログへ戻る</Link>
          <button type="button" className="aiSettingsPage__saveBtn" disabled={!canSave} onClick={onSave}>
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
