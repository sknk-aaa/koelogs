class AiUserProfileRefreshJob < ApplicationJob
  queue_as :default

  retry_on StandardError, wait: :exponentially_longer, attempts: 3

  def perform(user_id, force = false)
    user = User.find_by(id: user_id)
    return if user.nil?

    Ai::UserLongTermProfileManager.refresh!(user: user, force: force)
  end
end
