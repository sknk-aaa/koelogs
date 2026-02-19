export const AVATAR_ICON_OPTIONS = [
  { key: "note_blue", label: "ノートブルー" },
  { key: "mic_pink", label: "マイクピンク" },
  { key: "chat_green", label: "チャットグリーン" },
  { key: "star_yellow", label: "スターイエロー" },
  { key: "wave_purple", label: "ウェーブパープル" },
  { key: "heart_red", label: "ハートレッド" },
] as const;

export type AvatarIconKey = (typeof AVATAR_ICON_OPTIONS)[number]["key"];

export function avatarIconPath(iconKey: string | null | undefined, customImageUrl?: string | null): string {
  const custom = customImageUrl?.trim();
  if (custom) return custom;
  const key = iconKey && iconKey.trim().length > 0 ? iconKey : "note_blue";
  return `/avatars/${key}.svg`;
}
