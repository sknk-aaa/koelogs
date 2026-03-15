# frozen_string_literal: true

module Billing
  module StripeConfig
    module_function

    def client
      Stripe.api_key = secret_key
      Stripe
    end

    def secret_key
      ENV["STRIPE_SECRET_KEY"].to_s
    end

    def webhook_secret
      ENV["STRIPE_WEBHOOK_SECRET"].to_s
    end

    def frontend_origin
      ENV["FRONTEND_ORIGIN"].presence || "http://localhost:5173"
    end

    def price_id_for_cycle!(billing_cycle)
      case billing_cycle.to_s
      when "monthly"
        env_fetch!("STRIPE_PRICE_PREMIUM_MONTHLY")
      when "quarterly"
        env_fetch!("STRIPE_PRICE_PREMIUM_QUARTERLY")
      else
        raise ArgumentError, "unsupported billing cycle: #{billing_cycle}"
      end
    end

    def billing_cycle_for_price_id(price_id)
      return "monthly" if price_id.present? && price_id == ENV["STRIPE_PRICE_PREMIUM_MONTHLY"].to_s
      return "quarterly" if price_id.present? && price_id == ENV["STRIPE_PRICE_PREMIUM_QUARTERLY"].to_s

      nil
    end

    def env_fetch!(key)
      value = ENV[key].to_s
      raise ArgumentError, "#{key} is not configured" if value.blank?

      value
    end
  end
end
