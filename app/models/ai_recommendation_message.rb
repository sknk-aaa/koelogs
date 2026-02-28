class AiRecommendationMessage < ApplicationRecord
  ROLES = %w[user assistant].freeze

  belongs_to :ai_recommendation_thread, inverse_of: :messages

  validates :role, presence: true, inclusion: { in: ROLES }
  validates :content, presence: true, length: { maximum: 2000 }
end
