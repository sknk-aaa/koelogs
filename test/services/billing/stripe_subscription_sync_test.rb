# frozen_string_literal: true

require "test_helper"

module Billing
  class StripeSubscriptionSyncTest < ActiveSupport::TestCase
    FakePrice = Struct.new(:id)
    FakeItem = Struct.new(:price, :current_period_end)
    FakeItems = Struct.new(:data)

    class FakeSubscription
      attr_reader :id, :customer, :status, :items, :cancel_at_period_end, :cancel_at, :metadata

      def initialize(id:, customer:, status:, price_id:, current_period_end:, cancel_at_period_end:, cancel_at: nil, metadata: {})
        @id = id
        @customer = customer
        @status = status
        @items = FakeItems.new([ FakeItem.new(FakePrice.new(price_id), current_period_end) ])
        @cancel_at_period_end = cancel_at_period_end
        @cancel_at = cancel_at
        @metadata = metadata
      end

      def [](key)
        return items.data.first.current_period_end if key == :current_period_end

        nil
      end
    end

    test "syncs active monthly subscription into premium state" do
      user = User.create!(
        email: "billing-sync-monthly@example.com",
        password: "password123",
        password_confirmation: "password123",
        stripe_customer_id: "cus_monthly_123"
      )
      subscription = build_subscription(
        id: "sub_monthly_123",
        customer: user.stripe_customer_id,
        status: "active",
        price_id: "price_monthly_123",
        current_period_end: period_end_timestamp(2026, 4, 13, 12, 0, 0),
        cancel_at_period_end: false,
        metadata: { "user_id" => user.id.to_s }
      )

      with_price_env do
        Billing::StripeSubscriptionSync.sync_from_subscription_object(subscription)
      end

      user.reload
      assert_equal "premium", user.plan_tier
      assert_equal "monthly", user.billing_cycle
      assert_equal "sub_monthly_123", user.stripe_subscription_id
      assert_equal "active", user.stripe_subscription_status
      assert_equal Time.zone.local(2026, 4, 13, 12, 0, 0), user.stripe_current_period_end
      assert_equal false, user.stripe_cancel_at_period_end
      assert_equal true, user.premium_access_active?
    end

    test "keeps premium access during cancel-at-period-end quarterly subscription" do
      user = User.create!(
        email: "billing-sync-quarterly@example.com",
        password: "password123",
        password_confirmation: "password123",
        stripe_customer_id: "cus_quarterly_123"
      )
      subscription = build_subscription(
        id: "sub_quarterly_123",
        customer: user.stripe_customer_id,
        status: "active",
        price_id: "price_quarterly_123",
        current_period_end: period_end_timestamp(2026, 6, 30, 9, 0, 0),
        cancel_at_period_end: true,
        metadata: { "user_id" => user.id.to_s }
      )

      with_price_env do
        Billing::StripeSubscriptionSync.sync_from_subscription_object(subscription)
      end

      user.reload
      assert_equal "premium", user.plan_tier
      assert_equal "quarterly", user.billing_cycle
      assert_equal true, user.stripe_cancel_at_period_end
      assert_equal true, user.premium_access_active?
    end

    test "treats cancel_at as scheduled cancellation even when flag is false" do
      user = User.create!(
        email: "billing-sync-cancel-at@example.com",
        password: "password123",
        password_confirmation: "password123",
        stripe_customer_id: "cus_cancel_at_123"
      )
      subscription = build_subscription(
        id: "sub_cancel_at_123",
        customer: user.stripe_customer_id,
        status: "active",
        price_id: "price_monthly_123",
        current_period_end: period_end_timestamp(2026, 4, 13, 12, 41, 24),
        cancel_at_period_end: false,
        cancel_at: period_end_timestamp(2026, 4, 13, 12, 41, 24),
        metadata: { "user_id" => user.id.to_s }
      )

      with_price_env do
        Billing::StripeSubscriptionSync.sync_from_subscription_object(subscription)
      end

      user.reload
      assert_equal "premium", user.plan_tier
      assert_equal true, user.stripe_cancel_at_period_end
      assert_equal true, user.premium_access_active?
    end

    test "drops back to free when subscription is canceled" do
      user = User.create!(
        email: "billing-sync-canceled@example.com",
        password: "password123",
        password_confirmation: "password123",
        plan_tier: "premium",
        billing_cycle: "monthly",
        stripe_customer_id: "cus_canceled_123"
      )
      subscription = build_subscription(
        id: "sub_canceled_123",
        customer: user.stripe_customer_id,
        status: "canceled",
        price_id: "price_monthly_123",
        current_period_end: period_end_timestamp(2026, 4, 13, 12, 0, 0),
        cancel_at_period_end: false,
        metadata: { "user_id" => user.id.to_s }
      )

      with_price_env do
        Billing::StripeSubscriptionSync.sync_from_subscription_object(subscription)
      end

      user.reload
      assert_equal "free", user.plan_tier
      assert_nil user.billing_cycle
      assert_equal "canceled", user.stripe_subscription_status
      assert_equal false, user.premium_access_active?
    end

    private

    def build_subscription(**attrs)
      FakeSubscription.new(**attrs)
    end

    def period_end_timestamp(year, month, day, hour, minute, second)
      Time.zone.local(year, month, day, hour, minute, second).to_i
    end

    def with_price_env
      previous_monthly = ENV["STRIPE_PRICE_PREMIUM_MONTHLY"]
      previous_quarterly = ENV["STRIPE_PRICE_PREMIUM_QUARTERLY"]
      ENV["STRIPE_PRICE_PREMIUM_MONTHLY"] = "price_monthly_123"
      ENV["STRIPE_PRICE_PREMIUM_QUARTERLY"] = "price_quarterly_123"
      yield
    ensure
      ENV["STRIPE_PRICE_PREMIUM_MONTHLY"] = previous_monthly
      ENV["STRIPE_PRICE_PREMIUM_QUARTERLY"] = previous_quarterly
    end
  end
end
