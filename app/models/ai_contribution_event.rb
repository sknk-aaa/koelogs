class AiContributionEvent < ApplicationRecord
  belongs_to :user
  belongs_to :ai_recommendation

  validates :user_id, uniqueness: { scope: :ai_recommendation_id }
end
