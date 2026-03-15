# frozen_string_literal: true

module Billing
  class StripeSubscriptionSync
    ACTIVE_STATUSES = %w[active trialing past_due].freeze

    def self.sync_from_checkout_session(session)
      new.sync_from_checkout_session(session)
    end

    def self.sync_from_subscription_object(subscription)
      new.sync_from_subscription_object(subscription)
    end

    def self.sync_from_subscription_id(subscription_id, fallback_user: nil)
      new.sync_from_subscription_id(subscription_id, fallback_user:)
    end

    def sync_from_checkout_session(session)
      subscription_id = session.respond_to?(:subscription) ? session.subscription : nil
      user = user_from_checkout_session(session)
      raise ActiveRecord::RecordNotFound, "user not found for checkout session" unless user
      raise ArgumentError, "subscription is missing for checkout session" if subscription_id.blank?

      sync_from_subscription_id(subscription_id, fallback_user: user)
    end

    def sync_from_subscription_object(subscription)
      user = user_from_subscription(subscription)
      raise ActiveRecord::RecordNotFound, "user not found for subscription" unless user

      sync_user!(user, subscription)
    end

    def sync_from_subscription_id(subscription_id, fallback_user: nil)
      Billing::StripeConfig.client
      subscription = Stripe::Subscription.retrieve({
        id: subscription_id,
        expand: [ "items.data.price" ]
      })
      user = fallback_user || user_from_subscription(subscription)
      raise ActiveRecord::RecordNotFound, "user not found for subscription" unless user

      sync_user!(user, subscription)
    end

    private

    def sync_user!(user, subscription)
      status = subscription.status.to_s
      price_id = subscription.items&.data&.first&.price&.id
      billing_cycle = Billing::StripeConfig.billing_cycle_for_price_id(price_id)
      premium_active = ACTIVE_STATUSES.include?(status)
      current_period_end = subscription.items&.data&.first&.current_period_end || subscription[:current_period_end]
      cancel_at = subscription.respond_to?(:cancel_at) ? subscription.cancel_at : subscription[:cancel_at]
      cancel_at_period_end = !!subscription.cancel_at_period_end || cancel_at.present?

      user.update!(
        stripe_customer_id: subscription.customer,
        stripe_subscription_id: subscription.id,
        stripe_subscription_status: status.presence,
        stripe_current_period_end: timestamp_to_time(current_period_end),
        stripe_cancel_at_period_end: cancel_at_period_end,
        plan_tier: premium_active ? "premium" : "free",
        billing_cycle: premium_active ? billing_cycle : nil
      )
    end

    def user_from_checkout_session(session)
      user_id = session.client_reference_id.presence || session.metadata&.[]("user_id").presence
      return User.find_by(id: user_id) if user_id.present?
      return User.find_by(stripe_customer_id: session.customer) if session.customer.present?

      nil
    end

    def user_from_subscription(subscription)
      user_id = subscription.metadata&.[]("user_id").presence
      return User.find_by(id: user_id) if user_id.present?
      return User.find_by(stripe_customer_id: subscription.customer) if subscription.customer.present?
      return User.find_by(stripe_subscription_id: subscription.id) if subscription.id.present?

      nil
    end

    def timestamp_to_time(value)
      return nil if value.blank?

      Time.zone.at(value.to_i)
    end
  end
end
