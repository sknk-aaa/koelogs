class AiRecommendation < ApplicationRecord
  belongs_to :user
  has_many :ai_contribution_events, dependent: :delete_all
  has_one :thread,
          class_name: "AiRecommendationThread",
          dependent: :destroy,
          inverse_of: :ai_recommendation

  validates :generated_for_date, presence: true
  validates :week_start_date, presence: true
  validates :range_days, inclusion: { in: [ 14, 30, 90 ] }
  validates :recommendation_text, presence: true
  validates :generator_model_name, presence: true
  validates :generator_prompt_version, presence: true
  validates :generated_for_date, uniqueness: { scope: [ :user_id, :range_days ] }

  before_validation :ensure_week_start_date

  private

  def ensure_week_start_date
    base_date = generated_for_date || week_start_date
    return if base_date.blank?

    self.week_start_date = base_date.to_date.beginning_of_week(:monday)
  end
end
