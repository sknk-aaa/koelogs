class MonthlyLog < ApplicationRecord
  belongs_to :user

  before_validation :normalize_month_start
  after_commit :enqueue_ai_profile_refresh

  validates :month_start, presence: true
  validates :month_start, uniqueness: { scope: :user_id }

  private

  def normalize_month_start
    return if month_start.blank?

    self.month_start = month_start.to_date.beginning_of_month
  end

  def enqueue_ai_profile_refresh
    AiUserProfileRefreshJob.perform_later(user_id)
  end
end
