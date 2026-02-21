class MonthlyLog < ApplicationRecord
  belongs_to :user

  before_validation :normalize_month_start

  validates :month_start, presence: true
  validates :month_start, uniqueness: { scope: :user_id }

  private

  def normalize_month_start
    return if month_start.blank?

    self.month_start = month_start.to_date.beginning_of_month
  end
end
