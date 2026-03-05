import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  fetchMe,
  recalculateAiLongTermProfile,
  updateMe,
  type AiLongTermProfile,
  type AiLongTermProfileCustomItem,
  type AiResponseStyleLevel,
  type AiResponseStylePrefs,
} from "../api/auth";
import { useAuth } from "../features/auth/useAuth";
import { useSettings } from "../features/settings/useSettings";
import {
  improvementTagToneClass,
  normalizeImprovementTags,
} from "../features/improvementTags/improvementTags";
import { IMPROVEMENT_TAG_OPTIONS } from "../types/community";

import "./AiSettingsPage.css";

const CUSTOM_MAX = 600;
const LONG_PROFILE_ITEM_MAX = 6;
const LONG_PROFILE_LINE_MAX = 6;
const LONG_PROFILE_TEXT_MAX = 220;

const FIXED_ITEM_TITLE_AVOID = "避けたい練習/注意点";

const DEFAULT_STYLE_PREFS: AiResponseStylePrefs = {
  style_tone: "default",
  warmth: "default",
  energy: "default",
  emoji: "default",
};

const STYLE_TONE_OPTIONS: Array<{
  value: AiResponseStylePrefs["style_tone"];
  label: string;
  description: string;
}> = [
  { value: "default", label: "デフォルト", description: "標準のスタイルとトーン" },
  { value: "professional", label: "プロフェッショナル", description: "正確で落ち着いた文体" },
  { value: "friendly", label: "フレンドリー", description: "親しみやすく柔らかい文体" },
  { value: "candid", label: "率直", description: "回りくどさを抑えて要点重視" },
  { value: "unique", label: "個性的", description: "少し印象的な表現を許容" },
  { value: "efficient", label: "効率的", description: "結論と手順を優先" },
  { value: "curious", label: "好奇心旺盛", description: "深掘りの問いを入れやすい" },
  { value: "cynical", label: "シニカル", description: "批評寄りで辛口" },
];

const STYLE_LEVEL_OPTIONS: Array<{
  value: AiResponseStyleLevel;
  label: string;
}> = [
  { value: "high", label: "多め" },
  { value: "default", label: "デフォルト" },
  { value: "low", label: "少なめ" },
];

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

function normalizeStyleTone(value: unknown): AiResponseStylePrefs["style_tone"] {
  const options = new Set(STYLE_TONE_OPTIONS.map((opt) => opt.value));
  const candidate = String(value ?? "").trim() as AiResponseStylePrefs["style_tone"];
  return options.has(candidate) ? candidate : DEFAULT_STYLE_PREFS.style_tone;
}

function normalizeStyleLevel(value: unknown): AiResponseStyleLevel {
  if (value === "high" || value === "low" || value === "default") return value;
  return "default";
}

function normalizeResponseStylePrefs(value: unknown): AiResponseStylePrefs {
  const raw = typeof value === "object" && value !== null ? (value as Partial<AiResponseStylePrefs>) : {};
  return {
    style_tone: normalizeStyleTone(raw.style_tone),
    warmth: normalizeStyleLevel(raw.warmth),
    energy: normalizeStyleLevel(raw.energy),
    emoji: normalizeStyleLevel(raw.emoji),
  };
}

function sameResponseStylePrefs(a: AiResponseStylePrefs, b: AiResponseStylePrefs): boolean {
  return (
    a.style_tone === b.style_tone &&
    a.warmth === b.warmth &&
    a.energy === b.energy &&
    a.emoji === b.emoji
  );
}

function splitFixedCustomItems(items: AiLongTermProfileCustomItem[]): {
  avoidPractice: string;
  extras: AiLongTermProfileCustomItem[];
} {
  let avoidPractice = "";
  const extras: AiLongTermProfileCustomItem[] = [];

  items.forEach((item) => {
    if (item.title === FIXED_ITEM_TITLE_AVOID) {
      avoidPractice = item.content;
      return;
    }
    extras.push(item);
  });

  return { avoidPractice, extras: normalizeCustomItems(extras) };
}

function buildCustomItemsFromInputs(input: {
  avoidPractice: string;
  extras: AiLongTermProfileCustomItem[];
}): AiLongTermProfileCustomItem[] {
  const fixed: AiLongTermProfileCustomItem[] = [];
  if (input.avoidPractice.trim()) fixed.push({ title: FIXED_ITEM_TITLE_AVOID, content: input.avoidPractice.trim() });

  return normalizeCustomItems([ ...fixed, ...normalizeCustomItems(input.extras) ]);
}

