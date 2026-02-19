class UserBadge < ApplicationRecord
  belongs_to :user

  validates :badge_key, presence: true, uniqueness: { scope: :user_id }
  validates :unlocked_at, presence: true
end
