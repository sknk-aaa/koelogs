class AiRecommendationThread < ApplicationRecord
  SYSTEM_PROMPT_VERSION = "followup-v1"
  USER_PROMPT_VERSION = "followup-v1"
  MAX_MESSAGES = 20

  belongs_to :user
  belongs_to :ai_recommendation
  has_many :messages,
           class_name: "AiRecommendationMessage",
           dependent: :delete_all,
           inverse_of: :ai_recommendation_thread

  validates :generated_for_date, presence: true
  validates :seed_recommendation_text, presence: true
  validates :llm_model_name, presence: true
  validates :system_prompt_version, presence: true
  validates :user_prompt_version, presence: true
  validate :recommendation_belongs_to_same_user

  private

  def recommendation_belongs_to_same_user
    return if ai_recommendation.nil? || user.nil?
    return if ai_recommendation.user_id == user_id

    errors.add(:ai_recommendation_id, "must belong to same user")
  end
end