function formatComputedAt(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 16).replace("T", " ");
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
  const [responseStylePrefs, setResponseStylePrefs] = useState<AiResponseStylePrefs>(DEFAULT_STYLE_PREFS);

  const [initialCustomInstructions, setInitialCustomInstructions] = useState("");
  const [initialSelectedTags, setInitialSelectedTags] = useState<string[]>([]);
  const [initialResponseStylePrefs, setInitialResponseStylePrefs] = useState<AiResponseStylePrefs>(DEFAULT_STYLE_PREFS);

  const [recalcLoading, setRecalcLoading] = useState(false);

  const [strengthsText, setStrengthsText] = useState("");
  const [challengesText, setChallengesText] = useState("");
  const [growthJourneyText, setGrowthJourneyText] = useState("");
  const [avoidPracticeText, setAvoidPracticeText] = useState("");
  const [customItems, setCustomItems] = useState<AiLongTermProfileCustomItem[]>([]);
  const [computedAt, setComputedAt] = useState<string | null>(null);
  const [windowDays, setWindowDays] = useState<number>(90);

  const [initialStrengthsText, setInitialStrengthsText] = useState("");
  const [initialChallengesText, setInitialChallengesText] = useState("");
  const [initialGrowthJourneyText, setInitialGrowthJourneyText] = useState("");
  const [initialAvoidPracticeText, setInitialAvoidPracticeText] = useState("");
  const [initialCustomItems, setInitialCustomItems] = useState<AiLongTermProfileCustomItem[]>([]);

  const applyLongTermProfileState = (
    profile: AiLongTermProfile | undefined,
    userCustomItems: AiLongTermProfileCustomItem[]
  ) => {
    const strengths = lineArrayToText(profile?.strengths ?? []);
    const challenges = lineArrayToText(profile?.challenges ?? []);
    const growth = lineArrayToText(profile?.growth_journey ?? []);

    const normalizedAllItems = normalizeCustomItems(userCustomItems ?? []);
    const split = splitFixedCustomItems(normalizedAllItems);

    setStrengthsText(strengths);
    setChallengesText(challenges);
    setGrowthJourneyText(growth);
    setAvoidPracticeText(split.avoidPractice);
    setCustomItems(split.extras);

    setInitialStrengthsText(strengths);
    setInitialChallengesText(challenges);
    setInitialGrowthJourneyText(growth);
    setInitialAvoidPracticeText(split.avoidPractice);
    setInitialCustomItems(split.extras);

    setComputedAt(profile?.meta?.computed_at ?? null);
    setWindowDays(profile?.meta?.source_window_days ?? 90);
  };

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
        const stylePrefs = normalizeResponseStylePrefs(me.ai_response_style_prefs);
        setCustomInstructions(custom);
        setSelectedTags(tags);
        setResponseStylePrefs(stylePrefs);
        setInitialCustomInstructions(custom);
        setInitialSelectedTags(tags);
        setInitialResponseStylePrefs(stylePrefs);

        applyLongTermProfileState(
          me.ai_long_term_profile,
          normalizeCustomItems(me.ai_long_term_profile_user_custom_items ?? [])
        );
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
    !sameResponseStylePrefs(responseStylePrefs, initialResponseStylePrefs) ||
    strengthsText.trim() !== initialStrengthsText.trim() ||
    challengesText.trim() !== initialChallengesText.trim() ||
    growthJourneyText.trim() !== initialGrowthJourneyText.trim() ||
    avoidPracticeText.trim() !== initialAvoidPracticeText.trim() ||
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
      const normalizedCustomItems = buildCustomItemsFromInputs({
        avoidPractice: avoidPracticeText,
        extras: customItems,
      });

      const updated = await updateMe({
        ai_custom_instructions: normalizedDraftInstructions,
        ai_improvement_tags: normalizedDraftTags,
        ai_response_style_prefs: responseStylePrefs,
        ai_long_term_profile: {
          strengths: normalizeLineArray(strengthsText),
          challenges: normalizeLineArray(challengesText),
          growth_journey: normalizeLineArray(growthJourneyText),
          custom_items: normalizedCustomItems,
        },
      });

      const nextCustom = updated.ai_custom_instructions ?? "";
      const nextTags = normalizeImprovementTags(updated.ai_improvement_tags ?? []);
      const nextStylePrefs = normalizeResponseStylePrefs(updated.ai_response_style_prefs);
      const profile = updated.ai_long_term_profile;
      const nextItems = normalizeCustomItems(
        updated.ai_long_term_profile_user_custom_items ?? normalizedCustomItems
      );

      setCustomInstructions(nextCustom);
      setSelectedTags(nextTags);
      setResponseStylePrefs(nextStylePrefs);
      setInitialCustomInstructions(nextCustom);
      setInitialSelectedTags(nextTags);
      setInitialResponseStylePrefs(nextStylePrefs);
      applyLongTermProfileState(profile, nextItems);

      await refresh();
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
        <p className="aiSettingsPage__sub">回答スタイル・長期プロフィール・改善項目・参照期間を設定できます。</p>
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
          直近{windowDays}日の要約をもとに、ここで上書きできます（修正内容が優先されます）。
          {computedAt ? ` 最終更新: ${formatComputedAt(computedAt)}` : ""}
        </p>

        <div className="aiSettingsPage__subsection">
          <h3 className="aiSettingsPage__subTitle">声に関して</h3>
          <div className="aiSettingsPage__voiceEditor" role="group" aria-label="声に関して入力">
            <div className="aiSettingsPage__voiceField">
              <div className="aiSettingsPage__voiceFieldHead">
                <span className="aiSettingsPage__voiceFieldTitle">強み</span>
              </div>
              <textarea
                className="aiSettingsPage__voiceTextarea"
                rows={4}
                value={strengthsText}
                onChange={(e) => setStrengthsText(e.target.value)}
              />
            </div>

            <div className="aiSettingsPage__voiceField">
              <div className="aiSettingsPage__voiceFieldHead">
                <span className="aiSettingsPage__voiceFieldTitle">課題</span>
              </div>
              <textarea
                className="aiSettingsPage__voiceTextarea"
                rows={4}
                value={challengesText}
                onChange={(e) => setChallengesText(e.target.value)}
              />
            </div>

            <div className="aiSettingsPage__voiceField">
              <div className="aiSettingsPage__voiceFieldHead">
                <span className="aiSettingsPage__voiceFieldTitle">成長過程</span>
              </div>
              <textarea
                className="aiSettingsPage__voiceTextarea"
                rows={4}
                value={growthJourneyText}
                onChange={(e) => setGrowthJourneyText(e.target.value)}
              />
            </div>

            <div className="aiSettingsPage__voiceField">
              <div className="aiSettingsPage__voiceFieldHead">
                <span className="aiSettingsPage__voiceFieldTitle">避けたい練習/注意点</span>
              </div>
              <textarea
                className="aiSettingsPage__voiceTextarea"
                rows={4}
                value={avoidPracticeText}
                onChange={(e) => setAvoidPracticeText(e.target.value)}
                placeholder="喉締めしやすい練習は短めに、など"
              />
            </div>
          </div>
        </div>

      </section>

      <section className="card aiSettingsPage__card">
        <div className="aiSettingsPage__sectionHead">
          <h2 className="aiSettingsPage__sectionTitle aiSettingsPage__sectionTitle--style">回答スタイル</h2>
        </div>
        <p className="aiSettingsPage__hint aiSettingsPage__hint--style">
          回答スタイル指示が最優先で使われます。未指定部分を選択式で補完します。
        </p>

        <div className="aiSettingsPage__styleRows">
          <div className="aiSettingsPage__styleRow">
            <div>
              <div className="aiSettingsPage__previewLabel">基本のスタイルとトーン</div>
            </div>
            <select
              className="aiSettingsPage__styleSelect"
              value={responseStylePrefs.style_tone}
              onChange={(e) =>
                setResponseStylePrefs((prev) => ({
                  ...prev,
                  style_tone: normalizeStyleTone(e.target.value),
                }))
              }
            >
              {STYLE_TONE_OPTIONS.map((opt) => (
                <option key={`style-tone-${opt.value}`} value={opt.value}>
                  {opt.label} - {opt.description}
                </option>
              ))}
            </select>
          </div>

          <div className="aiSettingsPage__styleRow">
            <div>
              <div className="aiSettingsPage__previewLabel">温かみ</div>
              <p className="aiSettingsPage__hint">共感や寄り添いの強さ</p>
            </div>
            <select
              className="aiSettingsPage__styleSelect"
              value={responseStylePrefs.warmth}
              onChange={(e) =>
                setResponseStylePrefs((prev) => ({
                  ...prev,
                  warmth: normalizeStyleLevel(e.target.value),
                }))
              }
            >
              {STYLE_LEVEL_OPTIONS.map((opt) => (
                <option key={`style-warmth-${opt.value}`} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="aiSettingsPage__styleRow">
            <div>
              <div className="aiSettingsPage__previewLabel">熱量</div>
              <p className="aiSettingsPage__hint">励ましや勢いの強さ</p>
            </div>
            <select
              className="aiSettingsPage__styleSelect"
              value={responseStylePrefs.energy}
              onChange={(e) =>
                setResponseStylePrefs((prev) => ({
                  ...prev,
                  energy: normalizeStyleLevel(e.target.value),
                }))
              }
            >
              {STYLE_LEVEL_OPTIONS.map((opt) => (
                <option key={`style-energy-${opt.value}`} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="aiSettingsPage__styleRow">
            <div>
              <div className="aiSettingsPage__previewLabel">絵文字</div>
              <p className="aiSettingsPage__hint">文中の絵文字量</p>
            </div>
            <select
              className="aiSettingsPage__styleSelect"
              value={responseStylePrefs.emoji}
              onChange={(e) =>
                setResponseStylePrefs((prev) => ({
                  ...prev,
                  emoji: normalizeStyleLevel(e.target.value),
                }))
              }
            >
              {STYLE_LEVEL_OPTIONS.map((opt) => (
                <option key={`style-emoji-${opt.value}`} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="aiSettingsPage__previewLabel">カスタム指示</div>
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
