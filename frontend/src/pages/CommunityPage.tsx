import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  createCommunityPost,
  favoriteCommunityPost,
  fetchCommunityPosts,
  fetchFavoriteCommunityPosts,
  unfavoriteCommunityPost,
} from "../api/community";
import { fetchTrainingMenus } from "../api/trainingMenus";
import { useAuth } from "../features/auth/useAuth";
import { avatarIconPath } from "../features/profile/avatarIcons";
import type { TrainingMenu } from "../types/trainingMenu";
import { IMPROVEMENT_TAG_OPTIONS, type CommunityPost } from "../types/community";

import "./CommunityPage.css";

type ListTab = "posts" | "favorites";
type BrowseSort = "newest" | "by_tag";

export default function CommunityPage() {
  const navigate = useNavigate();
  const { me } = useAuth();
  const [listTab, setListTab] = useState<ListTab>("posts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [favoritePosts, setFavoritePosts] = useState<CommunityPost[]>([]);
  const [highlightPostId, setHighlightPostId] = useState<number | null>(null);
  const [browseSort, setBrowseSort] = useState<BrowseSort>("newest");
  const [selectedBrowseTag, setSelectedBrowseTag] = useState<string>("");

  const [postModalOpen, setPostModalOpen] = useState(false);
  const [menus, setMenus] = useState<TrainingMenu[]>([]);
  const [menuId, setMenuId] = useState<number | "">("");
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState<number | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});

  const loadPosts = async () => {
    const data = await fetchCommunityPosts({ mineFirst: true, limit: 50 });
    setPosts(data);
  };

  const loadFavorites = async () => {
    if (!me) {
      setFavoritePosts([]);
      return;
    }
    const data = await fetchFavoriteCommunityPosts({ limit: 50 });
    setFavoritePosts(data);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const postsData = await fetchCommunityPosts({ mineFirst: true, limit: 50 });
        if (cancelled) return;
        setPosts(postsData);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "読み込みに失敗しました");
        setPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (listTab !== "favorites" || !me) return;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchFavoriteCommunityPosts({ limit: 50 });
        if (!cancelled) setFavoritePosts(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "お気に入りの取得に失敗しました");
          setFavoritePosts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listTab, me]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!postModalOpen || !me) return;
      try {
        const rows = await fetchTrainingMenus(false);
        if (!cancelled) {
          setMenus(rows);
          if (rows.length > 0) {
            setMenuId((prev) => (prev === "" ? rows[0].id : prev));
          }
        }
      } catch {
        if (!cancelled) setMenus([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me, postModalOpen]);

  const canSubmit = useMemo(() => {
    return typeof menuId === "number" && tags.length > 0;
  }, [menuId, tags.length]);

  const visiblePosts = useMemo(() => {
    const source = listTab === "posts" ? posts : favoritePosts;
    const base = [ ...source ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (browseSort === "newest") return base;
    if (!selectedBrowseTag) return base;
    return base.filter((post) => post.improvement_tags.includes(selectedBrowseTag));
  }, [listTab, posts, favoritePosts, browseSort, selectedBrowseTag]);

  const onToggleTag = (tagKey: string) => {
    setTags((prev) => (prev.includes(tagKey) ? prev.filter((v) => v !== tagKey) : [ ...prev, tagKey ]));
  };

  const onClickOpenPost = () => {
    if (!me) {
      navigate("/login", { state: { fromPath: "/community" } });
      return;
    }
    setPostModalOpen(true);
  };

  const closePostModal = () => {
    setPostModalOpen(false);
  };

  const onSubmit = async () => {
    if (!canSubmit || typeof menuId !== "number") return;
    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createCommunityPost({
        training_menu_id: menuId,
        improvement_tags: tags,
        comment: comment.trim() || undefined,
      });
      await loadPosts();
      if (listTab === "favorites" && me) await loadFavorites();
      setHighlightPostId(created.id);
      setListTab("posts");
      setComment("");
      setTags([]);
      closePostModal();
      setTimeout(() => setHighlightPostId(null), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "投稿に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onToggleFavorite = async (post: CommunityPost) => {
    if (!me || isFavoriting === post.id) return;
    setIsFavoriting(post.id);
    setError(null);
    try {
      if (post.favorited_by_me) {
        await unfavoriteCommunityPost(post.id);
      } else {
        await favoriteCommunityPost(post.id);
      }
      await loadPosts();
      if (listTab === "favorites") await loadFavorites();
    } catch (e) {
      setError(e instanceof Error ? e.message : "お気に入り更新に失敗しました");
    } finally {
      setIsFavoriting(null);
    }
  };

  return (
    <div className="page communityPage">
      <section className="communityPage__rankingGuideWrap">
        <Link className="communityPage__rankingGuide" to="/community/rankings">
          <span className="communityPage__rankingGuideIcon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M4 19h16" />
              <path d="M7 19v-4.5" />
              <path d="M12 19v-7.5" />
              <path d="M17 19v-10" />
              <path d="m6.5 10.5 4-2.8 3.2 1.9 3.8-3.2" />
            </svg>
          </span>
          <span className="communityPage__rankingGuideText">みんなの進捗を見る →</span>
        </Link>
      </section>

      <section className="card communityPage__controls">
        <div className="communityPage__segmentGroup" role="tablist" aria-label="投稿一覧切替">
          <button
            type="button"
            className={`communityPage__segmentBtn ${listTab === "posts" ? "is-active" : ""}`}
            onClick={() => setListTab("posts")}
            role="tab"
            aria-selected={listTab === "posts"}
          >
            投稿一覧
          </button>
          <button
            type="button"
            className={`communityPage__segmentBtn ${listTab === "favorites" ? "is-active" : ""}`}
            onClick={() => setListTab("favorites")}
            role="tab"
            aria-selected={listTab === "favorites"}
          >
            お気に入り
          </button>
        </div>
        <div className="communityPage__subTabs" role="tablist" aria-label="表示順切替">
          <button
            type="button"
            className={`communityPage__subTab ${browseSort === "newest" ? "is-active" : ""}`}
            onClick={() => setBrowseSort("newest")}
            role="tab"
            aria-selected={browseSort === "newest"}
          >
            新着一覧
          </button>
          <button
            type="button"
            className={`communityPage__subTab ${browseSort === "by_tag" ? "is-active" : ""}`}
            onClick={() => setBrowseSort("by_tag")}
            role="tab"
            aria-selected={browseSort === "by_tag"}
          >
            タグ別
          </button>
        </div>
        {browseSort === "by_tag" && (
          <div className="communityPage__tagFilter">
            <select
              className="communityPage__input"
              value={selectedBrowseTag}
              onChange={(e) => setSelectedBrowseTag(e.target.value)}
            >
              <option value="">タグを選択してください</option>
              {IMPROVEMENT_TAG_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {error && <section className="card communityPage__error">{error}</section>}

      <section className="communityPage__list">
        {listTab === "favorites" && !me ? (
          <div className="card communityPage__empty">
            お気に入りの閲覧にはログインが必要です。<Link to="/login">ログイン</Link>
          </div>
        ) : loading ? (
          <div className="card communityPage__empty">読み込み中…</div>
        ) : visiblePosts.length === 0 ? (
          <div className="card communityPage__empty">
            {listTab === "favorites" ? "お気に入り投稿がありません。" : "まだ投稿がありません。"}
          </div>
        ) : (
          visiblePosts.map((post) => (
            <article
              key={post.id}
              className={`card communityPage__post communityPage__listCard ${highlightPostId === post.id ? "is-highlight" : ""}`}
            >
              <div className="communityPage__cardHeader">
                {post.user.public && post.user.user_id ? (
                  <Link to={`/community/profile/${post.user.user_id}`} className="communityPage__cardUser">
                    <img
                      src={avatarIconPath(post.user.avatar_icon, post.user.avatar_image_url)}
                      alt={post.user.display_name ?? "ユーザー"}
                      className="communityPage__cardAvatar"
                    />
                    <div className="communityPage__cardUserMeta">
                      <div className="communityPage__cardUserName">
                        {post.user.display_name} <span>Lv.{post.user.level ?? 1}</span>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="communityPage__cardUser is-disabled">
                    <img src={avatarIconPath("note_blue")} alt="非公開ユーザー" className="communityPage__cardAvatar" />
                    <div className="communityPage__cardUserMeta">
                      <div className="communityPage__cardUserName">非公開ユーザー</div>
                    </div>
                  </div>
                )}
                <div className="communityPage__cardDate">{new Date(post.created_at).toLocaleDateString("ja-JP")}</div>
              </div>

              <div className="communityPage__cardBody">
                <div className="communityPage__fieldLabel--muted">効果のあったメニュー</div>
                <div className="communityPage__cardTitleMain">{post.menu_name}</div>
                {post.improvement_tags.length > 0 ? (
                  <>
                    <div className="communityPage__tagsLabel">感じられた効果</div>
                    <div className="communityPage__tags communityPage__tags--field">
                      {post.improvement_tags.map((tag) => {
                        const label = IMPROVEMENT_TAG_OPTIONS.find((x) => x.key === tag)?.label ?? tag;
                        const tagClass =
                          tag === "high_note_ease"
                            ? "communityPage__tag--purple"
                            : tag === "pitch_stability"
                              ? "communityPage__tag--blue"
                              : tag === "passaggio_smoothness"
                                ? "communityPage__tag--teal"
                                : tag === "less_breathlessness"
                                  ? "communityPage__tag--mint"
                                  : tag === "volume_stability"
                                    ? "communityPage__tag--orange"
                                    : tag === "less_throat_tension"
                                      ? "communityPage__tag--green"
                                      : tag === "resonance_clarity"
                                        ? "communityPage__tag--violet"
                                        : tag === "long_tone_sustain"
                                          ? "communityPage__tag--sky"
                                          : "communityPage__tag--neutral";
                        return (
                          <span key={`${post.id}-${tag}`} className={`communityPage__tag ${tagClass}`}>
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </>
                ) : null}
              </div>

              {post.comment?.trim() ? (() => {
                const trimmedComment = post.comment.trim();
                const isLong = trimmedComment.length > 140;
                const isExpanded = expandedComments[post.id] ?? false;
                const isCollapsed = isLong && !isExpanded;
                return (
                  <div className="communityPage__commentSection">
                    <div className={`communityPage__commentCard ${isCollapsed ? "is-collapsed" : ""}`}>
                      <p className={`communityPage__comment ${isCollapsed ? "is-collapsed" : ""}`}>{trimmedComment}</p>
                    </div>
                    {isLong ? (
                      <button
                        type="button"
                        className="communityPage__commentToggle"
                        onClick={() =>
                          setExpandedComments((prev) => ({
                            ...prev,
                            [post.id]: !isExpanded,
                          }))
                        }
                      >
                        {isExpanded ? "閉じる" : "もっと見る"}
                      </button>
                    ) : null}
                  </div>
                );
              })() : null}

              <div className="communityPage__cardDivider" />

              <div className="communityPage__footerMeta">
                <button
                  type="button"
                  className={`communityPage__favoriteBtn ${post.favorited_by_me ? "is-on" : ""}`}
                  disabled={!me || isFavoriting === post.id}
                  onClick={() => onToggleFavorite(post)}
                >
                  <span className="communityPage__favoriteBtnLabel">参考になった</span>
                  <span className="communityPage__favoriteBtnCount">{post.favorite_count}</span>
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      <button type="button" className="communityPage__fab" onClick={onClickOpenPost}>
        + 投稿する
      </button>

      {postModalOpen && (
        <div className="communityPage__modalOverlay" role="dialog" aria-modal="true" aria-label="投稿する">
          <section className="card communityPage__modal">
            <div className="communityPage__modalHead">
              <div className="communityPage__cardTitle">投稿する</div>
              <button type="button" className="communityPage__modalClose" onClick={closePostModal}>
                閉じる
              </button>
            </div>

            <div className="communityPage__modalBody">
              <section className="communityPage__editorCard">
                <div className="communityPage__editorTitle">メニュー</div>
                <div className="communityPage__editorHelper">例: ストローグリッサンド</div>
                <select
                  value={menuId}
                  className="communityPage__input"
                  onChange={(e) => setMenuId(Number.parseInt(e.target.value, 10) || "")}
                >
                  {menus.length === 0 && <option value="">メニューがありません</option>}
                  {menus.map((menu) => (
                    <option key={menu.id} value={menu.id}>
                      {menu.name}
                    </option>
                  ))}
                </select>
                {typeof menuId !== "number" ? (
                  <div className="communityPage__fieldHint is-error">メニューを選んでね</div>
                ) : null}
              </section>

              <section className="communityPage__editorCard">
                <div className="communityPage__editorTitle">効果タグ</div>
                <div className="communityPage__editorHelper">複数選択OK</div>
                <div className="communityPage__chipGrid">
                  {IMPROVEMENT_TAG_OPTIONS.map((opt) => {
                    const isOn = tags.includes(opt.key);
                    return (
                      <label key={opt.key} className={`communityPage__chip ${isOn ? "is-on" : ""}`}>
                        <input
                          type="checkbox"
                          checked={isOn}
                          onChange={() => onToggleTag(opt.key)}
                          className="communityPage__chipInput"
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
                {tags.length === 0 ? (
                  <div className="communityPage__fieldHint is-error">効果タグを1つ以上選んでね</div>
                ) : null}
              </section>

              <section className="communityPage__editorCard">
                <div className="communityPage__editorTitle">コメント</div>
                <div className="communityPage__editorHelper">短くでOK。感じたことをメモしてね</div>
                <textarea
                  className="communityPage__textarea"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={240}
                  placeholder="今日はここが良かった、など自由に。"
                />
              </section>
            </div>

            <div className="communityPage__modalFooter">
              <button type="button" className="communityPage__submit" disabled={!canSubmit || isSubmitting} onClick={onSubmit}>
                {isSubmitting ? "投稿中…" : "投稿する"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
