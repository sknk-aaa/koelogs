# frozen_string_literal: true

class AiProfileMemoryCandidate < ApplicationRecord
  DESTINATIONS = %w[voice profile].freeze
  STATUSES = %w[pending saved dismissed].freeze
  TTL_DAYS = 7
  SIMILARITY_DUPLICATE_THRESHOLD = 0.3
  TITLE_AVOID = "避けたい練習/注意点"
  TITLE_NICKNAME = "呼び名"
  TITLE_OCCUPATION = "職業"
  TITLE_PROFILE_DETAILS = "プロフィール詳細"
  MAX_PROFILE_LINES = 6
  SECTION_LABELS = {
    strengths: "強み",
    challenges: "課題",
    growth_journey: "成長過程",
    avoid_notes: "避けたい練習/注意点",
    profile: "プロフィール"
  }.freeze

  belongs_to :user

  validates :source_kind, presence: true, length: { maximum: 40 }
  validates :source_text, presence: true, length: { maximum: 800 }
  validates :candidate_text, presence: true, length: { maximum: 220 }
  validates :suggested_destination, inclusion: { in: DESTINATIONS }
  validates :status, inclusion: { in: STATUSES }
  validates :resolved_destination, inclusion: { in: DESTINATIONS }, allow_nil: true
  validates :expires_at, presence: true

  before_validation :normalize_text_fields
  before_validation :assign_default_expiration, on: :create

  scope :pending_active, ->(now = Time.current) { where(status: "pending").where("expires_at > ?", now) }

  def self.cleanup_expired!(user: nil, now: Time.current)
    scope = where(status: "pending").where("expires_at <= ?", now)
    scope = scope.where(user_id: user.id) if user.is_a?(User)
    scope = scope.where(user_id: user) if user.is_a?(Integer)
    scope.delete_all
  end

  def save_to_long_term_profile!(destination:)
    raise ArgumentError, "candidate already resolved" unless status == "pending"

    normalized_destination = normalize_destination(destination)
    now = Time.current

    profile = user.ai_user_profile || user.create_ai_user_profile!(source_window_days: AiUserProfile::WINDOW_DAYS)
    overrides = profile.user_overrides.is_a?(Hash) ? profile.user_overrides.deep_dup : {}
    normalized_text = normalize_text_for_save
    section_key = apply_to_overrides!(overrides, destination: normalized_destination, text: normalized_text)

    ApplicationRecord.transaction do
      Ai::UserLongTermProfileManager.update_overrides!(user: user, overrides: overrides)
      update!(
        status: "saved",
        resolved_destination: normalized_destination,
        resolved_at: now
      )
    end

    {
      saved_text: normalized_text,
      profile_section_label: profile_section_label(section_key),
      destination: normalized_destination
    }
  end

  def save_corrected_to_long_term_profile!(destination:, corrected_text:, section_label:)
    raise ArgumentError, "candidate already resolved" unless status == "pending"

    normalized_destination = normalize_destination(destination)
    now = Time.current
    normalized_text = normalize_save_text(corrected_text)
    raise ArgumentError, "corrected_text is blank" if normalized_text.blank?

    profile = user.ai_user_profile || user.create_ai_user_profile!(source_window_days: AiUserProfile::WINDOW_DAYS)
    overrides = profile.user_overrides.is_a?(Hash) ? profile.user_overrides.deep_dup : {}
    section_key = section_key_from_label(section_label)
    applied_section = apply_corrected_to_overrides!(
      overrides: overrides,
      destination: normalized_destination,
      text: normalized_text,
      section_key: section_key
    )

    ApplicationRecord.transaction do
      Ai::UserLongTermProfileManager.update_overrides!(user: user, overrides: overrides)
      update!(
        status: "saved",
        resolved_destination: normalized_destination,
        resolved_at: now
      )
    end

    {
      saved_text: normalized_text,
      profile_section_label: profile_section_label(applied_section),
      destination: normalized_destination
    }
  end

  def dismiss!
    raise ArgumentError, "candidate already resolved" unless status == "pending"

    update!(status: "dismissed", resolved_at: Time.current)
  end

  def preview_saved_text
    normalize_save_text(candidate_text)
  end

  def preview_profile_section_label
    section_key =
      if normalize_destination(suggested_destination) == "voice"
        classified_voice_section_key(candidate_text.to_s)
      else
        :profile
      end
    profile_section_label(section_key)
  end

  private

  def normalize_text_fields
    self.source_kind = source_kind.to_s.strip.presence || "ai_chat"
    self.source_text = source_text.to_s.gsub(/\s+/, " ").strip.slice(0, 800)
    self.candidate_text = candidate_text.to_s.gsub(/\s+/, " ").strip.slice(0, 220)
    self.suggested_destination = normalize_destination(suggested_destination)
    self.status = status.to_s.strip.presence || "pending"
    self.resolved_destination = resolved_destination.present? ? normalize_destination(resolved_destination) : nil
  end

  def assign_default_expiration
    self.expires_at ||= TTL_DAYS.days.from_now
  end

  def normalize_custom_items(value)
    Array(value).filter_map do |item|
      next unless item.is_a?(Hash)

      title = item["title"].to_s.strip
      content = item["content"].to_s.strip
      next if title.blank? || content.blank?

      { "title" => title.slice(0, 40), "content" => content.slice(0, 220) }
    end.first(6)
  end

  def normalize_destination(value)
    _candidate = value.to_s.strip
    "voice"
  end

  def apply_to_overrides!(overrides, destination:, text:)
    return if text.blank?

    if destination == "voice"
      return apply_voice_memory!(overrides, text)
    end

    apply_profile_memory!(overrides, text)
  end

  def apply_voice_memory!(overrides, text)
    section_key = classified_voice_section_key(text)
    if section_key == :avoid_notes
      upsert_custom_item!(
        overrides: overrides,
        title: TITLE_AVOID,
        content: text
      )
      return :avoid_notes
    end

    key = section_key.to_s
    lines = normalize_string_array(overrides[key])
    return section_key if duplicate_voice_line?(lines: lines, text: text)

    merged = [ text ]
    merged.concat(lines.reject { |line| line == text })
    overrides[key] = merged.first(MAX_PROFILE_LINES)
    section_key
  end

  def apply_profile_memory!(overrides, text)
    upsert_custom_item!(
      overrides: overrides,
      title: custom_item_title_for(destination: "profile", text: text),
      content: text
    )
    :profile
  end

  def upsert_custom_item!(overrides:, title:, content:)
    existing_items = normalize_custom_items(overrides["custom_items"])
    new_item = { "title" => title, "content" => content }
    merged_items = [ new_item ]
    merged_items.concat(existing_items.reject { |item| item["title"] == new_item["title"] && item["content"] == new_item["content"] })
    overrides["custom_items"] = merged_items.first(MAX_PROFILE_LINES)
  end

  def normalize_string_array(value)
    Array(value).map(&:to_s).map(&:strip).reject(&:blank?).uniq.first(MAX_PROFILE_LINES)
  end

  def normalize_text_for_save
    raw_text = normalize_save_text(candidate_text)
    ai_text = Ai::MemoryCandidateNormalizer.normalize(text: raw_text, user: user)
    normalize_save_text(ai_text.presence || raw_text)
  end

  def normalize_save_text(value)
    value.to_s.gsub(/\s+/, " ").strip.slice(0, 220)
  end

  def duplicate_voice_line?(lines:, text:)
    candidate = normalize_similarity_text(text)
    return false if candidate.blank?

    lines.any? do |line|
      normalized_line = normalize_similarity_text(line)
      next false if normalized_line.blank?
      next true if normalized_line == candidate
      next true if normalized_line.include?(candidate) || candidate.include?(normalized_line)

      similarity_score(normalized_line, candidate) >= SIMILARITY_DUPLICATE_THRESHOLD
    end
  end

  def normalize_similarity_text(value)
    value.to_s
         .unicode_normalize(:nfkc)
         .downcase
         .gsub(/[[:space:]]+/, "")
         .gsub(/[。．.!！?？、,，・「」『』（）()\[\]【】]/, "")
  end

  def similarity_score(a, b)
    grams_a = text_bigrams(a)
    grams_b = text_bigrams(b)
    return 0.0 if grams_a.empty? || grams_b.empty?

    intersection = (grams_a & grams_b).length.to_f
    union = (grams_a | grams_b).length.to_f
    return 0.0 if union <= 0.0

    intersection / union
  end

  def text_bigrams(text)
    str = text.to_s
    return [ str ] if str.length == 1
    return [] if str.length <= 0

    (0...(str.length - 1)).map { |idx| str[idx, 2] }.uniq
  end

  def classified_voice_section_key(text)
    section = Ai::MemoryProfileSectionClassifier.classify(
      text: text.to_s,
      destination: "voice",
      user: user
    )
    return section if %i[strengths challenges growth_journey avoid_notes].include?(section)

    heuristic_voice_section_key(text)
  rescue => e
    Rails.logger.warn("[AI][AiProfileMemoryCandidate] classify_voice_section_failed #{e.class}: #{e.message}")
    heuristic_voice_section_key(text)
  end

  def profile_section_label(section_key)
    SECTION_LABELS[section_key.to_sym] || SECTION_LABELS[:challenges]
  end

  def section_key_from_label(label)
    value = label.to_s.strip
    return :strengths if value == SECTION_LABELS[:strengths]
    return :challenges if value == SECTION_LABELS[:challenges]
    return :growth_journey if value == SECTION_LABELS[:growth_journey]
    return :avoid_notes if value == SECTION_LABELS[:avoid_notes]
    return :profile if value == SECTION_LABELS[:profile]

    :challenges
  end

  def apply_corrected_to_overrides!(overrides:, destination:, text:, section_key:)
    if destination == "profile" || section_key == :profile
      apply_profile_memory!(overrides, text)
      return :profile
    end

    if section_key == :avoid_notes
      upsert_custom_item!(
        overrides: overrides,
        title: TITLE_AVOID,
        content: text
      )
      return :avoid_notes
    end

    key = section_key.to_s
    lines = normalize_string_array(overrides[key])
    return section_key if duplicate_voice_line?(lines: lines, text: text)

    merged = [ text ]
    merged.concat(lines.reject { |line| line == text })
    overrides[key] = merged.first(MAX_PROFILE_LINES)
    section_key
  end

  def heuristic_voice_section_key(text)
    return :strengths if text.include?("強み") || text.include?("できる") || text.include?("安定してきた")
    return :growth_journey if text.include?("成長") || text.include?("伸び") || text.include?("改善してきた")
    return :avoid_notes if avoid_memory_text?(text)

    :challenges
  end

  def avoid_memory_text?(text)
    text.include?("避け") || text.include?("注意") || text.include?("やめ") || text.include?("NG")
  end

  def custom_item_title_for(destination:, text:)
    if destination == "profile"
      return TITLE_NICKNAME if text.include?("呼んで") || text.include?("呼び名") || text.include?("ニックネーム")
      return TITLE_OCCUPATION if text.include?("職業") || text.include?("仕事") || text.include?("所属") || text.include?("学校")

      return TITLE_PROFILE_DETAILS
    end

    return TITLE_AVOID if avoid_memory_text?(text)

    "声に関してメモ"
  end
end
