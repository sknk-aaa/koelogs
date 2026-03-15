# frozen_string_literal: true

require "test_helper"

module Billing
  class StripeSubscriptionRefresherTest < ActiveSupport::TestCase
    FakeSubscriptionList = Struct.new(:data)

    test "refreshes from subscription id even when stripe customer is missing" do
      user = User.create!(
        email: "billing-refresh@example.com",
        password: "password123",
        password_confirmation: "password123",
        plan_tier: "premium",
        stripe_subscription_id: "sub_missing_customer_123"
      )
      sync_args = nil

      with_singleton_override(Billing::StripeSubscriptionSync, :sync_from_subscription_id, lambda { |subscription_id, fallback_user:|
        sync_args = { subscription_id:, fallback_user: }
        true
      }) do
        with_singleton_override(Stripe::Subscription, :list, lambda { |**|
          raise "Stripe::Subscription.list should not be called when subscription id is present"
        }) do
          Billing::StripeSubscriptionRefresher.call(user: user)
        end
      end

      assert_equal(
        { subscription_id: "sub_missing_customer_123", fallback_user: user },
        sync_args
      )
    end

    def with_singleton_override(target, method_name, callable)
      original_method = target.method(method_name)
      target.define_singleton_method(method_name, &callable)
      yield
    ensure
      target.define_singleton_method(method_name, original_method)
    end
  end
end
