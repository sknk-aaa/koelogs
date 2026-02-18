class WeeklyLog < ApplicationRecord
  belongs_to :user

  before_validation :normalize_week_start
  before_validation :normalize_effect_feedbacks

  validates :week_start, presence: true
  validates :week_start, uniqueness: { scope: :user_id }

  validate :effect_feedbacks_shape_is_valid
  validate :effect_feedback_tags_are_allowed
  validate :effect_feedback_menu_ids_are_positive_integers

  def week_end
    week_start + 6
  end

  private

  def normalize_week_start
    return if week_start.blank?

    self.week_start = week_start.to_date.beginning_of_week(:monday)
  rescue ArgumentError, TypeError
    # validationで拾う
  end

  def normalize_effect_feedbacks
    self.effect_feedbacks = Array(effect_feedbacks).filter_map do |entry|
      next unless entry.is_a?(Hash)

      menu_id = Integer(entry["menu_id"] || entry[:menu_id], exception: false)
      next unless menu_id&.positive?

      tags = Array(entry["improvement_tags"] || entry[:improvement_tags]).map(&:to_s).map(&:strip).reject(&:blank?).uniq
      next if tags.empty?

      {
        "menu_id" => menu_id,
        "improvement_tags" => tags
      }
    end
  end

  def effect_feedbacks_shape_is_valid
    ok = Array(effect_feedbacks).all? { |v| v.is_a?(Hash) && v.key?("menu_id") && v.key?("improvement_tags") }
    errors.add(:effect_feedbacks, "must be an array of {menu_id, improvement_tags}") unless ok
  end

  def effect_feedback_tags_are_allowed
    invalid = Array(effect_feedbacks).flat_map { |e| Array(e["improvement_tags"]) }.map(&:to_s).uniq - TrainingLogFeedback::IMPROVEMENT_TAGS
    return if invalid.empty?

    errors.add(:effect_feedbacks, "contains invalid tags: #{invalid.join(', ')}")
  end

  def effect_feedback_menu_ids_are_positive_integers
    bad = Array(effect_feedbacks).any? do |e|
      !e["menu_id"].is_a?(Integer) || e["menu_id"] <= 0
    end
    return unless bad

    errors.add(:effect_feedbacks, "contains invalid menu_id")
  end
end
