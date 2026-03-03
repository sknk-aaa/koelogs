import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { fetchMe, recalculateAiLongTermProfile, updateMe, type AiLongTermProfileCustomItem } from "../api/auth";
import { useAuth } from "../features/auth/useAuth";
import { useSettings } from "../features/settings/useSettings";
import {
  improvementTagToneClass,
  normalizeImprovementTags,
} from "../features/improvementTags/improvementTags";
import { IMPROVEMENT_TAG_OPTIONS } from "../types/community";

import "./AiSettingsPage.css";

const CUSTOM_MAX = 600;
const TEMPLATE = "回答トーン：\n説明の粒度：\n厳しさ：\n形式（箇条書き/手順など）：";
const LONG_PROFILE_ITEM_MAX = 6;
const LONG_PROFILE_LINE_MAX = 6;
const LONG_PROFILE_TEXT_MAX = 220;

function normalizeInstructions(value: string): string {
  return value.trim();
}

function sameStringArray(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, index) => v === b[index]);
}

function normalizeLineArray(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, LONG_PROFILE_LINE_MAX);
}

function lineArrayToText(lines: string[]): string {
  return lines.join("\n");
}

function normalizeCustomItems(items: AiLongTermProfileCustomItem[]): AiLongTermProfileCustomItem[] {
  return items
    .map((item) => ({
      title: item.title.trim().slice(0, 40),
      content: item.content.trim().slice(0, LONG_PROFILE_TEXT_MAX),
    }))
    .filter((item) => item.title.length > 0 && item.content.length > 0)
    .slice(0, LONG_PROFILE_ITEM_MAX);
}

function sameCustomItems(a: AiLongTermProfileCustomItem[], b: AiLongTermProfileCustomItem[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, i) => item.title === b[i]?.title && item.content === b[i]?.content);
}

function aiRangeTrendLabel(days: 14 | 30 | 90): string {
  if (days === 30) return "傾向=直近1か月の月ログ";
  if (days === 90) return "傾向=直近3か月の月ログ";
  return "傾向=月ログ参照なし";
}

