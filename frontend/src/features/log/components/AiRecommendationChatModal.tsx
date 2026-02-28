import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AiRecommendationThreadMessage } from "../../../types/aiRecommendation";
import "./AiRecommendationChatModal.css";

type Props = {
  open: boolean;
  onClose: () => void;
  messages: AiRecommendationThreadMessage[];
  canPost: boolean;
  remainingMessages: number;
  loading: boolean;
  sending: boolean;
  error: string | null;
  onSend: (message: string) => Promise<void>;
};

export default function AiRecommendationChatModal({
  open,
  onClose,
  messages,
  canPost,
  remainingMessages,
  loading,
  sending,
  error,
  onSend,
}: Props) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const remainingQuestions = Math.floor(remainingMessages / 2);
  const disableSend = sending || !canPost || draft.trim().length === 0 || remainingQuestions <= 0;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "40px";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [draft, open]);

  const postHint = useMemo(() => {
    if (canPost) return `残り ${remainingQuestions} / 10 質問`;
    return "当日のおすすめのみ会話できます（閲覧のみ）";
  }, [canPost, remainingQuestions]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="aiChatModal__overlay" role="dialog" aria-modal="true" aria-label="おすすめ質問" onClick={onClose}>
      <section className="card aiChatModal__card" onClick={(e) => e.stopPropagation()}>
        <div className="aiChatModal__head">
          <div>
            <div className="aiChatModal__title">おすすめへの質問</div>
          </div>
          <button type="button" className="aiChatModal__close" onClick={onClose}>閉じる</button>
        </div>

        <div className="aiChatModal__hint">{postHint}</div>
        {error && <div className="aiChatModal__error">{error}</div>}

        <div className="aiChatModal__body">
          {loading ? (
            <div className="aiChatModal__muted">読み込み中…</div>
          ) : messages.length === 0 ? (
            <div className="aiChatModal__muted">まだ会話はありません。おすすめの時間配分や順番を質問できます。</div>
          ) : (
            <ul className="aiChatModal__messages">
              {messages.map((message) => (
                <li key={message.id} className={`aiChatModal__message aiChatModal__message--${message.role}`}>
                  <div className="aiChatModal__role">{message.role === "user" ? "あなた" : "AI"}</div>
                  <div className="aiChatModal__text">{message.content}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form
          className="aiChatModal__composer"
          onSubmit={async (event) => {
            event.preventDefault();
            if (disableSend) return;
            const text = draft.trim();
            if (!text) return;
            await onSend(text);
            setDraft("");
          }}
        >
          <textarea
            ref={textareaRef}
            className="aiChatModal__textarea"
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="例: ロングトーンを長くしたい時は、何を意識すればいい？"
            disabled={!canPost || sending}
          />
          <button type="submit" className="aiChatModal__send" disabled={disableSend}>
            {sending ? "送信中…" : "送信"}
          </button>
        </form>
      </section>
    </div>,
    document.body
  );
}
