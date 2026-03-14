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
import {
  createCommunityTopic,
  deleteCommunityTopic,
  fetchCommunityTopics,
  likeCommunityTopic,
  unlikeCommunityTopic,
  updateCommunityTopic,
} from "../api/communityTopics";
import { fetchTrainingMenus } from "../api/trainingMenus";
import { useAuth } from "../features/auth/useAuth";
import { emitGamificationRewards } from "../features/gamification/rewardBus";
import { improvementTagLabel, improvementTagToneClass } from "../features/improvementTags/improvementTags";
import { avatarIconPath } from "../features/profile/avatarIcons";
import type { TrainingMenu } from "../types/trainingMenu";
import {
  COMMUNITY_USED_SCALE_OPTIONS,
  IMPROVEMENT_TAG_OPTIONS,
  type CommunityPost,
  type CommunityUsedScaleType,
  usedScaleLabel,
} from "../types/community";
import {
  COMMUNITY_TOPIC_CATEGORY_OPTIONS,
  communityTopicCategoryLabel,
  type CommunityTopicCard,
  type CommunityTopicCategory,
  type CommunityTopicSort,
} from "../types/communityTopics";
import InfoModal from "../components/InfoModal";
import AppSelect from "../components/AppSelect";
import { InfoModalItem, InfoModalItems, InfoModalLead, InfoModalSection } from "../components/InfoModalSections";

import "./CommunityPage.css";

type BrowseTab = "newest" | "by_tag" | "favorites" | "mine";
type CommunitySection = "effects" | "topics";
type ComposerKind = "effect" | "topic";

const FREE_NOTE_TEMPLATE = [
  "改善された点:", "",
  "音域:", "",
  "意識した点:",
].join("\n");

const FREE_NOTE_PLACEHOLDER = "感じた効果や、意識したことがあれば自由に書いてください";

const browseTagOptions = [
  { value: "", label: "タグを選択してください" },
  ...IMPROVEMENT_TAG_OPTIONS.map((opt) => ({ value: opt.key, label: opt.label })),
];

function CommunityInfoIcon({ kind }: { kind: "browse" | "post" | "favorite" }) {
  if (kind === "browse") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <circle cx="11" cy="11" r="5.2" />
        <path className="accent" d="m15 15 4 4" />
      </svg>
    );
  }
  if (kind === "post") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M5.5 18.5h13" />
        <path d="M7.3 14.8 16.8 5.3" />
        <path className="accent" d="m15.4 4.8 3.8 3.8" />
        <path d="m6.2 17.8.8-3.6 2.8 2.8Z" />
      </svg>
    );
  }
  if (kind === "favorite") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path className="accent" d="m12 18.5-5.6-5.4a3.6 3.6 0 0 1 5.1-5.1L12 8.5l.5-.5a3.6 3.6 0 1 1 5.1 5.1Z" />
      </svg>
    );
  }
}

