class AiUserProfilesDailyRefreshJob < ApplicationJob
  queue_as :default

  def perform
    User.select(:id).find_in_batches(batch_size: 200) do |batch|
      batch.each do |user|
        AiUserProfileRefreshJob.perform_later(user.id, true)
      end
    end
  end
end
