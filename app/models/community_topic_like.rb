class CommunityTopicLike < ApplicationRecord
  belongs_to :topic, class_name: "CommunityTopic", inverse_of: :community_topic_likes
  belongs_to :user

  validates :user_id, uniqueness: { scope: :topic_id }
end
