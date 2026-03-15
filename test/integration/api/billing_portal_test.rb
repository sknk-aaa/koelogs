# frozen_string_literal: true

require "test_helper"

module Api
  class BillingPortalTest < ActionDispatch::IntegrationTest
    test "returns portal url for logged in user" do
      user = User.create!(
        email: "billing-portal@example.com",
        password: "password123",
        password_confirmation: "password123",
        email_verified_at: Time.current
      )

      fake_session = Struct.new(:url).new("https://billing.stripe.com/session/test")
      captured_email = nil

      post "/api/auth/login", params: { email: user.email, password: "password123" }
      assert_response :ok

      with_singleton_override(Billing::PortalSessionCreator, :call, lambda { |user:|
        captured_email = user.email
        fake_session
      }) do
        post "/api/billing/portal"
      end

      assert_response :ok
      assert_equal "billing-portal@example.com", captured_email
      assert_equal fake_session.url, response.parsed_body.dig("data", "url")
    end

    private

    def with_singleton_override(target, method_name, callable)
      original_method = target.method(method_name)
      target.define_singleton_method(method_name, &callable)
      yield
    ensure
      target.define_singleton_method(method_name, original_method)
    end
  end
end
