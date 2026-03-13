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
      raise ArgumentError, "stripe customer is missing" if user.stripe_customer_id.blank?

      Billing::StripeConfig.client
      Stripe::BillingPortal::Session.create(
        customer: user.stripe_customer_id,
        return_url: "#{Billing::StripeConfig.frontend_origin}/premium"
      )
    end

    private

    attr_reader :user
  end
end
