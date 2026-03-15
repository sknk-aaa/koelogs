# frozen_string_literal: true

module Billing
  class PortalSessionCreator
    def self.call(user:)
      new(user:).call
    end

    def initialize(user:)
      @user = user
    end

    def call
      customer_id = Billing::StripeCustomerLocator.call(user: user, create_if_missing: false)
      raise ArgumentError, "stripe customer is missing" if customer_id.blank?

      Billing::StripeConfig.client
      Stripe::BillingPortal::Session.create(
        customer: customer_id,
        return_url: "#{Billing::StripeConfig.frontend_origin}/premium"
      )
    end

    private

    attr_reader :user
  end
end
