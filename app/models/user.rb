class User < ApplicationRecord
  AVATAR_ICON_VALUES = %w[
    note_blue
    mic_pink
    chat_green
    star_yellow
    wave_purple
    heart_red
  ].freeze

  has_secure_password

  has_many :training_logs, dependent: :destroy
  has_many :training_log_feedbacks, dependent: :destroy
  has_many :training_menus, dependent: :destroy
  has_many :analysis_menus, dependent: :destroy
  has_many :analysis_sessions, dependent: :destroy
  has_many :ai_recommendations, dependent: :destroy
  has_many :community_posts, dependent: :destroy
  has_many :community_post_favorites, dependent: :destroy
  has_many :favorite_community_posts, through: :community_post_favorites, source: :community_post
  has_many :ai_contribution_events, dependent: :destroy
  has_many :weekly_logs, dependent: :destroy
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
  before_validation :normalize_avatar_image_url
  # data URL (base64) での保存を許容するため、上限は十分大きくする
  validates :avatar_image_url, length: { maximum: 2_000_000 }, allow_nil: true
  validates :public_profile_enabled, inclusion: { in: [ true, false ] }
  validates :public_goal_enabled, inclusion: { in: [ true, false ] }
  validates :ranking_participation_enabled, inclusion: { in: [ true, false ] }
  validates :avatar_icon, inclusion: { in: AVATAR_ICON_VALUES }

  private

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
end
