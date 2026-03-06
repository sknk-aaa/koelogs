import { IMPROVEMENT_TAG_OPTIONS } from "../../types/community";

const LEGACY_TAG_TO_NEW: Record<string, string> = {
  high_note_ease: "mixed_voice_stability",
  pitch_stability: "pitch_accuracy",
  passaggio_smoothness: "mixed_voice_stability",
  less_breathlessness: "breath_sustain",
  resonance_clarity: "vocal_cord_closure",
};

const TONE_CLASS_BY_TAG: Record<string, string> = {
  chest_voice_strength: "improvementTagTone--blue",
  falsetto_strength: "improvementTagTone--sky",
  mixed_voice_stability: "improvementTagTone--purple",
  vocal_cord_closure: "improvementTagTone--rose",
  range_breadth: "improvementTagTone--violet",
  pitch_accuracy: "improvementTagTone--green",
  volume_stability: "improvementTagTone--mint",
  long_tone_sustain: "improvementTagTone--orange",
  less_throat_tension: "improvementTagTone--teal",
  less_throat_fatigue: "improvementTagTone--amber",
  breath_control: "improvementTagTone--indigo",
  breath_sustain: "improvementTagTone--red",
};

const LABEL_BY_KEY = new Map(IMPROVEMENT_TAG_OPTIONS.map((opt) => [opt.key, opt.label] as const));
const ALLOWED_TAG_KEYS = new Set([
  ...IMPROVEMENT_TAG_OPTIONS.map((opt) => opt.key),
  ...Object.keys(LEGACY_TAG_TO_NEW),
]);

export function improvementTagToneClass(tag: string): string {
  const normalized = LEGACY_TAG_TO_NEW[tag] ?? tag;
  return TONE_CLASS_BY_TAG[normalized] ?? "improvementTagTone--neutral";
}

export function improvementTagLabel(tag: string): string {
  const normalized = LEGACY_TAG_TO_NEW[tag] ?? tag;
  return LABEL_BY_KEY.get(normalized) ?? normalized;
}

export function normalizeImprovementTags(tags: string[]): string[] {
  const normalized = tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0 && ALLOWED_TAG_KEYS.has(tag))
    .map((tag) => LEGACY_TAG_TO_NEW[tag] ?? tag);

  return Array.from(new Set(normalized));
}
