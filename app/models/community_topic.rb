class CommunityTopic < ApplicationRecord
  CATEGORY_VALUES = %w[chat practice_consult question report other].freeze

  belongs_to :user
  has_many :community_topic_comments, foreign_key: :topic_id, dependent: :delete_all, inverse_of: :topic
  has_many :community_topic_likes, foreign_key: :topic_id, dependent: :delete_all, inverse_of: :topic

  before_validation :normalize_fields

  validates :category, inclusion: { in: CATEGORY_VALUES }
  validates :title, presence: true, length: { maximum: 120 }
  validates :body, presence: true, length: { maximum: 2_000 }
  validates :likes_count, numericality: { greater_than_or_equal_to: 0, only_integer: true }
  validates :comments_count, numericality: { greater_than_or_equal_to: 0, only_integer: true }

  scope :published, -> { where(published: true) }

  private

  def normalize_fields
    self.category = category.to_s.strip.presence
    self.title = title.to_s.strip

    normalized_body = body.to_s.gsub(/\r\n?/, "\n").strip
    self.body = normalized_body
  end
end
