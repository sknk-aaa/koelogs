import type { CommunityPublicProfile } from "./community";

export type CommunityTopicCategory = "chat" | "practice_consult" | "question" | "report" | "other";
export type CommunityTopicSort = "newest" | "popular";

export const COMMUNITY_TOPIC_CATEGORY_OPTIONS: Array<{ key: CommunityTopicCategory; label: string }> = [
  { key: "chat", label: "雑談" },
  { key: "practice_consult", label: "練習相談" },
  { key: "question", label: "質問" },
  { key: "report", label: "成果報告" },
  { key: "other", label: "その他" },
];

export type CommunityTopicCard = {
  id: number;
  user_id: number;
  category: CommunityTopicCategory;
  title: string;
  body: string;
  body_preview: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  liked_by_me: boolean;
  user: CommunityPublicProfile;
};

export type CommunityTopicReply = {
  id: number;
  body: string;
  created_at: string;
  can_delete: boolean;
  user: CommunityPublicProfile;
};

export type CommunityTopicComment = {
  id: number;
  body: string;
  created_at: string;
  can_delete: boolean;
  user: CommunityPublicProfile;
  replies: CommunityTopicReply[];
};

export type CommunityTopicDetail = {
  id: number;
  user_id: number;
  category: CommunityTopicCategory;
  title: string;
  body: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  liked_by_me: boolean;
  user: CommunityPublicProfile;
  comments: CommunityTopicComment[];
};

export function communityTopicCategoryLabel(category: CommunityTopicCategory): string {
  return COMMUNITY_TOPIC_CATEGORY_OPTIONS.find((option) => option.key === category)?.label ?? "その他";
}
