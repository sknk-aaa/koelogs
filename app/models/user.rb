class User < ApplicationRecord
  PASSWORD_RESET_TOKEN_TTL = 30.minutes
  PASSWORD_RESET_REQUEST_INTERVAL = 1.minute

  AVATAR_ICON_VALUES = %w[
    note_blue
    mic_pink
    chat_green
    star_yellow
    wave_purple
    heart_red
  ].freeze
  PLAN_TIERS = %w[free premium].freeze
  BILLING_CYCLES = %w[monthly yearly].freeze

  has_secure_password

  has_many :training_logs, dependent: :destroy
  has_many :training_menus, dependent: :destroy
  has_many :measurement_runs, dependent: :destroy
  has_many :ai_recommendations, dependent: :destroy
  has_many :ai_recommendation_threads, dependent: :destroy
  has_many :ai_token_usages, dependent: :destroy
  has_many :ai_chat_projects, dependent: :destroy
  has_many :ai_chat_threads, dependent: :destroy
  has_one :ai_user_profile, dependent: :destroy
  has_many :community_posts, dependent: :destroy
  has_many :community_post_favorites, dependent: :destroy
  has_many :favorite_community_posts, through: :community_post_favorites, source: :community_post
  has_many :ai_contribution_events, dependent: :destroy
  has_many :monthly_logs, dependent: :destroy
  has_many :xp_events, dependent: :destroy
  has_many :user_badges, dependent: :destroy

  validates :email, presence: true, uniqueness: true

  # 表示名は任意。空白は nil として扱う
  before_validation :normalize_display_name

  validates :display_name,
            length: { maximum: 30 },
            allow_nil: true

  # 目標は任意。空白は nil として扱う
  before_validation :normalize_goal_text
  validates :goal_text, length: { maximum: 50 }, allow_nil: true
  before_validation :normalize_ai_custom_instructions
  before_validation :normalize_ai_improvement_tags
  validates :ai_custom_instructions, length: { maximum: 600 }, allow_nil: true
  validate :ai_improvement_tags_are_allowed
  before_validation :normalize_avatar_image_url
  after_commit :enqueue_ai_profile_refresh_if_ai_preferences_changed
  # data URL (base64) での保存を許容するため、上限は十分大きくする
  validates :avatar_image_url, length: { maximum: 2_000_000 }, allow_nil: true
  validates :public_profile_enabled, inclusion: { in: [ true, false ] }
  validates :public_goal_enabled, inclusion: { in: [ true, false ] }
  validates :ranking_participation_enabled, inclusion: { in: [ true, false ] }
  validates :avatar_icon, inclusion: { in: AVATAR_ICON_VALUES }
  validates :plan_tier, inclusion: { in: PLAN_TIERS }
  validates :billing_cycle, inclusion: { in: BILLING_CYCLES }, allow_nil: true

  def premium_plan?
    plan_tier == "premium"
  end

  def free_plan?
    !premium_plan?
  end

  def can_send_password_reset_email?
    password_reset_sent_at.nil? || password_reset_sent_at < PASSWORD_RESET_REQUEST_INTERVAL.ago
  end

  def generate_password_reset_token!
    token = SecureRandom.urlsafe_base64(32)
    update!(
      password_reset_token_digest: digest_password_reset_token(token),
      password_reset_sent_at: Time.current
    )
    token
  end

  def password_reset_token_valid?(token)
    return false if token.blank? || password_reset_token_digest.blank? || password_reset_sent_at.blank?
    return false if password_reset_sent_at < PASSWORD_RESET_TOKEN_TTL.ago

    ActiveSupport::SecurityUtils.secure_compare(
      password_reset_token_digest,
      digest_password_reset_token(token)
    )
  rescue ArgumentError
    false
  end

  private

  def digest_password_reset_token(token)
    Digest::SHA256.hexdigest(token.to_s)
  end

  def normalize_display_name
    return if display_name.nil?

    v = display_name.strip
    self.display_name = v.empty? ? nil : v
  end

  def normalize_goal_text
    return if goal_text.nil?

    v = goal_text.strip
    self.goal_text = v.empty? ? nil : v
  end

  def normalize_avatar_image_url
    return if avatar_image_url.nil?

    v = avatar_image_url.strip
    self.avatar_image_url = v.empty? ? nil : v
  end

  def normalize_ai_custom_instructions
    return if ai_custom_instructions.nil?

    v = ai_custom_instructions.to_s.strip
    self.ai_custom_instructions = v.empty? ? nil : v
  end

  def normalize_ai_improvement_tags
    self.ai_improvement_tags = Array(ai_improvement_tags).map(&:to_s).map(&:strip).reject(&:blank?).uniq
  end

  def ai_improvement_tags_are_allowed
    invalid = Array(ai_improvement_tags) - ImprovementTagCatalog::TAGS
    return if invalid.empty?

    errors.add(:ai_improvement_tags, "contains invalid tags: #{invalid.join(', ')}")
  end

  def enqueue_ai_profile_refresh_if_ai_preferences_changed
    changed = previous_changes
    return unless changed.key?("goal_text") || changed.key?("ai_custom_instructions") || changed.key?("ai_improvement_tags")

    AiUserProfileRefreshJob.perform_later(id)
  end
end
