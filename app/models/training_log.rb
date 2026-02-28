# app/models/training_log.rb
class TrainingLog < ApplicationRecord
  belongs_to :user

  has_many :training_log_menus, -> { order(created_at: :asc) }, dependent: :delete_all
  has_many :training_menus, through: :training_log_menus

  before_validation :normalize_duration
  after_commit :enqueue_ai_profile_refresh

  validates :practiced_on, presence: true
  validates :practiced_on, uniqueness: { scope: :user_id }
  validates :duration_min, numericality: { only_integer: true, greater_than_or_equal_to: 0 }, allow_nil: true

  private

  def normalize_duration
    self.duration_min = nil if duration_min.is_a?(String) && duration_min.strip == ""
  end

  def enqueue_ai_profile_refresh
    AiUserProfileRefreshJob.perform_later(user_id)
  end
end
