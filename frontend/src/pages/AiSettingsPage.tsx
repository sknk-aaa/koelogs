import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  fetchMe,
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
import InfoModal from "../components/InfoModal";
import { InfoModalItem, InfoModalItems, InfoModalLead, InfoModalSection } from "../components/InfoModalSections";
import memoryOrganizeIcon from "../assets/ai_settings/memory-organize.svg";
import memoryPriorityIcon from "../assets/ai_settings/memory-priority.svg";
import memoryEditIcon from "../assets/ai_settings/memory-edit.svg";

import "./AiSettingsPage.css";

const CUSTOM_MAX = 600;
const GOAL_MAX = 50;
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

type StyleDropdownKey = "style_tone" | "warmth" | "energy" | "emoji";
type StyleDropdownOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

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

function renderAiSettingsSectionIcon(kind: "goal" | "memory" | "style" | "focus" | "range") {
  if (kind === "goal") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <circle cx="12" cy="12" r="7.5" />
        <circle cx="12" cy="12" r="4.5" />
        <circle className="accent-fill" cx="12" cy="12" r="1.7" />
        <path className="accent" d="m14.7 9.3 4-4" />
      </svg>
    );
  }
  if (kind === "memory") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M8 5.5h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" />
        <path d="M9.5 9h5" />
        <path d="M9.5 12h5" />
        <path d="M9.5 15h3.4" />
      </svg>
    );
  }
  if (kind === "style") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M7 6.2h10" />
        <path d="M9.2 12h5.6" />
        <path d="M10.8 17.8h2.4" />
        <path className="accent" d="M5.5 6.2h.01" />
        <path className="accent" d="M7.1 12h.01" />
        <path className="accent" d="M8.7 17.8h.01" />
      </svg>
    );
  }
  if (kind === "focus") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M4.8 8.2V5.8h2.4" />
        <path d="M19.2 8.2V5.8h-2.4" />
        <path d="M4.8 15.8v2.4h2.4" />
        <path d="M19.2 15.8v2.4h-2.4" />
        <circle className="accent-fill" cx="12" cy="12" r="2.1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M12 4v16" />
      <path d="M6.2 8h2.3" />
      <path d="M6.2 16h2.3" />
      <path d="M15.5 8h2.3" />
      <path d="M15.5 16h2.3" />
      <circle className="accent-fill" cx="12" cy="12" r="1.9" />
    </svg>
  );
}

