# frozen_string_literal: true

module Billing
  class StripeSubscriptionRefresher
    def self.call(user:)
      new(user:).call
    end

    def initialize(user:)
      @user = user
    end

    def call
      raise ArgumentError, "stripe customer is missing" if user.stripe_customer_id.blank?

      if user.stripe_subscription_id.present?
        return Billing::StripeSubscriptionSync.sync_from_subscription_id(
          user.stripe_subscription_id,
          fallback_user: user
        )
      end

      Billing::StripeConfig.client
      subscription = Stripe::Subscription.list(
        customer: user.stripe_customer_id,
        status: "all",
        limit: 1
      ).data.first

      if subscription.present?
        Billing::StripeSubscriptionSync.sync_from_subscription_object(subscription)
      else
        user.update!(
          plan_tier: "free",
          billing_cycle: nil,
          stripe_subscription_status: nil,
          stripe_current_period_end: nil,
          stripe_cancel_at_period_end: false
        )
      end
    end

    private

    attr_reader :user
  end
end
