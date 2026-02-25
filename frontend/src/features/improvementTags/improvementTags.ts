import { IMPROVEMENT_TAG_OPTIONS } from "../../types/community";

export const IMPROVEMENT_TAG_LABEL_OVERRIDES: Record<string, string> = {
  pitch_stability: "音程精度",
};

const TONE_CLASS_BY_TAG: Record<string, string> = {
  high_note_ease: "improvementTagTone--purple",
  range_breadth: "improvementTagTone--rose",
  pitch_accuracy: "improvementTagTone--blue",
  pitch_stability: "improvementTagTone--blue",
  passaggio_smoothness: "improvementTagTone--teal",
  less_breathlessness: "improvementTagTone--mint",
  volume_stability: "improvementTagTone--orange",
  less_throat_tension: "improvementTagTone--green",
  resonance_clarity: "improvementTagTone--violet",
  long_tone_sustain: "improvementTagTone--sky",
};

const LABEL_BY_KEY = new Map(IMPROVEMENT_TAG_OPTIONS.map((opt) => [opt.key, opt.label] as const));
const ALLOWED_TAG_KEYS = new Set([...IMPROVEMENT_TAG_OPTIONS.map((opt) => opt.key), "pitch_stability"]);

export function improvementTagToneClass(tag: string): string {
  return TONE_CLASS_BY_TAG[tag] ?? "improvementTagTone--neutral";
}

export function improvementTagLabel(tag: string): string {
  return IMPROVEMENT_TAG_LABEL_OVERRIDES[tag] ?? LABEL_BY_KEY.get(tag) ?? tag;
}

export function normalizeImprovementTags(tags: string[]): string[] {
  const normalized = tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0 && ALLOWED_TAG_KEYS.has(tag));

  return Array.from(new Set(normalized));
}
