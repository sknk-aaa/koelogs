# frozen_string_literal: true

module Billing
  class StripeCustomerLocator
    def self.call(user:)
      new(user:).call
    end

    def initialize(user:)
      @user = user
    end

    def call
      return user.stripe_customer_id if user.stripe_customer_id.present?

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

    attr_reader :user
  end
end
