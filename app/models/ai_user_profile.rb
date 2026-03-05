class AiUserProfile < ApplicationRecord
  WINDOW_DAYS = 90
  OVERRIDE_TTL_DAYS = 60

  belongs_to :user

  validates :source_window_days, numericality: { greater_than: 0 }

  def effective_overrides(now: Time.current)
    return {} unless user_overrides.is_a?(Hash)
    return {} if overrides_updated_at.blank?
    return {} if overrides_updated_at < OVERRIDE_TTL_DAYS.days.ago(now)

    user_overrides
  end
end
