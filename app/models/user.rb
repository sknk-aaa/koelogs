class User < ApplicationRecord
  has_secure_password

  has_many :training_logs, dependent: :destroy
  has_many :training_menus, dependent: :destroy
  has_many :analysis_menus, dependent: :destroy
  has_many :analysis_sessions, dependent: :destroy
  has_many :ai_recommendations, dependent: :destroy

  validates :email, presence: true, uniqueness: true

  # 表示名は任意。空白は nil として扱う
  before_validation :normalize_display_name

  validates :display_name,
            length: { maximum: 30 },
            allow_nil: true

  # 目標は任意。空白は nil として扱う
  before_validation :normalize_goal_text
  validates :goal_text, length: { maximum: 50 }, allow_nil: true

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
end
