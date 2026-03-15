class CommunityTopicComment < ApplicationRecord
  belongs_to :topic, class_name: "CommunityTopic", inverse_of: :community_topic_comments
  belongs_to :user
  belongs_to :parent, class_name: "CommunityTopicComment", optional: true

  has_many :replies,
           class_name: "CommunityTopicComment",
           foreign_key: :parent_id,
           dependent: :delete_all,
           inverse_of: :parent

  before_validation :normalize_body

  validates :body, presence: true, length: { maximum: 1_000 }
  validate :parent_belongs_to_same_topic
  validate :parent_is_top_level

  scope :roots_first, -> { order(:created_at) }

  private

  def normalize_body
    normalized = body.to_s.gsub(/\r\n?/, "\n").strip
    self.body = normalized
  end

  def parent_belongs_to_same_topic
    return if parent.nil? || topic_id.nil?
    return if parent.topic_id == topic_id

    errors.add(:parent_id, "must belong to the same topic")
  end

  def parent_is_top_level
    return if parent.nil?
    return if parent.parent_id.nil?

    errors.add(:parent_id, "cannot reply deeper than one level")
  end
end
