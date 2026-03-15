# frozen_string_literal: true

module Api
  class BillingController < ApplicationController
    before_action :require_login!, except: [ :webhook ]

    def create_checkout_session
      if current_user.premium_access_active?
        return render json: { errors: [ "すでにプレミアムプランをご利用中です" ] }, status: :unprocessable_entity
      end

      session = Billing::CheckoutSessionCreator.call(
        user: current_user,
        billing_cycle: params[:billing_cycle]
      )

      render json: { data: { url: session.url } }, status: :ok
    rescue ArgumentError => e
      render json: { errors: [ e.message ] }, status: :unprocessable_entity
    rescue Stripe::StripeError => e
      Rails.logger.error("[Billing][Checkout] #{e.class}: #{e.message}")
      render json: { errors: [ "決済セッションの作成に失敗しました" ] }, status: :unprocessable_entity
    end

    def confirm_checkout_session
      session_id = params[:session_id].to_s
      return render json: { errors: [ "session_id is required" ] }, status: :unprocessable_entity if session_id.blank?

      Billing::StripeConfig.client
      session = Stripe::Checkout::Session.retrieve(session_id)
      unless checkout_session_belongs_to_current_user?(session)
        return render json: { errors: [ "checkout session does not belong to current user" ] }, status: :forbidden
      end

      Billing::StripeSubscriptionSync.sync_from_checkout_session(session)
      render json: { data: { ok: true } }, status: :ok
    rescue ActiveRecord::RecordNotFound, ArgumentError => e
      render json: { errors: [ e.message ] }, status: :unprocessable_entity
    rescue Stripe::StripeError => e
      Rails.logger.error("[Billing][Confirm] #{e.class}: #{e.message}")
      render json: { errors: [ "購入結果の確認に失敗しました" ] }, status: :unprocessable_entity
    end

    def create_portal_session
      session = Billing::PortalSessionCreator.call(user: current_user)
      render json: { data: { url: session.url } }, status: :ok
    rescue ArgumentError => e
      render json: { errors: [ e.message ] }, status: :unprocessable_entity
    rescue Stripe::StripeError => e
      Rails.logger.error("[Billing][Portal] #{e.class}: #{e.message}")
      render json: { errors: [ "契約管理ページの起動に失敗しました" ] }, status: :unprocessable_entity
    end

    def refresh_subscription
      Billing::StripeSubscriptionRefresher.call(user: current_user)
      render json: { data: { ok: true } }, status: :ok
    rescue ArgumentError => e
      render json: { errors: [ e.message ] }, status: :unprocessable_entity
    rescue Stripe::StripeError => e
      Rails.logger.error("[Billing][Refresh] #{e.class}: #{e.message}")
      render json: { errors: [ "契約状態の更新に失敗しました" ] }, status: :unprocessable_entity
    end

    def webhook
      secret = Billing::StripeConfig.webhook_secret
      if secret.blank?
        return render json: { error: "stripe webhook is not configured" }, status: :service_unavailable
      end

      event = Stripe::Webhook.construct_event(
        request.raw_post,
        request.headers["Stripe-Signature"],
        secret
      )
      handle_webhook_event(event)
      head :ok
    rescue JSON::ParserError, Stripe::SignatureVerificationError => e
      Rails.logger.warn("[Billing][Webhook] #{e.class}: #{e.message}")
      render json: { error: "invalid webhook signature" }, status: :bad_request
    rescue ActiveRecord::RecordInvalid, ActiveRecord::RecordNotFound, ArgumentError => e
      Rails.logger.warn("[Billing][Webhook] #{e.class}: #{e.message}")
      render json: { error: "webhook handling failed" }, status: :unprocessable_entity
    rescue Stripe::StripeError => e
      Rails.logger.error("[Billing][Webhook] #{e.class}: #{e.message}")
      render json: { error: "stripe webhook failed" }, status: :bad_gateway
    end

    private

    def checkout_session_belongs_to_current_user?(session)
      return true if session.client_reference_id.to_s == current_user.id.to_s
      return true if session.metadata&.[]("user_id").to_s == current_user.id.to_s
      return true if current_user.stripe_customer_id.present? && session.customer.to_s == current_user.stripe_customer_id

      false
    end

    def handle_webhook_event(event)
      case event.type
      when "checkout.session.completed"
        Billing::StripeSubscriptionSync.sync_from_checkout_session(event.data.object)
      when "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"
        Billing::StripeSubscriptionSync.sync_from_subscription_object(event.data.object)
      end
    end
  end
end
