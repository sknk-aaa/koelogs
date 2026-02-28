class AiRecommendation < ApplicationRecord
  belongs_to :user
  has_many :ai_contribution_events, dependent: :delete_all

  validates :generated_for_date, presence: true
  validates :range_days, inclusion: { in: [ 14, 30, 90 ] }
  validates :recommendation_text, presence: true
  validates :generated_for_date, uniqueness: { scope: [ :user_id, :range_days ] }
end
