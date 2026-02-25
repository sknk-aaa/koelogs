import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  createCommunityPost,
  deleteCommunityPost,
  favoriteCommunityPost,
  fetchCommunityPosts,
  fetchFavoriteCommunityPosts,
  updateCommunityPost,
  unfavoriteCommunityPost,
} from "../api/community";
import { fetchTrainingMenus } from "../api/trainingMenus";
import { useAuth } from "../features/auth/useAuth";
import { emitGamificationRewards } from "../features/gamification/rewardBus";
import { avatarIconPath } from "../features/profile/avatarIcons";
import type { TrainingMenu } from "../types/trainingMenu";
import { IMPROVEMENT_TAG_OPTIONS, type CommunityPost } from "../types/community";
import InfoModal from "../components/InfoModal";

import "./CommunityPage.css";

type ListTab = "posts" | "favorites";
type BrowseSort = "newest" | "by_tag" | "mine";
const LEGACY_TAG_LABELS: Record<string, string> = {
  pitch_stability: "音程精度",
};

function tagToneClass(tag: string): string {
  return tag === "high_note_ease"
    ? "communityPage__tag--purple"
    : tag === "range_breadth"
      ? "communityPage__tag--rose"
      : tag === "pitch_accuracy" || tag === "pitch_stability"
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
}

