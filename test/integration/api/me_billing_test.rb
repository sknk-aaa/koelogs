# frozen_string_literal: true

require "test_helper"

module Api
  class MeBillingTest < ActionDispatch::IntegrationTest
    test "returns premium billing state for active subscription" do
      user = User.create!(
        email: "me-billing-active@example.com",
        password: "password123",
        password_confirmation: "password123",
        email_verified_at: Time.current,
        plan_tier: "premium",
        billing_cycle: "quarterly",
        stripe_subscription_status: "active",
        stripe_current_period_end: Time.zone.local(2026, 6, 1, 12, 0, 0),
        stripe_cancel_at_period_end: false
      )

      post "/api/auth/login", params: { email: user.email, password: "password123" }
      assert_response :ok

      get "/api/me"
      assert_response :ok

      json = JSON.parse(@response.body)
      assert_equal "premium", json["plan_tier"]
      assert_equal "quarterly", json["billing_cycle"]
      assert_equal true, json["premium_access_active"]
      assert_equal "active", json["stripe_subscription_status"]
      assert_equal "2026-06-01T12:00:00+09:00", json["stripe_current_period_end"]
      assert_equal false, json["stripe_cancel_at_period_end"]
    end

    test "returns cancellation state while premium remains active until period end" do
      user = User.create!(
        email: "me-billing-canceling@example.com",
        password: "password123",
        password_confirmation: "password123",
        email_verified_at: Time.current,
        plan_tier: "premium",
        billing_cycle: "monthly",
        stripe_subscription_status: "active",
        stripe_current_period_end: Time.zone.local(2026, 4, 13, 12, 41, 24),
        stripe_cancel_at_period_end: true
      )

      post "/api/auth/login", params: { email: user.email, password: "password123" }
      assert_response :ok

      get "/api/me"
      assert_response :ok

      json = JSON.parse(@response.body)
      assert_equal true, json["premium_access_active"]
      assert_equal true, json["stripe_cancel_at_period_end"]
      assert_equal "monthly", json["billing_cycle"]
    end
  end
end
