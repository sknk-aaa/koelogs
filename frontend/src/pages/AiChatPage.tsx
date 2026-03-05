import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  createAiChatThread,
  deleteAiChatThread,
  fetchAiChatThread,
  fetchAiChatThreads,
  postAiChatMessage,
  updateAiChatThread,
} from "../api/aiChat";
import { fetchAiRecommendationByDate, fetchAiRecommendationHistory } from "../api/aiRecommendations";
import type { AiChatMessage, AiChatThread } from "../types/aiChat";
import { useAuth } from "../features/auth/useAuth";
import PremiumUpsellModal from "../components/PremiumUpsellModal";
import TutorialModal from "../components/TutorialModal";
import searchIconDark from "../assets/chat/search-dark.svg";
import searchIconLight from "../assets/chat/search-light.svg";
import premiumFlowChatAi from "../assets/premium/flow-chat-ai.svg";
import "./AiChatPage.css";

const QUICK_PROMPTS = [
  "今日の30分メニューを作って",
  "高音で力まないコツを知りたい",
  "ロングトーンを伸ばす練習は？",
  "音程精度を上げる順番を教えて",
];
const INITIAL_RECO_VISIBLE = 10;
const RECO_VISIBLE_STEP = 10;
const ASSISTANT_TYPING_INTERVAL_MS = 14;
const ASSISTANT_TYPING_CHAR_STEP = 6;
const NEW_THREAD_TITLE = "新しい会話";
const AI_CHAT_FIRST_VISIT_SEEN_KEY_PREFIX = "koelogs:ai_chat_first_visit_seen:user_";
const MEMORY_SECTION_OPTIONS = ["課題", "強み", "成長過程", "避けたい練習/注意点"] as const;
type MemoryCandidatePromptInfo = { savedText: string; sectionLabel: string };

function splitMemoryCandidatePrompt(text: string): { bodyText: string; promptInfo: MemoryCandidatePromptInfo | null } {
  const normalized = text.replace(/\r\n?/g, "\n");
  const detailedMatch = normalized.match(
    /\n?保存候補を検出しました。\n保存内容：([^\n]+)\n保存先：AIが参照する長期プロフィール - ([^\n]+)\s*$/
  );
  if (detailedMatch) {
    const bodyText = normalized.slice(0, detailedMatch.index ?? normalized.length).trimEnd();
    return {
      bodyText,
      promptInfo: {
        savedText: detailedMatch[1].trim(),
        sectionLabel: detailedMatch[2].trim(),
      },
    };
  }

  if (/\n?保存候補を検出しました。\s*$/.test(normalized)) {
    return { bodyText: normalized.replace(/\n?保存候補を検出しました。\s*$/, "").trimEnd(), promptInfo: null };
  }

  return { bodyText: text, promptInfo: null };
}

function recommendationThreadTitle(date: string): string {
  return `${date} のおすすめに質問`;
}

function splitIntoSentences(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, "\n");
  const chunks = normalized.match(/[^。！？.!?\n]+[。！？.!?\n]?/g) ?? [];
  return chunks.map((chunk) => chunk.trimStart()).filter((chunk) => chunk.length > 0);
}