export default function CommunityPage() {
  const navigate = useNavigate();
  const { me } = useAuth();
  const [activeSection, setActiveSection] = useState<CommunitySection>("effects");
  const [activeTab, setActiveTab] = useState<BrowseTab>("newest");
  const [topicSort, setTopicSort] = useState<CommunityTopicSort>("newest");
  const [topicCategory, setTopicCategory] = useState<CommunityTopicCategory | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [favoritePosts, setFavoritePosts] = useState<CommunityPost[]>([]);
  const [minePosts, setMinePosts] = useState<CommunityPost[]>([]);
  const [topics, setTopics] = useState<CommunityTopicCard[]>([]);
  const [highlightPostId, setHighlightPostId] = useState<number | null>(null);
  const [highlightTopicId, setHighlightTopicId] = useState<number | null>(null);
  const [selectedBrowseTag, setSelectedBrowseTag] = useState<string>("");

  const [postModalOpen, setPostModalOpen] = useState(false);
  const [composerKind, setComposerKind] = useState<ComposerKind | null>(null);
  const [menus, setMenus] = useState<TrainingMenu[]>([]);
  const [menuId, setMenuId] = useState<number | "">("");
  const [tags, setTags] = useState<string[]>([]);
  const [usedScaleType, setUsedScaleType] = useState<CommunityUsedScaleType | "">("");
  const [usedScaleOtherText, setUsedScaleOtherText] = useState("");
  const [comment, setComment] = useState("");
  const [topicFormCategory, setTopicFormCategory] = useState<CommunityTopicCategory>("chat");
  const [topicTitle, setTopicTitle] = useState("");
  const [topicBody, setTopicBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState<number | null>(null);
  const [isTopicLiking, setIsTopicLiking] = useState<number | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [editingTopic, setEditingTopic] = useState<CommunityTopicCard | null>(null);
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

  const loadTopics = async () => {
    const data = await fetchCommunityTopics({ sort: topicSort, category: topicCategory, per: 50 });
    setTopics(data.items);
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
      if (activeTab !== "favorites" || !me) return;
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
  }, [activeTab, me]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (activeTab !== "mine" || !me) return;
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
  }, [activeTab, me]);

  useEffect(() => {
    if (me || activeTab !== "mine") return;
    setActiveTab("newest");
    setMinePosts([]);
  }, [me, activeTab]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (activeSection !== "topics") return;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCommunityTopics({ sort: topicSort, category: topicCategory, per: 50 });
        if (!cancelled) setTopics(data.items);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "コミュニティ投稿の取得に失敗しました");
          setTopics([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSection, topicSort, topicCategory]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!postModalOpen || !me || composerKind !== "effect") return;
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
  }, [composerKind, me, postModalOpen]);

  const canSubmitEffect = useMemo(() => {
    if (typeof menuId !== "number" || tags.length === 0) return false;
    if (usedScaleType === "") return false;
    if (comment.trim().length === 0) return false;
    if (usedScaleType === "other") return usedScaleOtherText.trim().length > 0;
    return true;
  }, [comment, menuId, tags.length, usedScaleType, usedScaleOtherText]);

  const canSubmitTopic = useMemo(
    () => topicTitle.trim().length > 0 && topicBody.trim().length > 0,
    [topicTitle, topicBody]
  );

  const isOwnPost = (post: CommunityPost) => me != null && post.user_id === me.id;
  const isOwnTopic = (topic: CommunityTopicCard) => me != null && topic.user_id === me.id;

  const reloadAllLists = async () => {
    await loadPosts();
    if (!me) return;
    await Promise.all([ loadFavorites(), loadMinePosts() ]);
  };

  const reloadTopics = async () => {
    await loadTopics();
  };

  const visiblePosts = useMemo(() => {
    const source =
      activeTab === "favorites"
        ? favoritePosts
        : activeTab === "mine"
          ? minePosts
          : posts;
    const base = [ ...source ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (activeTab === "favorites" || activeTab === "mine" || activeTab === "newest") return base;
    if (!selectedBrowseTag) return base;
    return base.filter((post) => post.improvement_tags.includes(selectedBrowseTag));
  }, [activeTab, posts, minePosts, favoritePosts, selectedBrowseTag]);

  const onToggleTag = (tagKey: string) => {
    setTags((prev) => (prev.includes(tagKey) ? prev.filter((v) => v !== tagKey) : [ ...prev, tagKey ]));
  };

  const onInsertCommentTemplate = () => {
    setComment((prev) => {
      if (prev.includes(FREE_NOTE_TEMPLATE)) return prev;
      if (prev.trim().length === 0) return FREE_NOTE_TEMPLATE;
      return `${prev.replace(/\s*$/, "")}\n\n${FREE_NOTE_TEMPLATE}`;
    });
  };

  const onClickOpenPost = () => {
    if (!me) {
      navigate("/login", { state: { fromPath: "/community" } });
      return;
    }
    setComposerKind(activeSection === "effects" ? "effect" : "topic");
    setEditingPost(null);
    setEditingTopic(null);
    setTags([]);
    setUsedScaleType("");
    setUsedScaleOtherText("");
    setComment("");
    setTopicFormCategory("chat");
    setTopicTitle("");
    setTopicBody("");
    setNotice(null);
    setError(null);
    setPostModalOpen(true);
  };

  const closePostModal = () => {
    setPostModalOpen(false);
    setComposerKind(null);
    setEditingPost(null);
    setEditingTopic(null);
  };

  const onSubmit = async () => {
    if (composerKind === "effect") {
      if (!canSubmitEffect || typeof menuId !== "number" || usedScaleType === "") return;
      setIsSubmitting(true);
      setError(null);
      setNotice(null);
      try {
        const selectedScaleType: CommunityUsedScaleType = usedScaleType;
        const trimmedComment = comment.trim();
        let savedPost: CommunityPost;
        if (editingPost) {
          savedPost = await updateCommunityPost(editingPost.id, {
            training_menu_id: menuId,
            improvement_tags: tags,
            used_scale_type: selectedScaleType,
            used_scale_other_text: selectedScaleType === "other" ? usedScaleOtherText.trim() : undefined,
            comment: trimmedComment,
          });
        } else {
          const created = await createCommunityPost({
            training_menu_id: menuId,
            improvement_tags: tags,
            used_scale_type: selectedScaleType,
            used_scale_other_text: selectedScaleType === "other" ? usedScaleOtherText.trim() : undefined,
            comment: trimmedComment || undefined,
          });
          savedPost = created.data;
          emitGamificationRewards(created.rewards);
        }
        await reloadAllLists();
        setHighlightPostId(savedPost.id);
        setActiveSection("effects");
        if (!editingPost) setActiveTab("newest");
        setNotice(editingPost ? "投稿を更新しました。" : "投稿しました。");
        setComment("");
        setTags([]);
        setUsedScaleType("");
        setUsedScaleOtherText("");
        closePostModal();
        setTimeout(() => setHighlightPostId(null), 5000);
      } catch (e) {
        setError(e instanceof Error ? e.message : editingPost ? "投稿の更新に失敗しました" : "投稿に失敗しました");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (composerKind !== "topic" || !canSubmitTopic) return;
    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      let savedTopic: CommunityTopicCard;
      if (editingTopic) {
        savedTopic = await updateCommunityTopic(editingTopic.id, {
          category: topicFormCategory,
          title: topicTitle.trim(),
          body: topicBody.trim(),
        });
      } else {
        savedTopic = await createCommunityTopic({
          category: topicFormCategory,
          title: topicTitle.trim(),
          body: topicBody.trim(),
        });
      }
      await reloadTopics();
      setHighlightTopicId(savedTopic.id);
      setActiveSection("topics");
      setNotice(editingTopic ? "投稿を更新しました。" : "投稿しました。");
      setTopicFormCategory("chat");
      setTopicTitle("");
      setTopicBody("");
      closePostModal();
      setTimeout(() => setHighlightTopicId(null), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : editingTopic ? "投稿の更新に失敗しました" : "投稿に失敗しました");
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
    setComposerKind("effect");
    setEditingPost(post);
    setEditingTopic(null);
    setMenuId(post.training_menu_id);
    setTags([ ...post.improvement_tags ]);
    setUsedScaleType(post.used_scale_type);
    setUsedScaleOtherText(post.used_scale_other_text ?? "");
    setComment(post.comment ?? "");
    setActionMenuPostId(null);
    setError(null);
    setNotice(null);
    setPostModalOpen(true);
  };

  const onEditTopic = (topic: CommunityTopicCard) => {
    if (!isOwnTopic(topic)) return;
    setComposerKind("topic");
    setEditingTopic(topic);
    setEditingPost(null);
    setTopicFormCategory(topic.category);
    setTopicTitle(topic.title);
    setTopicBody(topic.body);
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

  const onDeleteTopic = async (topic: CommunityTopicCard) => {
    if (!isOwnTopic(topic) || !me) return;
    const ok = window.confirm("この投稿を削除しますか？この操作は取り消せません。");
    if (!ok) return;
    setError(null);
    setNotice(null);
    setActionMenuPostId(null);
    try {
      await deleteCommunityTopic(topic.id);
      await reloadTopics();
      setNotice("投稿を削除しました。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "投稿の削除に失敗しました");
    }
  };

  const onToggleTopicLike = async (topic: CommunityTopicCard) => {
    if (!me || isTopicLiking === topic.id) return;
    setIsTopicLiking(topic.id);
    setError(null);
    setNotice(null);
    try {
      if (topic.liked_by_me) {
        await unlikeCommunityTopic(topic.id);
      } else {
        await likeCommunityTopic(topic.id);
      }
      await reloadTopics();
    } catch (e) {
      setError(e instanceof Error ? e.message : "参考になった更新に失敗しました");
    } finally {
      setIsTopicLiking(null);
    }
  };

  const onOpenTopic = (topicId: number) => {
    navigate(`/community/topics/${topicId}`);
  };

  const shouldIgnoreTopicCardNavigation = (target: EventTarget | null) => {
    return target instanceof Element && target.closest("button, a, input, textarea, select, label") != null;
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
      <div className="communityContainer">
        <section className="communityPage__heroShell">
          <div className="communityPage__heroMain">
            <div className="communityPage__heroLeadRow">
              <div className="communityPage__introCopy">
                <p className="communityPage__introLead">「コミュニティ」でできること</p>
                <p className="communityPage__introSub">練習メニューの効果や工夫を共有し、みんなの練習を参考にできます。</p>
              </div>
              <InfoModal
                title="「コミュニティ」でできること "
                bodyClassName="communityPage__communityInfo"
                triggerClassName="communityPage__introInfoBtn"
              >
                <InfoModalLead muted>あなたの投稿データが、AIおすすめの精度向上に反映されます。</InfoModalLead>

                <InfoModalSection
                  title="POSTS"
                  icon={(
                    <svg viewBox="0 0 24 24" focusable="false">
                      <rect x="4.5" y="5.5" width="15" height="4.2" rx="2.1" />
                      <rect x="4.5" y="9.9" width="15" height="4.2" rx="2.1" />
                      <rect x="4.5" y="14.3" width="15" height="4.2" rx="2.1" />
                      <circle className="accent-fill" cx="7.3" cy="7.6" r="0.9" />
                      <circle className="accent-fill" cx="7.3" cy="12" r="0.9" />
                      <circle className="accent-fill" cx="7.3" cy="16.4" r="0.9" />
                    </svg>
                  )}
                >
                  <InfoModalItems>
                    <InfoModalItem
                      icon={<CommunityInfoIcon kind="browse" />}
                      title="みんなの練習"
                      description="他のユーザーの「メニュー × 効果」を見て、練習のヒントを探せます。"
                    />
                    <InfoModalItem
                      icon={<CommunityInfoIcon kind="post" />}
                      title="投稿"
                      description="自分の実践結果を投稿して、他のユーザーに共有できます。"
                    />
                    <InfoModalItem
                      icon={<CommunityInfoIcon kind="favorite" />}
                      title="お気に入り"
                      description="参考になった投稿を保存して、あとで見返せます。"
                      noDivider
                    />
                  </InfoModalItems>
                </InfoModalSection>
              </InfoModal>
            </div>
          </div>
        </section>

        <div className="communityPage__accentGroup">
          <section className="communityPage__mainTabs" aria-label="コミュニティ種別">
            <button
              type="button"
              className={`communityPage__mainTab ${activeSection === "effects" ? "is-active" : ""}`}
              onClick={() => setActiveSection("effects")}
            >
              効果のあった練習
            </button>
            <button
              type="button"
              className={`communityPage__mainTab ${activeSection === "topics" ? "is-active" : ""}`}
              onClick={() => setActiveSection("topics")}
            >
              コミュニティ投稿
            </button>
          </section>

          <section className="communityPage__controls">
            <div className="communityPage__controlsLabelRow">
              <span className="communityPage__controlsLabelIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <rect x="4.5" y="5.5" width="15" height="4.2" rx="2.1" />
                  <rect x="4.5" y="9.9" width="15" height="4.2" rx="2.1" />
                  <rect x="4.5" y="14.3" width="15" height="4.2" rx="2.1" />
                  <circle className="accent-fill" cx="7.3" cy="7.6" r="0.9" />
                  <circle className="accent-fill" cx="7.3" cy="12" r="0.9" />
                  <circle className="accent-fill" cx="7.3" cy="16.4" r="0.9" />
                </svg>
              </span>
              <div className="communityPage__controlsLabel">POSTS</div>
            </div>

            {activeSection === "effects" ? (
              <>
                <div className="communityPage__subTabs communityPage__subTabs--primary communityPage__postsTabs" role="tablist" aria-label="表示切替">
                  <button
                    type="button"
                    className={`communityPage__subTab ${activeTab === "newest" ? "is-active" : ""}`}
                    onClick={() => setActiveTab("newest")}
                    role="tab"
                    aria-selected={activeTab === "newest"}
                  >
                    新着
                  </button>
                  <button
                    type="button"
                    className={`communityPage__subTab ${activeTab === "by_tag" ? "is-active" : ""}`}
                    onClick={() => setActiveTab("by_tag")}
                    role="tab"
                    aria-selected={activeTab === "by_tag"}
                  >
                    タグ
                  </button>
                  <button
                    type="button"
                    className={`communityPage__subTab ${activeTab === "favorites" ? "is-active" : ""}`}
                    onClick={() => setActiveTab("favorites")}
                    role="tab"
                    aria-selected={activeTab === "favorites"}
                  >
                    お気に入り
                  </button>
                  {me && (
                    <button
                      type="button"
                      className={`communityPage__subTab ${activeTab === "mine" ? "is-active" : ""}`}
                      onClick={() => setActiveTab("mine")}
                      role="tab"
                      aria-selected={activeTab === "mine"}
                    >
                      自分
                    </button>
                  )}
                </div>
                {activeTab === "by_tag" && (
                  <div className="communityPage__tagFilter">
                    <AppSelect
                      className="communityPage__input"
                      value={selectedBrowseTag}
                      options={browseTagOptions}
                      onChange={setSelectedBrowseTag}
                      ariaLabel="タグを選択"
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="communityPage__subTabs communityPage__subTabs--primary communityPage__postsTabs" role="tablist" aria-label="並び順">
                  <button
                    type="button"
                    className={`communityPage__subTab ${topicSort === "newest" ? "is-active" : ""}`}
                    onClick={() => setTopicSort("newest")}
                  >
                    新着
                  </button>
                  <button
                    type="button"
                    className={`communityPage__subTab ${topicSort === "popular" ? "is-active" : ""}`}
                    onClick={() => setTopicSort("popular")}
                  >
                    人気
                  </button>
                </div>
                <div className="communityPage__tagFilter">
                  <div className="communityPage__filterRow">
                    <span className="communityPage__filterLabel">カテゴリ：</span>
                    <div className="communityPage__filterControl">
                  <AppSelect
                    className="communityPage__input"
                    value={topicCategory}
                    options={[
                      { value: "all", label: "すべて" },
                      ...COMMUNITY_TOPIC_CATEGORY_OPTIONS.map((opt) => ({ value: opt.key, label: opt.label })),
                    ]}
                    onChange={(next) => setTopicCategory(next as CommunityTopicCategory | "all")}
                    ariaLabel="カテゴリを選択"
                  />
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          {notice && <section className="communityPage__notice">{notice}</section>}
          {error && <section className="communityPage__error">{error}</section>}

          <section className="communityPage__list">
            {activeSection === "effects" ? (
              activeTab === "favorites" && !me ? (
                <div className="communityPage__empty">
                  お気に入りの閲覧にはログインが必要です。<Link to="/login">ログイン</Link>
                </div>
              ) : loading ? (
                <div className="communityPage__empty">読み込み中…</div>
              ) : visiblePosts.length === 0 ? (
                <div className="communityPage__empty">
                  {activeTab === "favorites" ? "お気に入り投稿がありません。" : activeTab === "mine" ? "自分の投稿がまだありません。" : activeTab === "by_tag" ? "該当する投稿がありません。" : "まだ投稿がありません。"}
                </div>
              ) : (
                visiblePosts.map((post) => (
                  <article
                    key={post.id}
                    className={`communityPage__post ${highlightPostId === post.id ? "is-highlight" : ""}`}
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
                              <span className="communityPage__postActionTriggerIcon" aria-hidden="true">
                                <EditPencilIcon />
                              </span>
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
                      <div className="communityPage__cardTitleMain">{post.menu_name}</div>
                      {post.improvement_tags.length > 0 ? (
                        <div className="communityPage__cardImprovementLead">
                          <span className="communityPage__cardImprovementLabel">改善された点</span>
                          <div className="communityPage__tags communityPage__tags--field">
                            {post.improvement_tags.map((tag) => {
                              const label = improvementTagLabel(tag);
                              const tagClass = improvementTagToneClass(tag);
                              return (
                                <span key={`${post.id}-${tag}`} className={`communityPage__tag ${tagClass}`}>
                                  {label}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                      <div className="communityPage__usedScaleText">
                        <span className="communityPage__usedScaleTextLabel">スケール：</span>
                        <span className="communityPage__usedScaleTextValue">{usedScaleLabel(post.used_scale_type, post.used_scale_other_text)}</span>
                      </div>
                      {post.comment?.trim() ? (() => {
                        const trimmedComment = post.comment.trim();
                        const isLong = trimmedComment.length > 140;
                        const isExpanded = expandedComments[post.id] ?? false;
                        const isCollapsed = isLong && !isExpanded;
                        return (
                          <div className="communityPage__commentSection">
                            <div className={`communityPage__commentCard ${isCollapsed ? "is-collapsed" : ""}`}>
                              <p className={`communityPage__comment ${isCollapsed ? "is-collapsed" : ""}`}>{renderCommentText(trimmedComment)}</p>
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
                    </div>

                    <div className="communityPage__cardDivider" />

                    <div className="communityPage__footerMeta">
                      <button
                        type="button"
                        className={`communityPage__favoriteBtn ${post.favorited_by_me ? "is-on" : ""}`}
                        disabled={!me || isFavoriting === post.id}
                        onClick={() => onToggleFavorite(post)}
                      >
                        <span className="communityPage__actionIcon" aria-hidden="true">
                          <StarIcon />
                        </span>
                        <span className="communityPage__favoriteBtnLabel">参考になった</span>
                        <span className="communityPage__favoriteBtnCount">{post.favorite_count}</span>
                      </button>
                    </div>
                  </article>
                ))
              )
            ) : loading ? (
              <div className="communityPage__empty">読み込み中…</div>
            ) : topics.length === 0 ? (
              <div className="communityPage__empty">まだコミュニティ投稿がありません。</div>
            ) : (
              topics.map((topic) => (
                <article
                  key={topic.id}
                  className={`communityPage__post communityPage__post--topic ${highlightTopicId === topic.id ? "is-highlight" : ""}`}
                  role="link"
                  tabIndex={0}
                  onClick={(event) => {
                    if (shouldIgnoreTopicCardNavigation(event.target)) return;
                    onOpenTopic(topic.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    if (shouldIgnoreTopicCardNavigation(event.target)) return;
                    event.preventDefault();
                    onOpenTopic(topic.id);
                  }}
                >
                  <div className="communityPage__cardHeader">
                    <div className="communityPage__topicHeaderMain">
                      <span className="communityPage__topicCategoryChip">{communityTopicCategoryLabel(topic.category)}</span>
                      <Link to={`/community/topics/${topic.id}`} className="communityPage__topicTitle">
                        {topic.title}
                      </Link>
                    </div>
                    <div className="communityPage__cardHeaderMeta">
                      <div className="communityPage__cardDate">{new Date(topic.created_at).toLocaleDateString("ja-JP")}</div>
                      {isOwnTopic(topic) && (
                        <div className="communityPage__postActions">
                          <button
                            type="button"
                            className="communityPage__postActionTrigger"
                            aria-label="投稿メニュー"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuPostId((prev) => (prev === topic.id ? null : topic.id));
                            }}
                          >
                            <span className="communityPage__postActionTriggerIcon" aria-hidden="true">
                              <EditPencilIcon />
                            </span>
                          </button>
                          {actionMenuPostId === topic.id && (
                            <div className="communityPage__postActionMenu" onClick={(e) => e.stopPropagation()}>
                              <button type="button" className="communityPage__postActionItem" onClick={() => onEditTopic(topic)}>
                                編集
                              </button>
                              <button type="button" className="communityPage__postActionItem is-danger" onClick={() => onDeleteTopic(topic)}>
                                削除
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="communityPage__cardBody">
                    {topic.user.public && topic.user.user_id ? (
                      <Link to={`/community/profile/${topic.user.user_id}`} className="communityPage__cardUser">
                        <img
                          src={avatarIconPath(topic.user.avatar_icon, topic.user.avatar_image_url)}
                          alt={topic.user.display_name ?? "ユーザー"}
                          className="communityPage__cardAvatar"
                        />
                        <div className="communityPage__cardUserMeta">
                          <div className="communityPage__cardUserName">
                            {topic.user.display_name} <span>Lv.{topic.user.level ?? 1}</span>
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
                    <p className="communityPage__topicPreview">{topic.body_preview}</p>
                  </div>

                  <div className="communityPage__cardDivider" />

                  <div className="communityPage__footerMeta communityPage__footerMeta--topic">
                    <button
                      type="button"
                      className={`communityPage__favoriteBtn ${topic.liked_by_me ? "is-on" : ""}`}
                      disabled={!me || isTopicLiking === topic.id}
                      onClick={() => onToggleTopicLike(topic)}
                    >
                      <span className="communityPage__actionIcon" aria-hidden="true">
                        <StarIcon />
                      </span>
                      <span className="communityPage__favoriteBtnLabel">参考になった</span>
                      <span className="communityPage__favoriteBtnCount">{topic.likes_count}</span>
                    </button>
                    <Link to={`/community/topics/${topic.id}`} className="communityPage__topicCommentLink">
                      <span className="communityPage__actionIcon" aria-hidden="true">
                        <CommentBubbleIcon />
                      </span>
                      コメント {topic.comments_count}
                    </Link>
                  </div>
                </article>
              ))
            )}
          </section>
        </div>
        </div>

      <button type="button" className="communityPage__fab" onClick={onClickOpenPost} aria-label="投稿する">
        <span className="communityPage__fabIcon" aria-hidden="true">
          <EditPencilIcon />
        </span>
      </button>

      {postModalOpen && (
        <div className="communityPage__modalOverlay uiModalBackdrop" role="dialog" aria-modal="true" aria-label="投稿する">
          <section className="communityPage__modal uiModalPanel">
            <div className="communityPage__modalHead uiModalHeader">
              <div className="communityPage__cardTitle uiModalTitle">
                {composerKind === null ? "投稿タイプを選ぶ" : editingPost || editingTopic ? "投稿を編集" : "投稿する"}
              </div>
              <button type="button" className="communityPage__modalClose uiButton uiButton--secondary" onClick={closePostModal}>
                閉じる
              </button>
            </div>

            <div className="communityPage__modalBody">
              {composerKind === null ? (
                <div className="communityPage__composerSelect">
                  <button type="button" className="communityPage__composerChoice" onClick={() => setComposerKind("effect")}>
                    <span className="communityPage__composerChoiceTitle">効果のあった練習</span>
                    <span className="communityPage__composerChoiceText">今の投稿UIのまま、メニューと効果を共有します。</span>
                  </button>
                  <button type="button" className="communityPage__composerChoice" onClick={() => setComposerKind("topic")}>
                    <span className="communityPage__composerChoiceTitle">コミュニティ投稿</span>
                    <span className="communityPage__composerChoiceText">相談・質問・雑談・成果報告を自由に投稿します。</span>
                  </button>
                </div>
              ) : composerKind === "effect" ? (
                <>
                  <section className="communityPage__editorNote" aria-label="投稿のポイント">
                    <span className="communityPage__editorNoteIcon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false">
                        <path d="M12 3.8 14.2 8.2 19 8.9 15.5 12.3 16.3 17.1 12 14.8 7.7 17.1 8.5 12.3 5 8.9 9.8 8.2Z" />
                        <circle className="accent-fill" cx="12" cy="12" r="1.5" />
                      </svg>
                    </span>
                    <p className="communityPage__editorNoteText">あなたの投稿データが、AIおすすめの精度向上に反映されます。</p>
                  </section>

                  <section className="communityPage__editorCard">
                    <div className="communityPage__editorTitle">メニュー</div>
                    <div className="communityPage__editorHelper">例: 裏声リップロール</div>
                    <AppSelect
                      value={typeof menuId === "number" ? String(menuId) : ""}
                      className="communityPage__input uiInputShell"
                      onChange={(next) => setMenuId(Number.parseInt(next, 10) || "")}
                      options={
                        menus.length === 0
                          ? [{ value: "", label: "メニューがありません" }]
                          : menus.map((menu) => ({ value: String(menu.id), label: menu.name }))
                      }
                      placeholder="メニューを選択"
                      ariaLabel="メニューを選択"
                    />
                    {typeof menuId !== "number" ? (
                      <div className="communityPage__fieldHint is-error">メニューを選んでね</div>
                    ) : null}
                  </section>

                  <section className="communityPage__editorCard">
                    <div className="communityPage__editorTitle">使用したスケール</div>
                    <AppSelect
                      value={usedScaleType}
                      className="communityPage__input uiInputShell"
                      onChange={(next) => setUsedScaleType(next as CommunityUsedScaleType | "")}
                      options={[
                        { value: "", label: "選択してください" },
                        ...COMMUNITY_USED_SCALE_OPTIONS.map((opt) => ({ value: opt.key, label: opt.label })),
                      ]}
                      ariaLabel="使用したスケールを選択"
                    />
                    {usedScaleType === "other" && (
                      <input
                        type="text"
                        className="communityPage__input uiInput uiInputShell"
                        value={usedScaleOtherText}
                        onChange={(e) => setUsedScaleOtherText(e.target.value)}
                        maxLength={40}
                        placeholder="スケール名を入力"
                      />
                    )}
                    {usedScaleType === "" ? (
                      <div className="communityPage__fieldHint is-error">使用したスケールを選んでね</div>
                    ) : null}
                    {usedScaleType === "other" && usedScaleOtherText.trim().length === 0 ? (
                      <div className="communityPage__fieldHint is-error">その他の内容を入力してね</div>
                    ) : null}
                  </section>

                  <section className="communityPage__editorCard">
                    <div className="communityPage__editorTitle">効果タグ</div>
                    <div className="communityPage__editorHelper">複数選択OK</div>
                    <div className="communityPage__chipGrid">
                      {IMPROVEMENT_TAG_OPTIONS.map((opt) => {
                        const isOn = tags.includes(opt.key);
                        const chipToneClass = improvementTagToneClass(opt.key);
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
                    <div className="communityPage__editorTitleRow">
                      <div className="communityPage__editorTitle">自由記述</div>
                      <button type="button" className="communityPage__templateBtn uiButton uiButton--secondary" onClick={onInsertCommentTemplate}>
                        テンプレ挿入
                      </button>
                    </div>
                    <div className="communityPage__editorHelper">よかったら、メニューのやり方や効果を教えてね。</div>
                    <textarea
                      className="communityPage__textarea uiInput uiInputShell"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      maxLength={240}
                      placeholder={FREE_NOTE_PLACEHOLDER}
                    />
                    {comment.trim().length === 0 ? (
                      <div className="communityPage__fieldHint is-error">自由記述を入力してね</div>
                    ) : null}
                  </section>
                </>
              ) : (
                <>
                  <section className="communityPage__editorCard">
                    <div className="communityPage__editorTitle">カテゴリ</div>
                    <AppSelect
                      value={topicFormCategory}
                      className="communityPage__input uiInputShell"
                      onChange={(next) => setTopicFormCategory(next as CommunityTopicCategory)}
                      options={COMMUNITY_TOPIC_CATEGORY_OPTIONS.map((option) => ({ value: option.key, label: option.label }))}
                      ariaLabel="カテゴリを選択"
                    />
                  </section>

                  <section className="communityPage__editorCard">
                    <div className="communityPage__editorTitle">タイトル</div>
                    <input
                      type="text"
                      className="communityPage__input uiInput uiInputShell"
                      value={topicTitle}
                      onChange={(e) => setTopicTitle(e.target.value)}
                      maxLength={120}
                      placeholder="例: 高音で喉が締まる時の対処は？"
                    />
                    {topicTitle.trim().length === 0 ? (
                      <div className="communityPage__fieldHint is-error">タイトルを入力してね</div>
                    ) : null}
                  </section>

                  <section className="communityPage__editorCard">
                    <div className="communityPage__editorTitle">本文</div>
                    <div className="communityPage__editorHelper">相談・質問・成果報告などを自由に書けます。</div>
                    <textarea
                      className="communityPage__textarea uiInput uiInputShell"
                      value={topicBody}
                      onChange={(e) => setTopicBody(e.target.value)}
                      maxLength={2000}
                      placeholder="相談内容や共有したいことを書いてください"
                    />
                    {topicBody.trim().length === 0 ? (
                      <div className="communityPage__fieldHint is-error">本文を入力してね</div>
                    ) : null}
                  </section>
                </>
              )}
            </div>

            {composerKind !== null ? (
              <div className="communityPage__modalFooter uiModalFooter">
                <button
                  type="button"
                  className="communityPage__submit uiButton uiButton--primary"
                  disabled={(composerKind === "effect" ? !canSubmitEffect : !canSubmitTopic) || isSubmitting}
                  onClick={onSubmit}
                >
                  {isSubmitting ? (editingPost || editingTopic ? "更新中…" : "投稿中…") : (editingPost || editingTopic ? "更新する" : "投稿する")}
                </button>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}

function EditPencilIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M4 20h4.2l9.9-9.9-4.2-4.2L4 15.8Z" />
      <path d="m12.8 6.1 4.2 4.2" />
      <path d="M4 20h16" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M12 3.8 14.4 8.7 19.8 9.5 15.9 13.3 16.8 18.7 12 16.2 7.2 18.7 8.1 13.3 4.2 9.5 9.6 8.7Z" />
    </svg>
  );
}

function CommentBubbleIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M5.5 6.5h13a2 2 0 0 1 2 2v6.3a2 2 0 0 1-2 2H11l-4.5 3v-3H5.5a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2Z" />
      <path d="M8.5 10.5h7" />
      <path d="M8.5 13.5h5.2" />
    </svg>
  );
}

function renderCommentText(text: string) {
  const lines = text.split("\n");
  return lines.map((line, index) => {
    const match = line.match(/^(改善された点:|音域:|意識した点:)(.*)$/);
    if (!match) {
      return (
        <span key={`line-${index}`}>
          {line}
          {index < lines.length - 1 ? "\n" : null}
        </span>
      );
    }

    const [, label, rest] = match;
    return (
      <span key={`line-${index}`}>
        <span className="communityPage__commentTemplateLabel">{label}</span>
        {rest}
        {index < lines.length - 1 ? "\n" : null}
      </span>
    );
  });
}
