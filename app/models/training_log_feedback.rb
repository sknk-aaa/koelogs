class TrainingLogFeedback < ApplicationRecord
  IMPROVEMENT_TAGS = [
    "high_note_ease",
    "range_breadth",
    "pitch_accuracy",
    "pitch_stability",
    "passaggio_smoothness",
    "less_breathlessness",
    "volume_stability",
    "less_throat_tension",
    "resonance_clarity",
    "long_tone_sustain"
  ].freeze
  TAG_LABELS = {
    "high_note_ease" => "高音の出しやすさ",
    "range_breadth" => "音域の広さ",
    "pitch_accuracy" => "音程精度",
    "pitch_stability" => "音程精度",
    "passaggio_smoothness" => "換声点の滑らかさ",
    "less_breathlessness" => "息切れしにくさ",
    "volume_stability" => "音量安定性",
    "less_throat_tension" => "喉の力み軽減",
    "resonance_clarity" => "声の抜け・響き",
    "long_tone_sustain" => "ロングトーン維持"
  }.freeze

  belongs_to :user
  belongs_to :training_log

  before_validation :normalize_arrays

  validates :training_log_id, uniqueness: true
  validate :same_user_integrity
  validate :improvement_tags_are_allowed
  validate :effective_menu_ids_are_positive_integers
  validate :menu_effects_shape_is_valid
  validate :menu_effects_tags_are_allowed
  validate :menu_effects_menu_ids_are_positive_integers

  private

  def normalize_arrays
    self.effective_menu_ids = Array(effective_menu_ids).filter_map do |id|
      i = Integer(id, exception: false)
      i if i && i.positive?
    end.uniq

    self.improvement_tags = Array(improvement_tags).map(&:to_s).map(&:strip).reject(&:blank?).uniq

    parsed_effects = []
    Array(menu_effects).each do |raw|
      next unless raw.is_a?(Hash)

      menu_id = Integer(raw["menu_id"] || raw[:menu_id], exception: false)
      next unless menu_id&.positive?

      tags = Array(raw["improvement_tags"] || raw[:improvement_tags]).map(&:to_s).map(&:strip).reject(&:blank?).uniq
      parsed_effects << { "menu_id" => menu_id, "improvement_tags" => tags }
    end

    # menu_effects を正として既存列にも同期（後方互換）
    if parsed_effects.any?
      self.menu_effects = parsed_effects
      self.effective_menu_ids = parsed_effects.map { |e| e["menu_id"] }.uniq
      self.improvement_tags = parsed_effects.flat_map { |e| e["improvement_tags"] }.uniq
    else
      self.menu_effects = []
    end
  end

  def same_user_integrity
    return if user_id.nil? || training_log.nil?
    return if training_log.user_id == user_id

    errors.add(:training_log_id, "must belong to the same user")
  end

  def improvement_tags_are_allowed
    invalid = Array(improvement_tags) - IMPROVEMENT_TAGS
    return if invalid.empty?

    errors.add(:improvement_tags, "contains invalid tags: #{invalid.join(', ')}")
  end

  def effective_menu_ids_are_positive_integers
    bad = Array(effective_menu_ids).any? { |id| !id.is_a?(Integer) || id <= 0 }
    return unless bad

    errors.add(:effective_menu_ids, "must be positive integers")
  end

  def menu_effects_shape_is_valid
    return if Array(menu_effects).all? { |v| v.is_a?(Hash) && v.key?("menu_id") && v.key?("improvement_tags") }

    errors.add(:menu_effects, "must be an array of {menu_id, improvement_tags}")
  end

  def menu_effects_tags_are_allowed
    invalid = Array(menu_effects).flat_map { |e| Array(e["improvement_tags"]) }.map(&:to_s).uniq - IMPROVEMENT_TAGS
    return if invalid.empty?

    errors.add(:menu_effects, "contains invalid tags: #{invalid.join(', ')}")
  end

  def menu_effects_menu_ids_are_positive_integers
    bad = Array(menu_effects).any? do |e|
      !e["menu_id"].is_a?(Integer) || e["menu_id"] <= 0
    end
    return unless bad

    errors.add(:menu_effects, "contains invalid menu_id")
  end
end