function renderBodyLine(line: string, key: string) {
  const trimmed = line.trim();
  if (!trimmed) return <div key={key} className="aiChatPage__msgSpacer" />;

  if (/^##\s+/.test(trimmed)) {
    return <p key={key} className="aiChatPage__msgHeading2">{trimmed.replace(/^##\s+/, "")}</p>;
  }
  if (/^###\s+/.test(trimmed)) {
    return <p key={key} className="aiChatPage__msgHeading3">{trimmed.replace(/^###\s+/, "")}</p>;
  }
  if (/^(?:[0-9]+[.)])\s+/.test(trimmed)) {
    return <p key={key} className="aiChatPage__msgListNum">{trimmed}</p>;
  }
  if (/^(?:・|-|\*)\s+/.test(trimmed)) {
    return <p key={key} className="aiChatPage__msgListItem">{trimmed.replace(/^(?:-|\*)\s+/, "・")}</p>;
  }
  if (/^(?:[🧭🎯✅📈📝💡🔍📌🗂🫁🔼]|[0-9]+[.)]|[■◆●]|【.+】)/.test(trimmed)) {
    return <p key={key} className="aiChatPage__msgHeading3">{trimmed}</p>;
  }
  return <p key={key} className="aiChatPage__msgParagraph">{trimmed}</p>;
}

function renderChatMessageText(text: string, role: "user" | "assistant") {
  const lines = text.split(/\r?\n/);
  const metaLines: string[] = [];
  let bodyStart = 0;

  if (role === "assistant") {
    for (let i = 0; i < lines.length; i += 1) {
      const t = lines[i].trim();
      if (!t) {
        bodyStart = i + 1;
        continue;
      }
      if (/^(参照データ|参照情報|質問意図)[:：]/.test(t)) {
        metaLines.push(t);
        bodyStart = i + 1;
        continue;
      }
      break;
    }
  }

  const bodyLines = lines.slice(bodyStart);
  return (
    <>
      {metaLines.length > 0 && (
        <details className="aiChatPage__msgMeta">
          <summary>参照情報を表示</summary>
          <div className="aiChatPage__msgMetaBody">
            {metaLines.map((line, idx) => (
              <p key={`meta-${idx}`}>{line}</p>
            ))}
          </div>
        </details>
      )}
      {bodyLines.map((line, idx) => renderBodyLine(line, `line-${idx}`))}
    </>
  );
}

export default function AiChatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { me } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [threads, setThreads] = useState<AiChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  const [activeThread, setActiveThread] = useState<AiChatThread | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);

  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [threadSearch, setThreadSearch] = useState("");
  const [sideOpen, setSideOpen] = useState(false);
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [threadMenuOpenId, setThreadMenuOpenId] = useState<number | null>(null);
  const [recoVisibleCount, setRecoVisibleCount] = useState(INITIAL_RECO_VISIBLE);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [recommendationLimitReached, setRecommendationLimitReached] = useState(false);
  const [firstRecoGuideOpen, setFirstRecoGuideOpen] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [memoryEditOpen, setMemoryEditOpen] = useState(false);
  const [memoryEditText, setMemoryEditText] = useState("");
  const [memoryEditSection, setMemoryEditSection] = useState<(typeof MEMORY_SECTION_OPTIONS)[number]>("課題");

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const tempMessageIdRef = useRef(-1);
  const typingTimerRef = useRef<number | null>(null);
  const navSeedHandledRef = useRef(false);
  const recommendationBootingRef = useRef(false);
  const initialLoadStartedRef = useRef(false);
  const isPremium = me?.plan_tier === "premium";

  const generalThreads = useMemo(
    () => threads.filter((thread) => thread.source_kind !== "ai_recommendation"),
    [threads]
  );
  const recommendationThreads = useMemo(
    () => threads.filter((thread) => thread.source_kind === "ai_recommendation"),
    [threads]
  );
  const filteredRecommendationThreads = useMemo(() => {
    const keyword = threadSearch.trim().toLowerCase();
    if (!keyword) return recommendationThreads;
    return recommendationThreads.filter((thread) => thread.title.toLowerCase().includes(keyword));
  }, [threadSearch, recommendationThreads]);
  const visibleRecommendationThreads = useMemo(
    () => filteredRecommendationThreads.slice(0, recoVisibleCount),
    [filteredRecommendationThreads, recoVisibleCount]
  );
  const remainingRecommendationCount = Math.max(0, filteredRecommendationThreads.length - visibleRecommendationThreads.length);

  const filteredGeneralThreads = useMemo(() => {
    const keyword = threadSearch.trim().toLowerCase();
    if (!keyword) return generalThreads;
    return generalThreads.filter((thread) => thread.title.toLowerCase().includes(keyword));
  }, [threadSearch, generalThreads]);
  const isRecommendationThread = activeThread?.source_kind === "ai_recommendation";
  const recommendationUserMessageCount = useMemo(
    () => messages.filter((message) => message.role === "user").length,
    [messages]
  );
  const latestAssistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === "assistant") return messages[i];
    }
    return null;
  }, [messages]);
  const memoryCandidatePrompt = useMemo(() => {
    if (!latestAssistantMessage) return null;
    return splitMemoryCandidatePrompt(latestAssistantMessage.content).promptInfo;
  }, [latestAssistantMessage]);
  const isRecommendationFollowupLocked =
    !isPremium &&
    isRecommendationThread &&
    (recommendationUserMessageCount >= 1 || recommendationLimitReached);
  const isEmptyThread = !!activeThreadId && !threadLoading && messages.length === 0;

  const isFirstVisit = useMemo(() => {
    if (!me) return false;
    try {
      return window.localStorage.getItem(`${AI_CHAT_FIRST_VISIT_SEEN_KEY_PREFIX}${me.id}`) !== "1";
    } catch {
      return true;
    }
  }, [me]);

  const markFirstVisitSeen = () => {
    if (!me) return;
    try {
      window.localStorage.setItem(`${AI_CHAT_FIRST_VISIT_SEEN_KEY_PREFIX}${me.id}`, "1");
    } catch {
      // no-op
    }
  };

  const clearTypingTimer = () => {
    if (typingTimerRef.current) {
      window.clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  };

  const openPremiumModal = () => {
    setPremiumModalOpen(true);
  };

  const animateAssistantMessage = (tempId: number, finalMessage: AiChatMessage): Promise<void> => {
    clearTypingTimer();

    const fullText = finalMessage.content;
    const sentences = splitIntoSentences(fullText);
    if (sentences.length === 0) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? finalMessage : m)));
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let sentenceIndex = 0;
      let charCursor = sentences[0].length;
      let displayedText = sentences[0];

      // 一文目が確定した時点で先に表示して、待ち時間の体感を減らす
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, content: displayedText } : m)));

      typingTimerRef.current = window.setInterval(() => {
        const currentSentence = sentences[sentenceIndex] ?? "";
        if (charCursor < currentSentence.length) {
          charCursor = Math.min(currentSentence.length, charCursor + ASSISTANT_TYPING_CHAR_STEP);
          const head = sentences.slice(0, sentenceIndex).join("");
          displayedText = head + currentSentence.slice(0, charCursor);
          setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, content: displayedText } : m)));
          return;
        }

        if (sentenceIndex < sentences.length - 1) {
          sentenceIndex += 1;
          charCursor = 0;
          return;
        }

        clearTypingTimer();
        setMessages((prev) => prev.map((m) => (m.id === tempId ? finalMessage : m)));
        resolve();
      }, ASSISTANT_TYPING_INTERVAL_MS);
    });
  };

  const loadThreads = async (targetActiveId?: number | null) => {
    const threadRes = await fetchAiChatThreads();
    if (!threadRes.ok) {
      setError(threadRes.errors.join("\n"));
      return;
    }
    setThreads(threadRes.data);

    const nextActiveId =
      targetActiveId ??
      (targetActiveId === null ? null : activeThreadId) ??
      threadRes.data[0]?.id ??
      null;

    if (!nextActiveId) {
      setActiveThreadId(null);
      setActiveThread(null);
      setMessages([]);
      return;
    }

    const exists = threadRes.data.some((t) => t.id === nextActiveId);
    setActiveThreadId(exists ? nextActiveId : (threadRes.data[0]?.id ?? null));
  };

  const hydrateThread = async (threadId: number): Promise<boolean> => {
    const detailRes = await fetchAiChatThread(threadId);
    if (!detailRes.ok) {
      setError(detailRes.errors.join("\n"));
      return false;
    }
    setActiveThreadId(threadId);
    setActiveThread(detailRes.data.thread);
    setMessages(detailRes.data.messages);
    setThreadLoading(false);
    return true;
  };

  const loadInitial = async () => {
    setLoading(true);
    setError(null);

    const threadRes = await fetchAiChatThreads();

    if (!threadRes.ok) {
      setError(threadRes.errors.join("\n"));
      setLoading(false);
      return;
    }

    if (isFirstVisit) {
      const latestRecoThread = threadRes.data
        .filter((thread) => thread.source_kind === "ai_recommendation")
        .sort((a, b) => {
          const aRef = a.source_date ?? a.created_at;
          const bRef = b.source_date ?? b.created_at;
          return bRef.localeCompare(aRef);
        })[0] ?? null;

      if (latestRecoThread) {
        setThreads(threadRes.data);
        setActiveThreadId(latestRecoThread.id);
        setFirstRecoGuideOpen(true);
        markFirstVisitSeen();
        setLoading(false);
        return;
      }

      const latestHistory = await fetchAiRecommendationHistory(1);
      if (!latestHistory.error && latestHistory.data.length > 0) {
        const latest = latestHistory.data[0];
        const recommendationRes = await fetchAiRecommendationByDate(
          latest.generated_for_date,
          (latest.range_days === 30 || latest.range_days === 90 ? latest.range_days : 14) as 14 | 30 | 90
        );
        const created = await createAiChatThread({
          title: recommendationThreadTitle(latest.generated_for_date),
          seed_assistant_message:
            recommendationRes.data?.recommendation_text?.trim() ||
            latest.recommendation_text_preview?.trim() ||
            undefined,
          source_kind: "ai_recommendation",
          source_date: latest.generated_for_date,
        });
        if (created.ok) {
          setThreads([created.data, ...threadRes.data]);
          setActiveThreadId(created.data.id);
          setFirstRecoGuideOpen(true);
          markFirstVisitSeen();
          setLoading(false);
          return;
        }
      }
    }

    const existingNewThread = threadRes.data.find(
      (thread) => thread.source_kind !== "ai_recommendation" && thread.title === NEW_THREAD_TITLE
    );
    if (existingNewThread) {
      setThreads(threadRes.data);
      setActiveThreadId(existingNewThread.id);
      setLoading(false);
      return;
    }

    if (isPremium) {
      const created = await createAiChatThread();
      if (!created.ok) {
        if (created.status === 402) {
          openPremiumModal();
        } else {
          setError(created.errors.join("\n"));
        }
        setLoading(false);
        return;
      }

      setThreads([created.data, ...threadRes.data]);
      setActiveThreadId(created.data.id);
      setLoading(false);
      return;
    }

    if (threadRes.data.length === 0) {
      const latestHistory = await fetchAiRecommendationHistory(1);
      if (!latestHistory.error && latestHistory.data.length > 0) {
        const latest = latestHistory.data[0];
        const recommendationRes = await fetchAiRecommendationByDate(
          latest.generated_for_date,
          (latest.range_days === 30 || latest.range_days === 90 ? latest.range_days : 14) as 14 | 30 | 90
        );
        const created = await createAiChatThread({
          title: recommendationThreadTitle(latest.generated_for_date),
          seed_assistant_message:
            recommendationRes.data?.recommendation_text?.trim() ||
            latest.recommendation_text_preview?.trim() ||
            undefined,
          source_kind: "ai_recommendation",
          source_date: latest.generated_for_date,
        });
        if (created.ok) {
          setThreads([created.data]);
          setActiveThreadId(created.data.id);
          setLoading(false);
          return;
        }
        if (created.status === 402) {
          openPremiumModal();
          setLoading(false);
          return;
        }
      }
    }

    setThreads(threadRes.data);
    setActiveThreadId(threadRes.data[0]?.id ?? null);
    setLoading(false);
  };

  useEffect(() => {
    if (initialLoadStartedRef.current) return () => clearTypingTimer();
    initialLoadStartedRef.current = true;
    void loadInitial();
    return () => clearTypingTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setRecoVisibleCount(INITIAL_RECO_VISIBLE);
  }, [recommendationThreads.length]);

  useEffect(() => {
    if (navSeedHandledRef.current) return;
    const state = location.state as
      | {
          source?: string;
          seedMessage?: string;
          recommendationDate?: string;
          recommendationText?: string;
        }
      | null;
    if (!state || state.source !== "ai_recommendation") return;
    navSeedHandledRef.current = true;
    if (recommendationBootingRef.current) return;
    recommendationBootingRef.current = true;

    void (async () => {
      const recommendationDate = state.recommendationDate?.trim();
      if (!recommendationDate) {
        navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
        recommendationBootingRef.current = false;
        return;
      }

      const seed = (state.seedMessage ?? "").trim();
      const recommendationText = (state.recommendationText ?? "").trim();
      if (seed.length > 0) {
        setDraft(seed);
      }

      const threadRes = await fetchAiChatThreads();
      if (!threadRes.ok) {
        setError(threadRes.errors.join("\n"));
        recommendationBootingRef.current = false;
        return;
      }

      let targetThread =
        threadRes.data.find(
          (thread) =>
            thread.source_kind === "ai_recommendation" && thread.source_date === recommendationDate
        ) ?? null;

      if (!targetThread && seed.length === 0) {
        navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
        recommendationBootingRef.current = false;
        return;
      }

      if (!targetThread) {
        const created = await createAiChatThread({
          title: recommendationThreadTitle(recommendationDate),
          seed_assistant_message: recommendationText.length > 0 ? recommendationText : undefined,
          source_kind: "ai_recommendation",
          source_date: recommendationDate,
        });
        if (!created.ok) {
          if (created.status === 402) {
            openPremiumModal();
            recommendationBootingRef.current = false;
            return;
          }
          setError(created.errors.join("\n"));
          recommendationBootingRef.current = false;
          return;
        }
        targetThread = created.data;
      }

      await loadThreads(targetThread.id);
      await hydrateThread(targetThread.id);

      if (seed.length > 0) await sendMessageToThread(targetThread.id, seed);

      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
      recommendationBootingRef.current = false;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  useEffect(() => {
    if (!activeThreadId) {
      setActiveThread(null);
      setMessages([]);
      setRecommendationLimitReached(false);
      setShowJumpToLatest(false);
      return;
    }

    let cancelled = false;
    setThreadLoading(true);
    setError(null);

    (async () => {
      const res = await fetchAiChatThread(activeThreadId);
      if (cancelled) return;
      if (!res.ok) {
        setError(res.errors.join("\n"));
        setThreadLoading(false);
        return;
      }
      setActiveThread(res.data.thread);
      setMessages(res.data.messages);
      setThreadLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeThreadId]);

  useEffect(() => {
    if (!isRecommendationThread || isPremium) {
      setRecommendationLimitReached(false);
    }
  }, [isRecommendationThread, isPremium]);

  useEffect(() => {
    if (!memoryCandidatePrompt) {
      setMemoryEditOpen(false);
      return;
    }
    setMemoryEditText(memoryCandidatePrompt.savedText);
    if (
      MEMORY_SECTION_OPTIONS.includes(
        memoryCandidatePrompt.sectionLabel as (typeof MEMORY_SECTION_OPTIONS)[number]
      )
    ) {
      setMemoryEditSection(memoryCandidatePrompt.sectionLabel as (typeof MEMORY_SECTION_OPTIONS)[number]);
    } else {
      setMemoryEditSection("課題");
    }
    setMemoryEditOpen(false);
  }, [memoryCandidatePrompt]);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    setShowJumpToLatest(false);
    bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages, activeThreadId, threadLoading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "44px";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [draft, activeThreadId]);

  const onCreateThread = async () => {
    if (!isPremium) {
      openPremiumModal();
      return;
    }
    setError(null);
    const res = await createAiChatThread();
    if (!res.ok) {
      if (res.status === 402) {
        openPremiumModal();
        return;
      }
      setError(res.errors.join("\n"));
      return;
    }
    await loadThreads(res.data.id);
  };

  const onRenameThread = async (thread: AiChatThread) => {
    const nextTitle = window.prompt("新しいチャット名", thread.title)?.trim();
    if (!nextTitle || nextTitle === thread.title) return;
    const res = await updateAiChatThread(thread.id, { title: nextTitle });
    if (!res.ok) {
      setError(res.errors.join("\n"));
      return;
    }
    setThreads((prev) => prev.map((item) => (item.id === res.data.id ? res.data : item)));
    if (activeThreadId === res.data.id) setActiveThread(res.data);
    setThreadMenuOpenId(null);
  };

  const onDeleteThread = async (thread: AiChatThread) => {
    if (!window.confirm(`チャット「${thread.title}」を削除します。よろしいですか？`)) return;
    const res = await deleteAiChatThread(thread.id);
    if (!res.ok) {
      setError(res.errors.join("\n"));
      return;
    }
    const remaining = threads.filter((item) => item.id !== res.data.id);
    setThreads(remaining);
    if (activeThreadId === res.data.id) {
      const nextId = remaining[0]?.id ?? null;
      setActiveThreadId(nextId);
      if (!nextId) {
        setActiveThread(null);
        setMessages([]);
      }
    }
    setThreadMenuOpenId(null);
  };

  const sendMessageToThread = async (
    threadId: number,
    rawText: string,
    options?: { restoreDraftOnError?: boolean }
  ) => {
    if (sending) return;
    const text = rawText.trim();
    if (!text) return;

    const optimisticId = tempMessageIdRef.current;
    tempMessageIdRef.current -= 1;
    const optimisticMessage: AiChatMessage = {
      id: optimisticId,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    shouldAutoScrollRef.current = true;
    setShowJumpToLatest(false);
    setMessages((prev) => [...prev, optimisticMessage]);
    setDraft("");
    setSending(true);
    setError(null);

    const res = await postAiChatMessage(threadId, text);
    if (!res.ok) {
      if (res.status === 402) {
        if (!isPremium && isRecommendationThread) {
          setRecommendationLimitReached(true);
        } else {
          openPremiumModal();
        }
      } else {
        setError(res.errors.join("\n"));
      }
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      if (options?.restoreDraftOnError) setDraft(text);
      setSending(false);
      return;
    }

    const tempAssistantId = tempMessageIdRef.current;
    tempMessageIdRef.current -= 1;
    const tempAssistant: AiChatMessage = {
      ...res.data.assistant_message,
      id: tempAssistantId,
      content: "",
    };

    setMessages((prev) => {
      const withoutOptimistic = prev.filter((m) => m.id !== optimisticId);
      return [...withoutOptimistic, res.data.user_message, tempAssistant];
    });

    setActiveThread(res.data.thread);
    setSending(false);
    await animateAssistantMessage(tempAssistantId, res.data.assistant_message);
    await loadThreads(res.data.thread.id);
  };

  const sendCurrentDraft = async () => {
    if (!activeThreadId || sending || isRecommendationFollowupLocked) return;
    await sendMessageToThread(activeThreadId, draft, { restoreDraftOnError: true });
  };
  const onSelectMemoryCandidateAction = async (action: "save_voice" | "skip") => {
    if (!activeThreadId || sending) return;
    const command = action === "save_voice" ? "保存（声に関して）" : "スキップ";
    await sendMessageToThread(activeThreadId, command);
  };
  const onSaveCorrectedMemoryCandidate = async () => {
    if (!activeThreadId || sending) return;
    const text = memoryEditText.replace(/\s+/g, " ").trim();
    if (!text) return;
    const command = [
      "保存（訂正）",
      `保存内容：${text}`,
      `保存先：AIが参照する長期プロフィール - ${memoryEditSection}`,
    ].join("\n");
    await sendMessageToThread(activeThreadId, command);
  };

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    await sendCurrentDraft();
  };

  const onToggleSide = () => {
    if (window.matchMedia("(max-width: 980px)").matches) {
      setSideOpen((prev) => !prev);
      return;
    }
    setSideCollapsed((prev) => !prev);
  };

  const isMobileViewport =
    typeof window !== "undefined" && window.matchMedia("(max-width: 980px)").matches;
  const isMobileInputMode =
    typeof window !== "undefined" && window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  const isSidebarOpen = isMobileViewport ? sideOpen : !sideCollapsed;
  const onMessagesScroll = () => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const thresholdPx = 80;
    const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    const nearBottom = distanceFromBottom <= thresholdPx;
    shouldAutoScrollRef.current = nearBottom;
    setShowJumpToLatest((prev) => (prev === !nearBottom ? prev : !nearBottom));
  };
  const onJumpToLatest = () => {
    shouldAutoScrollRef.current = true;
    setShowJumpToLatest(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };
  const selectThread = (threadId: number) => {
    shouldAutoScrollRef.current = true;
    setShowJumpToLatest(false);
    setActiveThreadId(threadId);
    setSideOpen(false);
    setThreadMenuOpenId(null);
  };

  return (
    <div className={`page aiChatPage ${activeThreadId ? "is-chat-open" : "is-empty"}`}>
      {error && <section className="aiChatPage__error" role="alert">{error}</section>}

      <section className={`aiChatPage__shell ${sideCollapsed ? "is-collapsed" : ""}`} aria-label="AIチャット">
        <aside
          className={`aiChatPage__side ${sideOpen ? "is-open" : ""} ${threadMenuOpenId !== null ? "is-thread-menu-open" : ""}`}
          aria-label="会話一覧"
        >
          <div className="aiChatPage__sideTop">
            <div className="aiChatPage__sideHead">
              <div className="aiChatPage__brand">AIチャット</div>
              {isMobileViewport ? (
                <button
                  type="button"
                  className={`aiChatPage__sideToggleBtn ${isSidebarOpen ? "is-open" : "is-closed"}`}
                  onClick={onToggleSide}
                  aria-label={isSidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
                  title={isSidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
                >
                  {isSidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
                </button>
              ) : (
                <button
                  type="button"
                  className="aiChatPage__sideCloseIconBtn"
                  onClick={onToggleSide}
                  aria-label="サイドバーを閉じる"
                  title="サイドバーを閉じる"
                >
                  ×
                </button>
              )}
            </div>
            <div className="aiChatPage__sideTopActions">
              <button
                type="button"
                className={`aiChatPage__newChatBtn ${!isPremium ? "is-premium-locked" : ""}`}
                onClick={onCreateThread}
              >
                <span>+ 新しいチャット</span>
                {!isPremium && (
                  <span className="aiChatPage__premiumLockLabel">
                    <span className="aiChatPage__premiumLockIcon" aria-hidden="true" />
                    <span>プレミアムプラン限定</span>
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="aiChatPage__sideContent">
            <div className="aiChatPage__searchField">
              <img className="aiChatPage__searchIcon aiChatPage__searchIcon--light" src={searchIconLight} alt="" aria-hidden="true" />
              <img className="aiChatPage__searchIcon aiChatPage__searchIcon--dark" src={searchIconDark} alt="" aria-hidden="true" />
              <input
                className="aiChatPage__input aiChatPage__searchInput"
                value={threadSearch}
                onChange={(e) => setThreadSearch(e.target.value)}
                placeholder="チャットを検索"
                aria-label="チャット検索"
              />
            </div>

            <div className="aiChatPage__threadSection">
              <div className="aiChatPage__threadSectionHead">
                <span>会話</span>
              </div>

              <div className={`aiChatPage__threadList ${threadMenuOpenId !== null ? "is-menu-open" : ""}`}>
                {loading ? (
                  <div className="aiChatPage__muted">読み込み中…</div>
                ) : filteredGeneralThreads.length === 0 ? (
                  <div className="aiChatPage__muted">会話がありません。</div>
                ) : (
                  filteredGeneralThreads.map((thread) => (
                    <article
                      key={thread.id}
                      className={`aiChatPage__threadItem ${activeThreadId === thread.id ? "is-active" : ""}`}
                    >
                      <button
                        type="button"
                        className="aiChatPage__threadMainBtn"
                        onClick={() => selectThread(thread.id)}
                      >
                        <div className="aiChatPage__threadTitle">{thread.title}</div>
                      </button>

                      <button
                        type="button"
                        className="aiChatPage__threadMenuBtn"
                        aria-label="チャット操作"
                        onClick={() => setThreadMenuOpenId((prev) => (prev === thread.id ? null : thread.id))}
                      >
                        <span className="aiChatPage__threadMenuDots" aria-hidden="true">•••</span>
                      </button>

                      {threadMenuOpenId === thread.id && (
                        <div className="aiChatPage__threadMenu" role="menu" aria-label="チャット操作メニュー">
                          <button type="button" className="aiChatPage__threadMenuItem" onClick={() => void onRenameThread(thread)}>
                            名前編集
                          </button>
                          <button type="button" className="aiChatPage__threadMenuItem is-danger" onClick={() => void onDeleteThread(thread)}>
                            削除
                          </button>
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>
            </div>
            <div className="aiChatPage__recoSection">
              <div className="aiChatPage__threadSectionHead">
                <span>AIおすすめ履歴</span>
              </div>
              <div className={`aiChatPage__recoList ${threadMenuOpenId !== null ? "is-menu-open" : ""}`}>
                {filteredRecommendationThreads.length === 0 ? (
                  <div className="aiChatPage__muted">会話済みのおすすめ履歴はありません。</div>
                ) : (
                  <>
                    {groupRecommendationThreads(visibleRecommendationThreads).map((group) => (
                      <section key={group.label} className="aiChatPage__recoGroup">
                        <div className="aiChatPage__recoGroupLabel">{group.label}</div>
                        {group.items.map((thread) => (
                          <article
                            key={thread.id}
                            className={`aiChatPage__threadItem aiChatPage__threadItem--reco ${activeThreadId === thread.id ? "is-active" : ""}`}
                          >
                            <button
                              type="button"
                              className="aiChatPage__threadMainBtn"
                              onClick={() => selectThread(thread.id)}
                            >
                              <div className="aiChatPage__threadTitle">{thread.title}</div>
                              {thread.source_date && <div className="aiChatPage__recoMeta">{thread.source_date}</div>}
                            </button>

                            <button
                              type="button"
                              className="aiChatPage__threadMenuBtn"
                              aria-label="チャット操作"
                              onClick={() => setThreadMenuOpenId((prev) => (prev === thread.id ? null : thread.id))}
                            >
                              <span className="aiChatPage__threadMenuDots" aria-hidden="true">•••</span>
                            </button>

                            {threadMenuOpenId === thread.id && (
                              <div className="aiChatPage__threadMenu" role="menu" aria-label="チャット操作メニュー">
                                <button type="button" className="aiChatPage__threadMenuItem" onClick={() => void onRenameThread(thread)}>
                                  名前編集
                                </button>
                                <button type="button" className="aiChatPage__threadMenuItem is-danger" onClick={() => void onDeleteThread(thread)}>
                                  削除
                                </button>
                              </div>
                            )}
                          </article>
                        ))}
                      </section>
                    ))}

                    {remainingRecommendationCount > 0 && (
                      <button
                        type="button"
                        className="aiChatPage__recoMoreBtn"
                        onClick={() => setRecoVisibleCount((prev) => prev + RECO_VISIBLE_STEP)}
                      >
                        もっと見る（残り {remainingRecommendationCount} 件）
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </aside>

        <section className={`aiChatPage__chatPane ${isEmptyThread ? "is-empty-thread" : ""}`} aria-label="チャット本文">
          {!activeThreadId ? (
            <div className={`aiChatPage__emptyStatePane ${loading ? "is-booting" : ""}`}>
              {loading ? (
                <div className="aiChatPage__bootCard" role="status" aria-live="polite">
                  <span className="aiChatPage__bootDot" aria-hidden="true" />
                  <div className="aiChatPage__bootTitle">新しい会話を準備中…</div>
                  <div className="aiChatPage__bootText">あなた専用のチャットを開いています</div>
                </div>
              ) : (
                <div className="aiChatPage__emptyActionCard">
                  <div className="aiChatPage__emptyActionTitle">何から始めますか？</div>
                  <p className="aiChatPage__emptyActionText">
                    新しい会話を作成して、AIコーチに相談できます。
                  </p>
                  <div className="aiChatPage__emptyActionButtons">
                    <button type="button" className="aiChatPage__sendBtn" onClick={() => void onCreateThread()}>
                      <span>新しい会話を作成</span>
                      <span className="aiChatPage__emptyPremiumTag">PREMIUM</span>
                    </button>
                    <Link to="/log" className="aiChatPage__logLink aiChatPage__logLink--empty">
                      ログページへ
                    </Link>
                  </div>
                  <div className="aiChatPage__heroChips">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="aiChatPage__chip"
                        onClick={() => {
                          setDraft(prompt);
                          void onCreateThread();
                        }}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <header className="aiChatPage__chatHead">
                <div className="aiChatPage__chatHeaderRow">
                  <div className="aiChatPage__chatHeaderLeft">
                    {isMobileViewport || !isSidebarOpen ? (
                      <button
                        type="button"
                        className="aiChatPage__chatOpenControl"
                        onClick={onToggleSide}
                        aria-label={isSidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
                        title={isSidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
                      >
                        <span className={`aiChatPage__chatHeadMenuBtn ${isSidebarOpen ? "is-open" : "is-closed"}`} aria-hidden="true">
                          <span className="aiChatPage__menuGlyph" aria-hidden="true">
                            <span className="aiChatPage__menuBar aiChatPage__menuBar--top" />
                            <span className="aiChatPage__menuBar aiChatPage__menuBar--middle" />
                            <span className="aiChatPage__menuBar aiChatPage__menuBar--bottom" />
                          </span>
                        </span>
                        <span className="aiChatPage__chatToolbarLabel">{isSidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}</span>
                      </button>
                    ) : (
                      <span className="aiChatPage__chatHeaderLeftPlaceholder" aria-hidden="true" />
                    )}
                  </div>

                  <div className="aiChatPage__chatThreadMeta">
                    <div className="aiChatPage__chatTitle">{activeThread?.title ?? "会話"}</div>
                    {!isMobileViewport && <div className="aiChatPage__chatMeta">{activeThread?.model_name ?? "-"}</div>}
                  </div>

                  <Link to="/log" className="aiChatPage__logLink">ログページへ</Link>
                </div>
              </header>

              <div
                className={`aiChatPage__messagesScroll ${isEmptyThread ? "is-empty-thread" : ""}`}
                ref={messagesScrollRef}
                onScroll={onMessagesScroll}
              >
                <div className="aiChatPage__messagesInner">
                  {threadLoading ? (
                    <div className="aiChatPage__muted">読み込み中…</div>
                  ) : messages.length === 0 ? (
                    <p className="aiChatPage__centerStartHint">声の悩みや練習内容を話してみましょう</p>
                  ) : (
                    messages.map((message) => {
                      const messageText =
                        message.role === "assistant"
                          ? splitMemoryCandidatePrompt(message.content).bodyText
                          : message.content;
                      return (
                        <article
                          key={message.id}
                          data-message-id={message.id}
                          className={`aiChatPage__msgRow aiChatPage__msgRow--${message.role}`}
                        >
                          <div className="aiChatPage__msgBubble">
                            <div className="aiChatPage__msgRole">{message.role === "user" ? "あなた" : "AIコーチ"}</div>
                            <div className="aiChatPage__msgText">{renderChatMessageText(messageText, message.role)}</div>
                          </div>
                        </article>
                      );
                    })
                  )}
                  {sending && (
                    <article className="aiChatPage__msgRow aiChatPage__msgRow--assistant aiChatPage__msgRow--thinking" aria-live="polite">
                      <div className="aiChatPage__thinkingInline">AIが考え中…</div>
                    </article>
                  )}
                  {memoryCandidatePrompt && (
                    <div className="aiChatPage__memoryActionsWrap">
                      <p className="aiChatPage__memoryActionsLead">このデータをユーザー情報として保存しますか？</p>
                      {memoryEditOpen ? (
                        <div className="aiChatPage__memoryEditBox">
                          <label className="aiChatPage__memoryEditLabel">
                            保存先
                            <select
                              className="aiChatPage__memoryEditSelect"
                              value={memoryEditSection}
                              onChange={(e) =>
                                setMemoryEditSection(e.target.value as (typeof MEMORY_SECTION_OPTIONS)[number])
                              }
                              disabled={sending}
                            >
                              {MEMORY_SECTION_OPTIONS.map((section) => (
                                <option key={section} value={section}>
                                  {section}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="aiChatPage__memoryEditLabel">
                            保存内容
                            <textarea
                              className="aiChatPage__memoryEditTextarea"
                              value={memoryEditText}
                              onChange={(e) => setMemoryEditText(e.target.value)}
                              rows={3}
                              maxLength={220}
                              disabled={sending}
                            />
                          </label>
                        </div>
                      ) : (
                        <>
                          <p className="aiChatPage__memoryActionsMeta">保存内容：{memoryCandidatePrompt.savedText}</p>
                          <p className="aiChatPage__memoryActionsMeta">
                            保存先：AIが参照する長期プロフィール - {memoryCandidatePrompt.sectionLabel}
                          </p>
                        </>
                      )}
                      <div className="aiChatPage__memoryActions" role="group" aria-label="保存候補の操作">
                        {memoryEditOpen ? (
                          <>
                            <button
                              type="button"
                              className="aiChatPage__memoryActionBtn is-primary"
                              onClick={() => void onSaveCorrectedMemoryCandidate()}
                              disabled={sending || !activeThreadId || memoryEditText.trim().length === 0}
                            >
                              訂正内容で保存
                            </button>
                            <button
                              type="button"
                              className="aiChatPage__memoryActionBtn"
                              onClick={() => setMemoryEditOpen(false)}
                              disabled={sending}
                            >
                              キャンセル
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="aiChatPage__memoryActionBtn is-primary"
                              onClick={() => void onSelectMemoryCandidateAction("save_voice")}
                              disabled={sending || !activeThreadId}
                            >
                              保存
                            </button>
                            <button
                              type="button"
                              className="aiChatPage__memoryActionBtn"
                              onClick={() => setMemoryEditOpen(true)}
                              disabled={sending}
                            >
                              訂正
                            </button>
                            <button
                              type="button"
                              className="aiChatPage__memoryActionBtn"
                              onClick={() => void onSelectMemoryCandidateAction("skip")}
                              disabled={sending || !activeThreadId}
                            >
                              スキップ
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {showJumpToLatest && (
                    <div className="aiChatPage__jumpLatestWrap">
                      <button type="button" className="aiChatPage__jumpLatestBtn" onClick={onJumpToLatest}>
                        最新へ
                      </button>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              </div>

              <form className="aiChatPage__composerWrap" onSubmit={onSend}>
                {sending && <div className="aiChatPage__composerStatus" role="status" aria-live="polite">生成中（数秒〜）</div>}
                <div className={`aiChatPage__composer ${isRecommendationFollowupLocked ? "is-locked" : ""}`}>
                  {isRecommendationFollowupLocked ? (
                    <div className="aiChatPage__textareaLock" role="status" aria-live="polite">
                      <span className="aiChatPage__textareaLockIcon" aria-hidden="true" />
                      <div className="aiChatPage__textareaLockBody">
                        <div className="aiChatPage__textareaLockTitle">本日の無料質問は完了しました</div>
                        <div className="aiChatPage__textareaLockText">プレミアムなら、このまま無制限で質問できます。</div>
                      </div>
                      <button type="button" className="aiChatPage__textareaLockCta" onClick={openPremiumModal}>
                        プレミアムを見る
                      </button>
                    </div>
                  ) : (
                    <textarea
                      ref={textareaRef}
                      className="aiChatPage__textarea"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (!isMobileInputMode && e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (!activeThreadId || sending || draft.trim().length === 0) return;
                          void sendCurrentDraft();
                        }
                      }}
                      rows={1}
                      maxLength={2000}
                      placeholder="質問してみましょう"
                      disabled={!activeThreadId}
                    />
                  )}
                  <button
                    type="submit"
                    className="aiChatPage__sendBtn"
                    disabled={!activeThreadId || sending || draft.trim().length === 0 || isRecommendationFollowupLocked}
                  >
                    {isRecommendationFollowupLocked ? "送信済み" : sending ? "送信中…" : "送信"}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </section>
      <button
        type="button"
        className={`aiChatPage__sideBackdrop ${sideOpen ? "is-open" : ""}`}
        onClick={() => setSideOpen(false)}
        aria-label="メニューを閉じる"
      />
      <PremiumUpsellModal
        open={premiumModalOpen}
        onClose={() => setPremiumModalOpen(false)}
        variant="lp"
        title="AIチャットを無制限で使う"
        onCta={() => {
          setPremiumModalOpen(false);
          navigate("/premium");
        }}
        description="無料プランでは、おすすめへの質問は1日1回までです。"
        flowBackgroundImageSrc={premiumFlowChatAi}
        flowBackgroundOpacity={0.24}
        flowSteps={[
          { title: "あなたの記録を根拠化", sub: "練習ログ・測定データをもとに回答", pill: "個人ログ" },
          { title: "集合知を活用", sub: "Koelogs独自のコミュニティ投稿データも反映", pill: "コミュニティ知見" },
          { title: "ボイトレ相談を自由に", sub: "自由に会話を作成して談可能", pill: "無制限" },
        ]}
        benefits={[
          "おすすめへの質問を回数制限なしで継続",
          "新しいチャットを自由に作成",
          "改善したいポイントを深掘り相談",
        ]}
        ctaLabel="プレミアムを見る"
      />
      <TutorialModal
        open={firstRecoGuideOpen}
        badge="AI GUIDE"
        title="AIおすすめメニューの相談をしてみましょう"
        paragraphs={["AIおすすめメニューで分からないことや不安な点があれば、質問してみましょう。"]}
        primaryLabel="わかった"
        onPrimary={() => setFirstRecoGuideOpen(false)}
        onClose={() => setFirstRecoGuideOpen(false)}
      />
    </div>
  );
}

function normalizeLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = out.getDay();
  const diff = (day + 6) % 7; // Monday start
  out.setDate(out.getDate() - diff);
  return out;
}

function groupRecommendationThreads(threads: AiChatThread[]): Array<{ label: "今週" | "今月" | "過去"; items: AiChatThread[] }> {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekStart = startOfWeek(todayStart);
  const thisYear = todayStart.getFullYear();
  const thisMonth = todayStart.getMonth();

  const groups: Array<{ label: "今週" | "今月" | "過去"; items: AiChatThread[] }> = [
    { label: "今週", items: [] },
    { label: "今月", items: [] },
    { label: "過去", items: [] },
  ];

  for (const thread of threads) {
    const refDate = normalizeLocalDate(thread.source_date) ?? normalizeLocalDate(thread.created_at);
    if (!refDate) {
      groups[2].items.push(thread);
      continue;
    }
    const d = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
    if (d >= weekStart) {
      groups[0].items.push(thread);
    } else if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) {
      groups[1].items.push(thread);
    } else {
      groups[2].items.push(thread);
    }
  }

  return groups.filter((g) => g.items.length > 0);
}