export default function AiSettingsPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const { settings, patchSettings } = useSettings();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [customInstructions, setCustomInstructions] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [initialCustomInstructions, setInitialCustomInstructions] = useState("");
  const [initialSelectedTags, setInitialSelectedTags] = useState<string[]>([]);

  const [recalcLoading, setRecalcLoading] = useState(false);

  const [strengthsText, setStrengthsText] = useState("");
  const [challengesText, setChallengesText] = useState("");
  const [growthJourneyText, setGrowthJourneyText] = useState("");
  const [customItems, setCustomItems] = useState<AiLongTermProfileCustomItem[]>([]);
  const [computedAt, setComputedAt] = useState<string | null>(null);
  const [windowDays, setWindowDays] = useState<number>(90);

  const [initialStrengthsText, setInitialStrengthsText] = useState("");
  const [initialChallengesText, setInitialChallengesText] = useState("");
  const [initialGrowthJourneyText, setInitialGrowthJourneyText] = useState("");
  const [initialCustomItems, setInitialCustomItems] = useState<AiLongTermProfileCustomItem[]>([]);

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
        const profile = me.ai_long_term_profile;
        const strengths = lineArrayToText(profile?.strengths ?? []);
        const challenges = lineArrayToText(profile?.challenges ?? []);
        const growth = lineArrayToText(profile?.growth_journey ?? []);
        const items = normalizeCustomItems(me.ai_long_term_profile_user_custom_items ?? []);
        setCustomInstructions(custom);
        setSelectedTags(tags);
        setInitialCustomInstructions(custom);
        setInitialSelectedTags(tags);
        setStrengthsText(strengths);
        setChallengesText(challenges);
        setGrowthJourneyText(growth);
        setCustomItems(items);
        setInitialStrengthsText(strengths);
        setInitialChallengesText(challenges);
        setInitialGrowthJourneyText(growth);
        setInitialCustomItems(items);
        setComputedAt(profile?.meta?.computed_at ?? null);
        setWindowDays(profile?.meta?.source_window_days ?? 90);
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
    !sameStringArray(normalizedDraftTags, initialSelectedTags) ||
    strengthsText.trim() !== initialStrengthsText.trim() ||
    challengesText.trim() !== initialChallengesText.trim() ||
    growthJourneyText.trim() !== initialGrowthJourneyText.trim() ||
    !sameCustomItems(normalizeCustomItems(customItems), initialCustomItems);
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

  const updateCustomItem = (index: number, key: "title" | "content", value: string) => {
    setCustomItems((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const removeCustomItem = (index: number) => {
    setCustomItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addCustomItem = () => {
    setCustomItems((prev) => {
      if (prev.length >= LONG_PROFILE_ITEM_MAX) return prev;
      return [ ...prev, { title: "", content: "" } ];
    });
  };

  const onRecalculateProfile = async () => {
    if (recalcLoading) return;
    setRecalcLoading(true);
    setError(null);
    try {
      await recalculateAiLongTermProfile();
      setStatus("長期プロフィールの再計算を開始しました");
    } catch (e) {
      setError(e instanceof Error ? e.message : "再計算の開始に失敗しました");
    } finally {
      setRecalcLoading(false);
    }
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
      const normalizedCustomItems = normalizeCustomItems(customItems);
      const updated = await updateMe({
        ai_custom_instructions: normalizedDraftInstructions,
        ai_improvement_tags: normalizedDraftTags,
        ai_long_term_profile: {
          strengths: normalizeLineArray(strengthsText),
          challenges: normalizeLineArray(challengesText),
          growth_journey: normalizeLineArray(growthJourneyText),
          custom_items: normalizedCustomItems,
        },
      });
      await refresh();

      const nextCustom = updated.ai_custom_instructions ?? "";
      const nextTags = normalizeImprovementTags(updated.ai_improvement_tags ?? []);
      const profile = updated.ai_long_term_profile;
      const nextStrengths = lineArrayToText(profile?.strengths ?? []);
      const nextChallenges = lineArrayToText(profile?.challenges ?? []);
      const nextGrowth = lineArrayToText(profile?.growth_journey ?? []);
      const nextItems = normalizeCustomItems(updated.ai_long_term_profile_user_custom_items ?? normalizedCustomItems);
      setCustomInstructions(nextCustom);
      setSelectedTags(nextTags);
      setInitialCustomInstructions(nextCustom);
      setInitialSelectedTags(nextTags);
      setStrengthsText(nextStrengths);
      setChallengesText(nextChallenges);
      setGrowthJourneyText(nextGrowth);
      setCustomItems(nextItems);
      setInitialStrengthsText(nextStrengths);
      setInitialChallengesText(nextChallenges);
      setInitialGrowthJourneyText(nextGrowth);
      setInitialCustomItems(nextItems);
      setComputedAt(profile?.meta?.computed_at ?? null);
      setWindowDays(profile?.meta?.source_window_days ?? 90);
      void refresh().catch(() => undefined);
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      navigate(`/log?mode=day&date=${yyyy}-${mm}-${dd}`);
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
        <p className="aiSettingsPage__sub">回答スタイル指示（どう答えてほしいか）と改善したい項目を設定できます。</p>
      </section>

      {status && (
        <div className="aiSettingsPage__toast" role="status" aria-live="polite">
          {status}
        </div>
      )}

      {error && <div className="aiSettingsPage__error">{error}</div>}

      <section className="card aiSettingsPage__card">
        <div className="aiSettingsPage__sectionHead">
          <h2 className="aiSettingsPage__sectionTitle aiSettingsPage__sectionTitle--profile">AIが参照する長期プロフィール</h2>
          <button type="button" className="aiSettingsPage__ghostBtn" onClick={onRecalculateProfile} disabled={recalcLoading}>
            {recalcLoading ? "再計算中…" : "再計算"}
          </button>
        </div>
        <p className="aiSettingsPage__hint aiSettingsPage__hint--profile">
          自分の状態・課題・成長過程はここに記入してください。直近{windowDays}日の要約をもとに、必要に応じて修正できます（修正内容が優先されます）。
          {computedAt ? ` 最終更新: ${computedAt.slice(0, 16).replace("T", " ")}` : ""}
        </p>

        <div className="aiSettingsPage__longProfileGrid">
          <div>
            <div className="aiSettingsPage__previewLabel">強み（改行で複数）</div>
            <textarea className="aiSettingsPage__textarea aiSettingsPage__textarea--sm" rows={4} value={strengthsText} onChange={(e) => setStrengthsText(e.target.value)} />
          </div>
          <div>
            <div className="aiSettingsPage__previewLabel">課題（改行で複数）</div>
            <textarea className="aiSettingsPage__textarea aiSettingsPage__textarea--sm" rows={4} value={challengesText} onChange={(e) => setChallengesText(e.target.value)} />
          </div>
          <div>
            <div className="aiSettingsPage__previewLabel">成長過程（改行で複数）</div>
            <textarea className="aiSettingsPage__textarea aiSettingsPage__textarea--sm" rows={4} value={growthJourneyText} onChange={(e) => setGrowthJourneyText(e.target.value)} />
          </div>
        </div>

        <div className="aiSettingsPage__sectionHead" style={{ marginTop: 12 }}>
          <div className="aiSettingsPage__previewLabel">自由項目</div>
          <button type="button" className="aiSettingsPage__ghostBtn" onClick={addCustomItem} disabled={customItems.length >= LONG_PROFILE_ITEM_MAX}>
            項目追加
          </button>
        </div>
        <div className="aiSettingsPage__customItems">
          {customItems.length === 0 && <div className="aiSettingsPage__previewEmpty">未設定</div>}
          {customItems.map((item, index) => (
            <div key={`long-custom-${index}`} className="aiSettingsPage__customItemRow">
              <input
                className="aiSettingsPage__customTitle"
                value={item.title}
                onChange={(e) => updateCustomItem(index, "title", e.target.value)}
                placeholder="項目名"
                maxLength={40}
              />
              <textarea
                className="aiSettingsPage__textarea aiSettingsPage__textarea--sm"
                rows={3}
                value={item.content}
                onChange={(e) => updateCustomItem(index, "content", e.target.value)}
                placeholder="内容"
                maxLength={LONG_PROFILE_TEXT_MAX}
              />
              <button type="button" className="aiSettingsPage__ghostBtn" onClick={() => removeCustomItem(index)}>
                削除
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card aiSettingsPage__card">
        <div className="aiSettingsPage__sectionHead">
          <h2 className="aiSettingsPage__sectionTitle aiSettingsPage__sectionTitle--style">回答スタイル指示</h2>
          <button type="button" className="aiSettingsPage__ghostBtn" onClick={insertTemplate}>
            テンプレ挿入
          </button>
        </div>
        <p className="aiSettingsPage__hint aiSettingsPage__hint--style">
          回答トーン・説明の粒度・厳しさ・表現形式などを指定してください。あなたの状態や課題は上の「AIが参照する長期プロフィール」に記入します。
        </p>
        <div className="aiSettingsPage__textareaWrap">
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            className="aiSettingsPage__textarea"
            maxLength={CUSTOM_MAX}
            rows={8}
            placeholder="例: 結論を先に、短く具体的に。厳しさは中程度。手順は箇条書きで。"
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
        <div className="aiSettingsPage__sectionHead">
          <h2 className="aiSettingsPage__sectionTitle">AIおすすめの参照期間</h2>
        </div>
        <p className="aiSettingsPage__hint">14 / 30 / 90 から選択できます。</p>
        <div className="aiSettingsPage__rangeOptions">
          {[ 14, 30, 90 ].map((days) => (
            <button
              key={`ai-range-days-${days}`}
              type="button"
              className={`aiSettingsPage__rangeOption ${settings.aiRangeDays === days ? "is-active" : ""}`}
              onClick={() => patchSettings({ aiRangeDays: days as 14 | 30 | 90 })}
              aria-pressed={settings.aiRangeDays === days}
            >
              {days}日
            </button>
          ))}
        </div>
        <p className="aiSettingsPage__hint aiSettingsPage__hint--range">
          詳細=直近14日 / {aiRangeTrendLabel(settings.aiRangeDays)}
        </p>
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
