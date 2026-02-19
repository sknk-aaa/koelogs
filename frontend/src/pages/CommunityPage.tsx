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
  const [effectLevel, setEffectLevel] = useState<number>(3);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState<number | null>(null);

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
    return typeof menuId === "number" && effectLevel >= 1 && effectLevel <= 5 && tags.length > 0;
  }, [effectLevel, menuId, tags.length]);

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
        effect_level: effectLevel,
        comment: comment.trim() || undefined,
      });
      await loadPosts();
      if (listTab === "favorites" && me) await loadFavorites();
      setHighlightPostId(created.id);
      setListTab("posts");
      setComment("");
      setTags([]);
      setEffectLevel(3);
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
      <section className="card communityPage__hero">
        <div className="communityPage__kicker">Community</div>
        <h1 className="communityPage__title">コミュニティ</h1>
      </section>

      <section className="card communityPage__rankHero">
        <div className="communityPage__rankHeroVisual" aria-hidden="true">
          <img src={avatarIconPath("heart_red")} alt="" className="communityPage__rankHeroAvatar is-back" />
          <img src={avatarIconPath("note_blue")} alt="" className="communityPage__rankHeroAvatar is-front" />
          <span className="communityPage__rankHeroChat">💬</span>
        </div>
        <div className="communityPage__rankHeroMain">
          <div className="communityPage__rankHeroTitle">みんなの進捗ランキングをチェックしてみましょう！</div>
          <div className="communityPage__rankHeroSub">AIへの貢献数、連続練習日数、一週間の練習時間</div>
        </div>
        <div className="communityPage__rankHeroActions">
          <div className="communityPage__rankHeroDecor" aria-hidden="true">
            <span className="communityPage__rankHeroSpark">✦</span>
            <span className="communityPage__rankHeroTrophy">🏆</span>
          </div>
          <button
            type="button"
            className="communityPage__rankHeroBtn"
            onClick={() => navigate("/community/rankings")}
          >
            ランキングを見る
          </button>
        </div>
      </section>

      <section className="card communityPage__tabs communityPage__tabs--attached">
        <button
          type="button"
          className={`communityPage__tabBtn ${listTab === "posts" ? "is-active" : ""}`}
          onClick={() => setListTab("posts")}
        >
          投稿一覧
        </button>
        <button
          type="button"
          className={`communityPage__tabBtn ${listTab === "favorites" ? "is-active" : ""}`}
          onClick={() => setListTab("favorites")}
        >
          お気に入り
        </button>
      </section>

      {error && <section className="card communityPage__error">{error}</section>}

      <section className="communityPage__list">
        <div className="card communityPage__browseControls">
          <div className="communityPage__sortSwitch">
            <button
              type="button"
              className={`communityPage__sortBtn ${browseSort === "newest" ? "is-active" : ""}`}
              onClick={() => setBrowseSort("newest")}
            >
              新着一覧
            </button>
            <button
              type="button"
              className={`communityPage__sortBtn ${browseSort === "by_tag" ? "is-active" : ""}`}
              onClick={() => setBrowseSort("by_tag")}
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
        </div>

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
              <div className="communityPage__cardTop">
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
              </div>

              <div className="communityPage__cardTitleMain">
                効果のあったメニュー: {post.menu_name}
              </div>
              <div className="communityPage__threadStars" aria-label={`実感度 ${post.effect_level} / 5`}>
                <span className="communityPage__threadStarsLabel">効果実感度：</span>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <span
                    key={`${post.id}-star-${idx + 1}`}
                    className={`communityPage__threadStar ${idx < post.effect_level ? "is-on" : ""}`}
                    aria-hidden="true"
                  >
                    ★
                  </span>
                ))}
              </div>

              <div className="communityPage__fieldLine">
                <span className="communityPage__fieldLabel">感じられた効果:</span>
              </div>
              <div className="communityPage__tags communityPage__tags--field">
                {post.improvement_tags.map((tag) => {
                  const label = IMPROVEMENT_TAG_OPTIONS.find((x) => x.key === tag)?.label ?? tag;
                  return (
                    <span key={`${post.id}-${tag}`} className="communityPage__tag">
                      {label}
                    </span>
                  );
                })}
              </div>

              <div className="communityPage__cardDivider" />

              {post.comment?.trim() ? (
                <div className="communityPage__commentCard">
                  <p className="communityPage__comment">{post.comment}</p>
                </div>
              ) : null}

              <div className="communityPage__footerMeta">
                <span className="communityPage__footerDate">{new Date(post.created_at).toLocaleDateString("ja-JP")}</span>
                <button
                  type="button"
                  className={`communityPage__favoriteBtn ${post.favorited_by_me ? "is-on" : ""}`}
                  disabled={!me || isFavoriting === post.id}
                  onClick={() => onToggleFavorite(post)}
                >
                  <span className="communityPage__favoriteBtnCount">{post.favorite_count}</span>
                  <span className="communityPage__favoriteBtnStar" aria-hidden="true">
                    {post.favorited_by_me ? "★" : "☆"}
                  </span>
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

            <label className="communityPage__field">
              <div className="communityPage__label">メニュー（必須）</div>
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
            </label>

            <div className="communityPage__field">
              <div className="communityPage__label">効果タグ（必須・複数可）</div>
              <div className="communityPage__checks">
                {IMPROVEMENT_TAG_OPTIONS.map((opt) => (
                  <label key={opt.key} className="communityPage__check">
                    <input type="checkbox" checked={tags.includes(opt.key)} onChange={() => onToggleTag(opt.key)} />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="communityPage__field">
              <div className="communityPage__label">実感度（必須）</div>
              <select
                value={effectLevel}
                className="communityPage__input"
                onChange={(e) => setEffectLevel(Number.parseInt(e.target.value, 10) || 3)}
              >
                {[ 1, 2, 3, 4, 5 ].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <label className="communityPage__field">
              <div className="communityPage__label">コメント（任意）</div>
              <textarea
                className="communityPage__textarea"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={240}
              />
            </label>

            <button type="button" className="communityPage__submit" disabled={!canSubmit || isSubmitting} onClick={onSubmit}>
              {isSubmitting ? "投稿中…" : "投稿する"}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
