class CommunityPost < ApplicationRecord
  belongs_to :user
  belongs_to :training_menu
  has_many :community_post_favorites, dependent: :delete_all
  has_many :favorited_users, through: :community_post_favorites, source: :user

  before_validation :normalize_fields
  before_validation :sync_canonical_key_from_menu

  validates :canonical_key, presence: true
  validates :effect_level, inclusion: { in: 1..5 }
  validates :improvement_tags, presence: true
  validate :improvement_tags_are_allowed
  validate :training_menu_same_user

  private

  def normalize_fields
    self.improvement_tags = Array(improvement_tags).map(&:to_s).map(&:strip).reject(&:blank?).uniq

    v = comment.to_s.strip
    self.comment = v.presence
  end

  def sync_canonical_key_from_menu
    return if training_menu.nil?

    self.canonical_key = training_menu.canonical_key.to_s.presence || "unknown|unspecified"
  end

  def improvement_tags_are_allowed
    invalid = Array(improvement_tags) - TrainingLogFeedback::IMPROVEMENT_TAGS
    return if invalid.empty?

    errors.add(:improvement_tags, "contains invalid tags: #{invalid.join(', ')}")
  end

  def training_menu_same_user
    return if user_id.nil? || training_menu.nil?
    return if training_menu.user_id == user_id

    errors.add(:training_menu_id, "must belong to the same user")
  end
end
