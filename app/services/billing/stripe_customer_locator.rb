# frozen_string_literal: true

module Billing
  class StripeCustomerLocator
    def self.call(user:, create_if_missing: true)
      new(user:, create_if_missing:).call
    end

    def initialize(user:, create_if_missing:)
      @user = user
      @create_if_missing = create_if_missing
    end

    def call
      return user.stripe_customer_id if user.stripe_customer_id.present?

      recovered_customer_id = recover_existing_customer_id
      return recovered_customer_id if recovered_customer_id.present?
      return nil unless create_if_missing

      Billing::StripeConfig.client
      customer = Stripe::Customer.create(
        email: user.email,
        name: user.display_name.presence,
        metadata: { user_id: user.id.to_s }
      )

      user.update!(stripe_customer_id: customer.id)
      customer.id
    end

    private

    attr_reader :user, :create_if_missing

    def recover_existing_customer_id
      customer_id_from_subscription.presence || customer_id_from_customer_list.presence
    end

    def customer_id_from_subscription
      return nil if user.stripe_subscription_id.blank?

      Billing::StripeSubscriptionSync.sync_from_subscription_id(
        user.stripe_subscription_id,
        fallback_user: user
      )
      user.reload.stripe_customer_id
    rescue ActiveRecord::RecordNotFound, ArgumentError, Stripe::StripeError => e
      Rails.logger.warn("[Billing][CustomerLocator] failed to recover from subscription: #{e.class}: #{e.message}")
      nil
    end

    def customer_id_from_customer_list
      Billing::StripeConfig.client
      customers = Stripe::Customer.list(email: user.email, limit: 10).data
      customer =
        customers.find { |candidate| candidate.metadata&.[]("user_id").to_s == user.id.to_s } ||
        customers.first
      return nil unless customer

      user.update!(stripe_customer_id: customer.id)
      customer.id
    rescue Stripe::StripeError => e
      Rails.logger.warn("[Billing][CustomerLocator] failed to recover from customer list: #{e.class}: #{e.message}")
      nil
    end
  end
end
