# frozen_string_literal: true

require "test_helper"

module Api
  class SecurityRateLimitsTest < ActionDispatch::IntegrationTest
    setup do
      @original_cache_store = Security::RateLimiter.cache_store
      Security::RateLimiter.cache_store = ActiveSupport::Cache::MemoryStore.new
      ActionMailer::Base.deliveries.clear
    end

    teardown do
      Security::RateLimiter.cache_store = @original_cache_store
      Security::RateLimiter.reset_cache_store!
      ActionMailer::Base.deliveries.clear
    end

    test "throttles repeated password reset requests" do
      user = User.create!(
        email: "security-reset@example.com",
        password: "password123",
        password_confirmation: "password123",
        email_verified_at: Time.current
      )

      5.times do
        post "/api/auth/password_reset_requests", params: { email: user.email }
        assert_response :ok
      end

      post "/api/auth/password_reset_requests", params: { email: user.email }

      assert_response :too_many_requests
      assert_equal "パスワード再設定メールの送信回数が多すぎます。しばらく待ってから再度お試しください。", response.parsed_body["error"]
    end

    test "throttles anonymous help contact submissions" do
      payload = {
        category: "bug",
        email: "sender@example.com",
        subject: "subject",
        message: "message"
      }

      3.times do
        post "/api/help/contact", params: payload
        assert_response :ok
      end

      post "/api/help/contact", params: payload

      assert_response :too_many_requests
      assert_equal "お問い合わせの送信回数が多すぎます。しばらく待ってから再度お試しください。", response.parsed_body["error"]
    end
  end
end
