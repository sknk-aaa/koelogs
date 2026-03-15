# frozen_string_literal: true

module Billing
  class CheckoutSessionCreator
    def self.call(user:, billing_cycle:)
      new(user:, billing_cycle:).call
    end

    def initialize(user:, billing_cycle:)
      @user = user
      @billing_cycle = billing_cycle.to_s
    end

    def call
      raise ArgumentError, "unsupported billing cycle" unless User::BILLING_CYCLES.include?(billing_cycle)

      customer_id = Billing::StripeCustomerLocator.call(user: user)
      Billing::StripeConfig.client
      Stripe::Checkout::Session.create(
        mode: "subscription",
        customer: customer_id,
        client_reference_id: user.id.to_s,
        success_url: success_url,
        cancel_url: cancel_url,
        line_items: [
          {
            price: Billing::StripeConfig.price_id_for_cycle!(billing_cycle),
            quantity: 1
          }
        ],
        subscription_data: {
          metadata: {
            user_id: user.id.to_s,
            billing_cycle: billing_cycle
          }
        },
        metadata: {
          user_id: user.id.to_s,
          billing_cycle: billing_cycle
        },
        allow_promotion_codes: true,
        locale: "ja"
      )
    end

    private

    attr_reader :user, :billing_cycle

    def success_url
      "#{Billing::StripeConfig.frontend_origin}/premium?checkout=success&session_id={CHECKOUT_SESSION_ID}"
    end

    def cancel_url
      "#{Billing::StripeConfig.frontend_origin}/premium?checkout=cancelled"
    end
  end
end
