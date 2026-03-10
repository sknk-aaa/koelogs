import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { submitHelpContact, type ContactCategory } from "../api/helpContact";
import { useAuth } from "../features/auth/useAuth";
import AppSelect from "../components/AppSelect";
import "./HelpPages.css";

const SUBJECT_MAX = 80;
const MESSAGE_MAX = 1000;

const categoryOptions: Array<{ value: ContactCategory; label: string }> = [
  { value: "bug", label: "不具合" },
  { value: "request", label: "要望" },
  { value: "other", label: "その他" },
];

export default function HelpContactPage() {
  const { me } = useAuth();
  const [category, setCategory] = useState<ContactCategory>("bug");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [hasEditedEmail, setHasEditedEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (hasEditedEmail) return;
    if (!me?.email) return;
    setEmail(me.email);
  }, [hasEditedEmail, me?.email]);

  const currentSubjectLength = useMemo(() => subject.length, [subject.length]);
  const currentMessageLength = useMemo(() => message.length, [message.length]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("メールアドレスを入力してください。");
      return;
    }
    if (!subject.trim()) {
      setError("件名を入力してください。");
      return;
    }
    if (!message.trim()) {
      setError("本文を入力してください。");
      return;
    }

    setSubmitting(true);
    try {
      await submitHelpContact({
        category,
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      setSuccess("送信しました。返信が必要な場合は入力したメール宛に連絡します。");
      setCategory("bug");
      setSubject("");
      setMessage("");
      setEmail(me?.email ?? "");
      setHasEditedEmail(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page helpPage">
      <section className="helpPage__hero">
        <p className="helpPage__sub">不具合や要望があれば、ここから送れます。</p>
        <p className="helpPage__note">返信が必要な場合は、入力したメールアドレスへ連絡します。</p>
      </section>

      <section className="helpPage__contactSection">
        <form className="contactForm" onSubmit={onSubmit}>
          <label className="contactForm__field">
            <span className="contactForm__label">種別</span>
            <AppSelect
              className="contactForm__control contactForm__select"
              value={category}
              onChange={(value) => setCategory(value as ContactCategory)}
              disabled={submitting}
              options={categoryOptions.map((option) => ({ value: option.value, label: option.label }))}
              ariaLabel="お問い合わせ種別"
            />
          </label>

          <label className="contactForm__field">
            <span className="contactForm__label">メールアドレス</span>
            <input
              className="contactForm__control"
              type="email"
              value={email}
              onChange={(e) => {
                setHasEditedEmail(true);
                setEmail(e.target.value);
              }}
              autoComplete="email"
              maxLength={254}
              placeholder="you@example.com"
              disabled={submitting}
            />
          </label>

          <label className="contactForm__field">
            <span className="contactForm__label">件名</span>
            <input
              className="contactForm__control"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={SUBJECT_MAX}
              placeholder="例: ログページの表示が崩れる"
              disabled={submitting}
            />
            <span className="contactForm__meta">{currentSubjectLength}/{SUBJECT_MAX}</span>
          </label>

          <label className="contactForm__field">
            <span className="contactForm__label">本文</span>
            <textarea
              className="contactForm__control contactForm__textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={MESSAGE_MAX}
              placeholder="お問い合わせ内容を入力してください"
              disabled={submitting}
            />
            <span className="contactForm__meta">{currentMessageLength}/{MESSAGE_MAX}</span>
          </label>

          {error && <p className="contactForm__status contactForm__status--error">{error}</p>}
          {success && <p className="contactForm__status contactForm__status--success">{success}</p>}

          <div className="contactForm__submitRow">
            <button className="contactForm__submit" type="submit" disabled={submitting}>
              {submitting ? "送信中..." : "送信する"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
