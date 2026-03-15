# frozen_string_literal: true

require "test_helper"

module Billing
  class PortalSessionCreatorTest < ActiveSupport::TestCase
    FakeCustomer = Struct.new(:id, :metadata)
    FakeCustomerList = Struct.new(:data)
    FakePortalSession = Struct.new(:url)

    test "recovers stripe customer by email before creating portal session" do
      user = User.create!(
        email: "portal-recover@example.com",
        password: "password123",
        password_confirmation: "password123",
        plan_tier: "premium"
      )

      fake_customer = FakeCustomer.new("cus_recovered_123", { "user_id" => user.id.to_s })
      fake_session = FakePortalSession.new("https://billing.stripe.com/session/test")
      customer_list_args = nil
      portal_args = nil

      with_singleton_override(Billing::StripeConfig, :client, -> { Stripe }) do
        with_singleton_override(Stripe::Customer, :list, lambda { |email:, limit:|
          customer_list_args = { email:, limit: }
          FakeCustomerList.new([ fake_customer ])
        }) do
          with_singleton_override(Stripe::BillingPortal::Session, :create, lambda { |customer:, return_url:|
            portal_args = { customer:, return_url: }
            fake_session
          }) do
            session = Billing::PortalSessionCreator.call(user: user)

            assert_equal fake_session.url, session.url
          end
        end
      end

      user.reload
      assert_equal({ email: user.email, limit: 10 }, customer_list_args)
      assert_equal(
        { customer: "cus_recovered_123", return_url: "#{Billing::StripeConfig.frontend_origin}/premium" },
        portal_args
      )
      assert_equal "cus_recovered_123", user.stripe_customer_id
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