export default function AiSettingsPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  useSettings();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [customInstructions, setCustomInstructions] = useState("");
  const [goalText, setGoalText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [responseStylePrefs, setResponseStylePrefs] = useState<AiResponseStylePrefs>(DEFAULT_STYLE_PREFS);

  const [initialCustomInstructions, setInitialCustomInstructions] = useState("");
  const [initialGoalText, setInitialGoalText] = useState("");
  const [initialSelectedTags, setInitialSelectedTags] = useState<string[]>([]);
  const [initialResponseStylePrefs, setInitialResponseStylePrefs] = useState<AiResponseStylePrefs>(DEFAULT_STYLE_PREFS);

  const [strengthsText, setStrengthsText] = useState("");
  const [challengesText, setChallengesText] = useState("");
  const [growthJourneyText, setGrowthJourneyText] = useState("");
  const [avoidPracticeText, setAvoidPracticeText] = useState("");
  const [customItems, setCustomItems] = useState<AiLongTermProfileCustomItem[]>([]);
  const [computedAt, setComputedAt] = useState<string | null>(null);
  const [openStyleMenu, setOpenStyleMenu] = useState<StyleDropdownKey | null>(null);
  const styleMenuRef = useRef<HTMLDivElement | null>(null);

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
        const goal = me.goal_text ?? "";
        const tags = normalizeImprovementTags(me.ai_improvement_tags ?? []);
        const stylePrefs = normalizeResponseStylePrefs(me.ai_response_style_prefs);
        setCustomInstructions(custom);
        setGoalText(goal);
        setSelectedTags(tags);
        setResponseStylePrefs(stylePrefs);
        setInitialCustomInstructions(custom);
        setInitialGoalText(goal);
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

  useEffect(() => {
    if (!openStyleMenu) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (styleMenuRef.current?.contains(target)) return;
      setOpenStyleMenu(null);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [openStyleMenu]);

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
    goalText.trim() !== initialGoalText.trim() ||
    !sameStringArray(normalizedDraftTags, initialSelectedTags) ||
    !sameResponseStylePrefs(responseStylePrefs, initialResponseStylePrefs) ||
    strengthsText.trim() !== initialStrengthsText.trim() ||
    challengesText.trim() !== initialChallengesText.trim() ||
    growthJourneyText.trim() !== initialGrowthJourneyText.trim() ||
    avoidPracticeText.trim() !== initialAvoidPracticeText.trim() ||
    !sameCustomItems(normalizeCustomItems(customItems), initialCustomItems);
  const canSave = !loading && !saving && !isOverLimit && isDirty;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = prev.includes(tag) ? prev.filter((v) => v !== tag) : [...prev, tag];
      return normalizeImprovementTags(next);
    });
  };

  const clearTags = () => {
    setSelectedTags([]);
  };

  const renderStyleDropdown = <T extends string>(
    key: StyleDropdownKey,
    value: T,
    options: Array<StyleDropdownOption<T>>,
    onSelect: (next: T) => void
  ) => {
    const selected = options.find((opt) => opt.value === value) ?? options[0];
    const isOpen = openStyleMenu === key;

    return (
      <div className={`aiSettingsPage__styleSelectWrap ${isOpen ? "is-open" : ""}`} ref={isOpen ? styleMenuRef : undefined}>
        <button
          type="button"
          className="aiSettingsPage__styleSelectBtn"
          onClick={() => setOpenStyleMenu((prev) => (prev === key ? null : key))}
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          <span className="aiSettingsPage__styleSelectValue">{selected.label}</span>
          <span className="aiSettingsPage__styleSelectChevron" aria-hidden="true" />
        </button>
        {isOpen ? (
          <div className="aiSettingsPage__styleMenu" role="menu">
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={`${key}-${opt.value}`}
                  type="button"
                  className={`aiSettingsPage__styleMenuItem ${active ? "is-active" : ""}`}
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    onSelect(opt.value);
                    setOpenStyleMenu(null);
                  }}
                >
                  <span className="aiSettingsPage__styleMenuText">
                    <span className="aiSettingsPage__styleMenuLabel">{opt.label}</span>
                    {opt.description ? <span className="aiSettingsPage__styleMenuDesc">{opt.description}</span> : null}
                  </span>
                  {active ? <span className="aiSettingsPage__styleMenuCheck">✓</span> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  };

  const onSave = async () => {
    if (!isDirty) {
      setStatus("更新された内容がありません");
      return;
    }
    if (!canSave) {
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
        goal_text: goalText.trim() || undefined,
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
      const nextGoal = updated.goal_text ?? "";
      const nextTags = normalizeImprovementTags(updated.ai_improvement_tags ?? []);
      const nextStylePrefs = normalizeResponseStylePrefs(updated.ai_response_style_prefs);
      const profile = updated.ai_long_term_profile;
      const nextItems = normalizeCustomItems(
        updated.ai_long_term_profile_user_custom_items ?? normalizedCustomItems
      );

      setCustomInstructions(nextCustom);
      setGoalText(nextGoal);
      setSelectedTags(nextTags);
      setResponseStylePrefs(nextStylePrefs);
      setInitialCustomInstructions(nextCustom);
      setInitialGoalText(nextGoal);
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
      {status && (
        <div className="aiSettingsPage__toast" role="status" aria-live="polite">
          {status}
        </div>
      )}

      {error && <div className="aiSettingsPage__error">{error}</div>}

      <section className="aiSettingsPage__section">
        <div className="aiSettingsPage__sectionHead">
          <div className="aiSettingsPage__sectionHeadMain">
            <span className="aiSettingsPage__sectionIcon" aria-hidden="true">
              {renderAiSettingsSectionIcon("goal")}
            </span>
            <div className="aiSettingsPage__sectionEyebrow">GOAL</div>
          </div>
        </div>
        <p className="aiSettingsPage__hint">
          AIおすすめの根拠として使う、今の目標を設定します。
        </p>
        <div className="aiSettingsPage__textareaWrap">
          <label className="aiSettingsPage__fieldLabel" htmlFor="ai-settings-goal-text">
            今月の目標
          </label>
          <input
            id="ai-settings-goal-text"
            className="aiSettingsPage__textInput"
            type="text"
            value={goalText}
            onChange={(e) => setGoalText(e.target.value.slice(0, GOAL_MAX))}
            placeholder="例：喉を閉めずにミドルを出す"
            maxLength={GOAL_MAX}
          />
          <div className="aiSettingsPage__countText">{goalText.trim().length}/{GOAL_MAX}</div>
        </div>
      </section>

      <section className="aiSettingsPage__section">
        <div className="aiSettingsPage__sectionHead">
          <div className="aiSettingsPage__sectionHeadMain">
            <span className="aiSettingsPage__sectionIcon" aria-hidden="true">
              {renderAiSettingsSectionIcon("memory")}
            </span>
            <div className="aiSettingsPage__sectionEyebrow">MEMORY</div>
          </div>
          <InfoModal title="ボイトレメモリとは？" triggerClassName="aiSettingsPage__memoryInfoBtn" bodyClassName="aiSettingsPage__memoryInfoBody">
            <InfoModalLead>
              あなたの練習メモをAIが整理し、「今の状態（強み・課題・成長）」をまとめます。
            </InfoModalLead>
            <InfoModalSection icon={renderAiSettingsSectionIcon("memory")} title="MEMORY">
              <InfoModalItems>
                <InfoModalItem
                  icon={<img src={memoryOrganizeIcon} alt="" aria-hidden="true" />}
                  title="悩みを整理"
                  description="同じ意味の悩み（喉が締まる / 詰まる）を、1つの課題にまとめます。"
                />
                <InfoModalItem
                  icon={<img src={memoryPriorityIcon} alt="" aria-hidden="true" />}
                  title="よく出る課題を表示"
                  description="一時的な不調より、継続している課題が上に表示されます。"
                />
                <InfoModalItem
                  icon={<img src={memoryEditIcon} alt="" aria-hidden="true" />}
                  title="内容は編集できます"
                  description="AI整理後も、内容はいつでも自由に修正できます。"
                  noDivider
                />
              </InfoModalItems>
            </InfoModalSection>
          </InfoModal>
        </div>
        <p className="aiSettingsPage__hint aiSettingsPage__hint--profile">
          今の声の状態について、自分で内容を書けます。AIとの会話やログの記録をもとに自動で追記されることもあります。
        </p>
        {computedAt ? <div className="aiSettingsPage__metaNote">最終更新: {formatComputedAt(computedAt)}</div> : null}

        <div className="aiSettingsPage__subsection">
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
                placeholder="例：低音は安定しやすい"
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
                placeholder="例：高音で喉が締まりやすい"
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
                placeholder="例：以前より裏声への切り替えが自然になった"
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
                placeholder="例：力んだらすぐに半音下げる"
              />
            </div>
          </div>
        </div>

      </section>

      <section className="aiSettingsPage__section">
        <div className="aiSettingsPage__sectionHead">
          <div className="aiSettingsPage__sectionHeadMain">
            <span className="aiSettingsPage__sectionIcon" aria-hidden="true">
              {renderAiSettingsSectionIcon("style")}
            </span>
            <div className="aiSettingsPage__sectionEyebrow">STYLE</div>
          </div>
        </div>
        <p className="aiSettingsPage__hint aiSettingsPage__hint--style">
          AIの回答スタイルをカスタマイズできます。
        </p>

        <div className="aiSettingsPage__styleRows">
          <div className="aiSettingsPage__styleRow aiSettingsPage__styleRow--lead">
            <div className="aiSettingsPage__styleCopy">
              <div className="aiSettingsPage__styleLabel">基本のスタイルとトーン</div>
              <p className="aiSettingsPage__styleDesc">AIの回答全体の雰囲気を設定できます。</p>
            </div>
            {renderStyleDropdown("style_tone", responseStylePrefs.style_tone, STYLE_TONE_OPTIONS, (next) =>
              setResponseStylePrefs((prev) => ({ ...prev, style_tone: next }))
            )}
          </div>

          <div className="aiSettingsPage__styleGroup">
            <div className="aiSettingsPage__styleGroupTitle">特性</div>
            <p className="aiSettingsPage__styleGroupDesc">基本のスタイルに加えて、追加のカスタマイズを選べます。</p>
          </div>

          <div className="aiSettingsPage__styleRow">
            <div className="aiSettingsPage__styleCopy">
              <div className="aiSettingsPage__styleLabel">温かみ</div>
            </div>
            {renderStyleDropdown(
              "warmth",
              responseStylePrefs.warmth,
              [
                { value: "high", label: "多め", description: "親しみやすく、より人間味のある表現" },
                { value: "default", label: "デフォルト" },
                { value: "low", label: "少なめ", description: "やや落ち着いた温度感で伝える" },
              ],
              (next) => setResponseStylePrefs((prev) => ({ ...prev, warmth: next }))
            )}
          </div>

          <div className="aiSettingsPage__styleRow">
            <div className="aiSettingsPage__styleCopy">
              <div className="aiSettingsPage__styleLabel">熱量</div>
            </div>
            {renderStyleDropdown(
              "energy",
              responseStylePrefs.energy,
              [
                { value: "high", label: "多め", description: "励ましや勢いをやや強める" },
                { value: "default", label: "デフォルト" },
                { value: "low", label: "少なめ", description: "落ち着いて簡潔に伝える" },
              ],
              (next) => setResponseStylePrefs((prev) => ({ ...prev, energy: next }))
            )}
          </div>

          <div className="aiSettingsPage__styleRow">
            <div className="aiSettingsPage__styleCopy">
              <div className="aiSettingsPage__styleLabel">絵文字</div>
            </div>
            {renderStyleDropdown(
              "emoji",
              responseStylePrefs.emoji,
              [
                { value: "high", label: "多め", description: "表情を少し豊かにする" },
                { value: "default", label: "デフォルト" },
                { value: "low", label: "少なめ", description: "絵文字を控えて簡潔にする" },
              ],
              (next) => setResponseStylePrefs((prev) => ({ ...prev, emoji: next }))
            )}
          </div>
        </div>

        <div className="aiSettingsPage__styleLabel aiSettingsPage__styleLabel--custom">カスタム指示</div>
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

      <section className="aiSettingsPage__section">
        <div className="aiSettingsPage__sectionHead">
          <div className="aiSettingsPage__sectionHeadMain">
            <span className="aiSettingsPage__sectionIcon" aria-hidden="true">
              {renderAiSettingsSectionIcon("focus")}
            </span>
            <div className="aiSettingsPage__sectionEyebrow">FOCUS</div>
          </div>
          {selectedTags.length > 0 && (
            <button type="button" className="aiSettingsPage__ghostBtn" onClick={clearTags}>
              全解除
            </button>
          )}
        </div>
        <p className="aiSettingsPage__hint">AIに重点的に見てほしい改善項目を選べます。複数選択できます。</p>
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
