import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  createCommunityTopicComment,
  deleteCommunityTopicComment,
  fetchCommunityTopic,
  likeCommunityTopic,
  unlikeCommunityTopic,
} from "../api/communityTopics";
import { useAuth } from "../features/auth/useAuth";
import { avatarIconPath } from "../features/profile/avatarIcons";
import type { CommunityTopicComment, CommunityTopicDetail } from "../types/communityTopics";
import { communityTopicCategoryLabel } from "../types/communityTopics";

import "./CommunityTopicDetailPage.css";

export default function CommunityTopicDetailPage() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const { me } = useAuth();
  const [topic, setTopic] = useState<CommunityTopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [replyOpenId, setReplyOpenId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [liking, setLiking] = useState(false);

  const numericTopicId = Number.parseInt(topicId ?? "", 10);

  const loadTopic = async () => {
    if (!Number.isFinite(numericTopicId)) {
      setError("投稿が見つかりません。");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchCommunityTopic(numericTopicId);
      setTopic(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "投稿の取得に失敗しました");
      setTopic(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTopic();
  }, [numericTopicId]);

  const requireLogin = () => {
    if (me) return true;
    navigate("/login", { state: { fromPath: `/community/topics/${numericTopicId}` } });
    return false;
  };

  const onToggleLike = async () => {
    if (!topic || liking) return;
    if (!requireLogin()) return;
    setLiking(true);
    setError(null);
    try {
      if (topic.liked_by_me) {
        await unlikeCommunityTopic(topic.id);
      } else {
        await likeCommunityTopic(topic.id);
      }
      await loadTopic();
    } catch (e) {
      setError(e instanceof Error ? e.message : "参考になった更新に失敗しました");
    } finally {
      setLiking(false);
    }
  };

  const onSubmitComment = async (parentId?: number) => {
    if (!topic || submitting) return;
    if (!requireLogin()) return;

    const body = (parentId ? replyDrafts[parentId] : commentBody).trim();
    if (body.length === 0) return;

    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await createCommunityTopicComment({ topicId: topic.id, body, parentId });
      if (parentId) {
        setReplyDrafts((prev) => ({ ...prev, [parentId]: "" }));
        setReplyOpenId(null);
      } else {
        setCommentBody("");
      }
      await loadTopic();
      setNotice(parentId ? "返信を投稿しました。" : "コメントを投稿しました。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "コメントの投稿に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteComment = async (commentId: number) => {
    if (!topic) return;
    const ok = window.confirm("このコメントを削除しますか？");
    if (!ok) return;

    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await deleteCommunityTopicComment(topic.id, commentId);
      await loadTopic();
      setNotice("コメントを削除しました。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "コメントの削除に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page communityTopicDetailPage">
      <div className="communityTopicDetailPage__head">
        <Link to="/community" className="communityTopicDetailPage__back">コミュニティへ戻る</Link>
      </div>

      {notice && <section className="communityTopicDetailPage__notice">{notice}</section>}
      {error && <section className="communityTopicDetailPage__error">{error}</section>}

      {loading ? (
        <section className="communityTopicDetailPage__empty">読み込み中…</section>
      ) : !topic ? (
        <section className="communityTopicDetailPage__empty">投稿が見つかりません。</section>
      ) : (
        <>
          <article className="communityTopicDetailPage__card">
            <div className="communityTopicDetailPage__metaRow">
              <span className="communityTopicDetailPage__category">{communityTopicCategoryLabel(topic.category)}</span>
              <span className="communityTopicDetailPage__date">{new Date(topic.created_at).toLocaleDateString("ja-JP")}</span>
            </div>

            <h1 className="communityTopicDetailPage__title">{topic.title}</h1>

            <div className="communityTopicDetailPage__authorRow">
              {topic.user.public && topic.user.user_id ? (
                <Link to={`/community/profile/${topic.user.user_id}`} className="communityTopicDetailPage__author">
                  <img
                    src={avatarIconPath(topic.user.avatar_icon, topic.user.avatar_image_url)}
                    alt={topic.user.display_name ?? "ユーザー"}
                    className="communityTopicDetailPage__avatar"
                  />
                  <span className="communityTopicDetailPage__authorName">
                    {topic.user.display_name} <span>Lv.{topic.user.level ?? 1}</span>
                  </span>
                </Link>
              ) : (
                <div className="communityTopicDetailPage__author is-disabled">
                  <img src={avatarIconPath("note_blue")} alt="非公開ユーザー" className="communityTopicDetailPage__avatar" />
                  <span className="communityTopicDetailPage__authorName">非公開ユーザー</span>
                </div>
              )}
            </div>

            <div className="communityTopicDetailPage__body">{topic.body}</div>

            <div className="communityTopicDetailPage__footer">
              <button
                type="button"
                className={`communityTopicDetailPage__likeBtn ${topic.liked_by_me ? "is-on" : ""}`}
                disabled={liking}
                onClick={onToggleLike}
              >
                <span>参考になった</span>
                <span>{topic.likes_count}</span>
              </button>
              <div className="communityTopicDetailPage__commentCount">コメント {topic.comments_count}</div>
            </div>
          </article>

          <section className="communityTopicDetailPage__comments">
            <div className="communityTopicDetailPage__sectionTitle">コメント</div>

            <div className="communityTopicDetailPage__commentList">
              {topic.comments.length === 0 ? (
                <div className="communityTopicDetailPage__empty">まだコメントがありません。</div>
              ) : (
                topic.comments.map((comment) => (
                  <CommentBlock
                    key={comment.id}
                    comment={comment}
                    replyOpen={replyOpenId === comment.id}
                    replyDraft={replyDrafts[comment.id] ?? ""}
                    onOpenReply={() => setReplyOpenId((prev) => (prev === comment.id ? null : comment.id))}
                    onChangeReply={(next) => setReplyDrafts((prev) => ({ ...prev, [comment.id]: next }))}
                    onSubmitReply={() => void onSubmitComment(comment.id)}
                    onDeleteComment={onDeleteComment}
                    submitting={submitting}
                  />
                ))
              )}
            </div>

            <div className="communityTopicDetailPage__composer">
              <textarea
                className="communityTopicDetailPage__textarea"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                maxLength={1000}
                placeholder="コメントを書く"
              />
              <button
                type="button"
                className="communityTopicDetailPage__submit"
                disabled={submitting || commentBody.trim().length === 0}
                onClick={() => void onSubmitComment()}
              >
                投稿する
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function CommentBlock({
  comment,
  replyOpen,
  replyDraft,
  onOpenReply,
  onChangeReply,
  onSubmitReply,
  onDeleteComment,
  submitting,
}: {
  comment: CommunityTopicComment;
  replyOpen: boolean;
  replyDraft: string;
  onOpenReply: () => void;
  onChangeReply: (next: string) => void;
  onSubmitReply: () => void;
  onDeleteComment: (commentId: number) => void;
  submitting: boolean;
}) {
  return (
    <article className="communityTopicDetailPage__commentCard">
      <CommentAuthor user={comment.user} createdAt={comment.created_at} />
      <div className="communityTopicDetailPage__commentBody">{comment.body}</div>
      <div className="communityTopicDetailPage__commentActions">
        <button type="button" className="communityTopicDetailPage__replyBtn" onClick={onOpenReply}>
          {replyOpen ? "閉じる" : "返信する"}
        </button>
        {comment.can_delete ? (
          <button type="button" className="communityTopicDetailPage__deleteBtn" onClick={() => onDeleteComment(comment.id)}>
            削除
          </button>
        ) : null}
      </div>

      {replyOpen ? (
        <div className="communityTopicDetailPage__replyComposer">
          <textarea
            className="communityTopicDetailPage__textarea communityTopicDetailPage__textarea--reply"
            value={replyDraft}
            onChange={(e) => onChangeReply(e.target.value)}
            maxLength={1000}
            placeholder="返信を書く"
          />
          <button
            type="button"
            className="communityTopicDetailPage__submit"
            disabled={submitting || replyDraft.trim().length === 0}
            onClick={onSubmitReply}
          >
            返信する
          </button>
        </div>
      ) : null}

      {comment.replies.length > 0 ? (
        <div className="communityTopicDetailPage__replies">
          {comment.replies.map((reply) => (
            <article key={reply.id} className="communityTopicDetailPage__replyCard">
              <CommentAuthor user={reply.user} createdAt={reply.created_at} />
              <div className="communityTopicDetailPage__commentBody">{reply.body}</div>
              {reply.can_delete ? (
                <div className="communityTopicDetailPage__commentActions">
                  <button type="button" className="communityTopicDetailPage__deleteBtn" onClick={() => onDeleteComment(reply.id)}>
                    削除
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function CommentAuthor({
  user,
  createdAt,
}: {
  user: CommunityTopicDetail["user"];
  createdAt: string;
}) {
  return (
    <div className="communityTopicDetailPage__commentHead">
      {user.public && user.user_id ? (
        <Link to={`/community/profile/${user.user_id}`} className="communityTopicDetailPage__author communityTopicDetailPage__author--comment">
          <img
            src={avatarIconPath(user.avatar_icon, user.avatar_image_url)}
            alt={user.display_name ?? "ユーザー"}
            className="communityTopicDetailPage__avatar communityTopicDetailPage__avatar--sm"
          />
          <span className="communityTopicDetailPage__authorName">
            {user.display_name} <span>Lv.{user.level ?? 1}</span>
          </span>
        </Link>
      ) : (
        <div className="communityTopicDetailPage__author communityTopicDetailPage__author--comment is-disabled">
          <img src={avatarIconPath("note_blue")} alt="非公開ユーザー" className="communityTopicDetailPage__avatar communityTopicDetailPage__avatar--sm" />
          <span className="communityTopicDetailPage__authorName">非公開ユーザー</span>
        </div>
      )}
      <div className="communityTopicDetailPage__date">{new Date(createdAt).toLocaleDateString("ja-JP")}</div>
    </div>
  );
}
