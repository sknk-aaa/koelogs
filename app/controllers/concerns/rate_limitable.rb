# frozen_string_literal: true

module RateLimitable
  extend ActiveSupport::Concern

  private

  def enforce_rate_limit!(key:, limit:, window:, message: "時間をおいて再度お試しください。")
    identifier = current_user ? "user:#{current_user.id}" : "ip:#{request.remote_ip}"
    throttled = Security::RateLimiter.throttle!(
      key: key,
      identifier: identifier,
      limit: limit,
      window: window
    )
    return false unless throttled

    render json: { error: message }, status: :too_many_requests
    true
  end
end