export default function CommunityPage() {
  const navigate = useNavigate();
  const { me } = useAuth();
  const [listTab, setListTab] = useState<ListTab>("posts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [favoritePosts, setFavoritePosts] = useState<CommunityPost[]>([]);
  const [minePosts, setMinePosts] = useState<CommunityPost[]>([]);
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
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [actionMenuPostId, setActionMenuPostId] = useState<number | null>(null);

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

  const loadMinePosts = async () => {
    if (!me) {
      setMinePosts([]);
      return;
    }
    const data = await fetchCommunityPosts({ mineOnly: true, limit: 50 });
    setMinePosts(data);
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
      if (listTab !== "posts" || browseSort !== "mine" || !me) return;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCommunityPosts({ mineOnly: true, limit: 50 });
        if (!cancelled) setMinePosts(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "自分の投稿の取得に失敗しました");
          setMinePosts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listTab, browseSort, me]);

  useEffect(() => {
    if (me || browseSort !== "mine") return;
    setBrowseSort("newest");
    setMinePosts([]);
  }, [me, browseSort]);

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

  const isOwnPost = (post: CommunityPost) => me != null && post.user_id === me.id;

  const reloadAllLists = async () => {
    await loadPosts();
    if (!me) return;
    await Promise.all([ loadFavorites(), loadMinePosts() ]);
  };

  const visiblePosts = useMemo(() => {
    const source = listTab === "posts" ? (browseSort === "mine" ? minePosts : posts) : favoritePosts;
    const base = [ ...source ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (listTab === "posts" && browseSort === "mine") return base;
    if (browseSort === "newest") return base;
    if (!selectedBrowseTag) return base;
    return base.filter((post) => post.improvement_tags.includes(selectedBrowseTag));
  }, [listTab, posts, minePosts, favoritePosts, browseSort, selectedBrowseTag]);

  const onToggleTag = (tagKey: string) => {
    setTags((prev) => (prev.includes(tagKey) ? prev.filter((v) => v !== tagKey) : [ ...prev, tagKey ]));
  };

  const onClickOpenPost = () => {
    if (!me) {
      navigate("/login", { state: { fromPath: "/community" } });
      return;
    }
    setEditingPost(null);
    setTags([]);
    setComment("");
    setNotice(null);
    setError(null);
    setPostModalOpen(true);
  };

  const closePostModal = () => {
    setPostModalOpen(false);
    setEditingPost(null);
  };

  const onSubmit = async () => {
    if (!canSubmit || typeof menuId !== "number") return;
    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const trimmedComment = comment.trim();
      let savedPost: CommunityPost;
      if (editingPost) {
        savedPost = await updateCommunityPost(editingPost.id, {
          training_menu_id: menuId,
          improvement_tags: tags,
          comment: trimmedComment,
        });
      } else {
        const created = await createCommunityPost({
          training_menu_id: menuId,
          improvement_tags: tags,
          comment: trimmedComment || undefined,
        });
        savedPost = created.data;
        emitGamificationRewards(created.rewards);
      }
      await reloadAllLists();
      setHighlightPostId(savedPost.id);
      if (!editingPost) setListTab("posts");
      setNotice(editingPost ? "投稿を更新しました。" : "投稿しました。");
      setComment("");
      setTags([]);
      closePostModal();
      setTimeout(() => setHighlightPostId(null), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : editingPost ? "投稿の更新に失敗しました" : "投稿に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onToggleFavorite = async (post: CommunityPost) => {
    if (!me || isFavoriting === post.id) return;
    setIsFavoriting(post.id);
    setError(null);
    setNotice(null);
    try {
      if (post.favorited_by_me) {
        await unfavoriteCommunityPost(post.id);
      } else {
        await favoriteCommunityPost(post.id);
      }
      await reloadAllLists();
    } catch (e) {
      setError(e instanceof Error ? e.message : "お気に入り更新に失敗しました");
    } finally {
      setIsFavoriting(null);
    }
  };

  const onEditPost = (post: CommunityPost) => {
    if (!isOwnPost(post)) return;
    setEditingPost(post);
    setMenuId(post.training_menu_id);
    setTags([ ...post.improvement_tags ]);
    setComment(post.comment ?? "");
    setActionMenuPostId(null);
    setError(null);
    setNotice(null);
    setPostModalOpen(true);
  };

  const onDeletePost = async (post: CommunityPost) => {
    if (!isOwnPost(post) || !me) return;
    const ok = window.confirm("この投稿を削除しますか？この操作は取り消せません。");
    if (!ok) return;
    setError(null);
    setNotice(null);
    setActionMenuPostId(null);
    try {
      await deleteCommunityPost(post.id);
      await reloadAllLists();
      setExpandedComments((prev) => {
        const next = { ...prev };
        delete next[post.id];
        return next;
      });
      setNotice("投稿を削除しました。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "投稿の削除に失敗しました");
    }
  };

  useEffect(() => {
    if (actionMenuPostId == null) return;
    const onDocumentClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest(".communityPage__postActions")) return;
      setActionMenuPostId(null);
    };
    document.addEventListener("click", onDocumentClick);
    return () => {
      document.removeEventListener("click", onDocumentClick);
    };
  }, [actionMenuPostId]);

  return (
    <div className="page communityPage">
      <section className="card communityPage__introLine">
        <div className="communityPage__introText">
          <div className="communityPage__introBadge">コミュニティ</div>
          <div className="communityPage__introLead">ここでは「練習メニューの効果」を共有・閲覧できます。</div>
          <div className="communityPage__introSub">
            投稿はAIの分析にも活用され、「AIおすすめメニュー」の精度向上に反映されます。
          </div>
          <div className="communityPage__introNote">あなたの投稿が、みんなの練習をより良くします。</div>
        </div>
        <InfoModal
          title="「コミュニティ」でできること "
          bodyClassName="communityPage__communityInfo"
          triggerClassName="communityPage__introInfoBtn"
        >
          <section className="communityPage__communityInfoSection">
            <h3 className="communityPage__communityInfoTitle">みんなの練習</h3>
            <ul>
              <li>
                <span className="communityPage__communityInfoIcon" aria-hidden="true">🔎</span>
                <span>
                  <strong>閲覧</strong>：他のユーザーの「メニュー × 効果」を見られます。
                </span>
              </li>
              <li>
                <span className="communityPage__communityInfoIcon" aria-hidden="true">✍️</span>
                <span>
                  <strong>投稿</strong>：あなたの実践結果を共有できます（公開されます）。
                </span>
              </li>
              <li>
                <span className="communityPage__communityInfoIcon" aria-hidden="true">★</span>
                <span>
                  <strong>お気に入り</strong>：参考になった投稿を保存できます（ログインが必要）。
                </span>
              </li>
            </ul>
          </section>

          <section className="communityPage__communityInfoSection">
            <h3 className="communityPage__communityInfoTitle">みんなの進捗</h3>
            <div className="communityPage__communityInfoRank">
              <span className="communityPage__communityInfoIcon" aria-hidden="true">🏆</span>
              <span>
                ランキングでは、継続日数・週間XP・AI貢献度の上位メンバーを確認できます。<br />
                ほかのユーザーの取り組みを見て、日々の練習の目安にできます。
              </span>
            </div>
          </section>
        </InfoModal>
      </section>

      <section className="communityPage__rankingGuideWrap">
        <Link className="communityPage__rankingGuide uiCard uiCard--accent2 uiCard--interactive" to="/community/rankings">
          <span className="communityPage__rankingGuideIcon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M4 19h16" />
              <path d="M7 19v-4.5" />
              <path d="M12 19v-7.5" />
              <path d="M17 19v-10" />
              <path d="m6.5 10.5 4-2.8 3.2 1.9 3.8-3.2" />
            </svg>
          </span>
          <span className="communityPage__rankingGuideBody">
            <span className="communityPage__rankingGuideTitle">ランキングを見る</span>
            <span className="communityPage__rankingGuideDesc">みんなの進捗をチェックして刺激をもらう</span>
          </span>
          <span className="communityPage__rankingGuideArrow" aria-hidden="true">→</span>
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
            onClick={() => {
              setListTab("favorites");
              if (browseSort === "mine") setBrowseSort("newest");
            }}
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
          {me && (
            <button
              type="button"
              className={`communityPage__subTab ${browseSort === "mine" ? "is-active" : ""}`}
              onClick={() => {
                setListTab("posts");
                setBrowseSort("mine");
              }}
              role="tab"
              aria-selected={browseSort === "mine"}
            >
              自分の投稿
            </button>
          )}
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

      {notice && <section className="card communityPage__notice">{notice}</section>}
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
            {listTab === "favorites" ? "お気に入り投稿がありません。" : browseSort === "mine" ? "自分の投稿がまだありません。" : "まだ投稿がありません。"}
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
                <div className="communityPage__cardHeaderMeta">
                  <div className="communityPage__cardDate">{new Date(post.created_at).toLocaleDateString("ja-JP")}</div>
                  {isOwnPost(post) && (
                    <div className="communityPage__postActions">
                      <button
                        type="button"
                        className="communityPage__postActionTrigger"
                        aria-label="投稿メニュー"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionMenuPostId((prev) => (prev === post.id ? null : post.id));
                        }}
                      >
                        ⋯
                      </button>
                      {actionMenuPostId === post.id && (
                        <div className="communityPage__postActionMenu" onClick={(e) => e.stopPropagation()}>
                          <button type="button" className="communityPage__postActionItem" onClick={() => onEditPost(post)}>
                            編集
                          </button>
                          <button type="button" className="communityPage__postActionItem is-danger" onClick={() => onDeletePost(post)}>
                            削除
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="communityPage__cardBody">
                <div className="communityPage__fieldLabel--muted">効果のあったメニュー</div>
                <div className="communityPage__cardTitleMain">{post.menu_name}</div>
                {post.improvement_tags.length > 0 ? (
                  <>
                    <div className="communityPage__tagsLabel">感じられた効果</div>
                    <div className="communityPage__tags communityPage__tags--field">
                      {post.improvement_tags.map((tag) => {
                        const label = IMPROVEMENT_TAG_OPTIONS.find((x) => x.key === tag)?.label ?? LEGACY_TAG_LABELS[tag] ?? tag;
                        const tagClass = tagToneClass(tag);
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
              <div className="communityPage__cardTitle">{editingPost ? "投稿を編集" : "投稿する"}</div>
              <button type="button" className="communityPage__modalClose" onClick={closePostModal}>
                閉じる
              </button>
            </div>

            <div className="communityPage__modalBody">
              <section className="communityPage__editorCard">
                <div className="communityPage__editorTitle">メニュー</div>
                <div className="communityPage__editorHelper">例: 裏声リップロール</div>
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
                    const chipToneClass = tagToneClass(opt.key);
                    return (
                      <label
                        key={opt.key}
                        className={`communityPage__chip ${isOn ? `is-on ${chipToneClass}` : ""}`}
                      >
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
                <div className="communityPage__editorHelper">よかったら、メニューのやり方や効果を教えてね。</div>
                <textarea
                  className="communityPage__textarea"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={240}
                  placeholder="具体的なメニューの内容 / 感じられた効果 など"
                />
              </section>
            </div>

            <div className="communityPage__modalFooter">
              <button type="button" className="communityPage__submit" disabled={!canSubmit || isSubmitting} onClick={onSubmit}>
                {isSubmitting ? (editingPost ? "更新中…" : "投稿中…") : (editingPost ? "更新する" : "投稿する")}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
