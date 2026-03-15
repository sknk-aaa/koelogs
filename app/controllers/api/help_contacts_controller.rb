module Api
  class HelpContactsController < ApplicationController
    CATEGORIES = {
      "bug" => "不具合",
      "request" => "要望",
      "other" => "その他"
    }.freeze
    SUBJECT_MAX_LENGTH = 80
    MESSAGE_MAX_LENGTH = 1000
    EMAIL_REGEX = /\A[^\s@]+@[^\s@]+\.[^\s@]+\z/

    def create
      return if enforce_rate_limit!(
        key: "help:contact",
        limit: 3,
        window: 10.minutes,
        message: "お問い合わせの送信回数が多すぎます。しばらく待ってから再度お試しください。"
      )

      payload = contact_params.to_h.symbolize_keys
      payload[:category] = payload[:category].to_s
      payload[:email] = payload[:email].to_s.strip
      payload[:subject] = payload[:subject].to_s.strip
      payload[:message] = payload[:message].to_s.strip

      errors = validate_payload(payload)
      return render json: { error: errors }, status: :unprocessable_entity if errors.any?

      ContactMailer.with(
        category: payload[:category],
        category_label: CATEGORIES.fetch(payload[:category]),
        email: payload[:email],
        subject: payload[:subject],
        message: payload[:message],
        user: current_user,
        user_agent: request.user_agent.to_s,
        ip_address: request.remote_ip.to_s
      ).inquiry_email.deliver_now

      render json: { ok: true }, status: :ok
    rescue => e
      Rails.logger.error("[HelpContacts#create] #{e.class}: #{e.message}")
      render json: { error: "お問い合わせの送信に失敗しました。時間をおいて再度お試しください。" }, status: :internal_server_error
    end

    private

    def contact_params
      params.permit(:category, :email, :subject, :message)
    end

    def validate_payload(payload)
      errors = []

      errors << "種別を選択してください。" unless CATEGORIES.key?(payload[:category])

      if payload[:email].blank?
        errors << "メールアドレスを入力してください。"
      elsif !payload[:email].match?(EMAIL_REGEX)
        errors << "メールアドレスの形式が正しくありません。"
      end

      if payload[:subject].blank?
        errors << "件名を入力してください。"
      elsif payload[:subject].length > SUBJECT_MAX_LENGTH
        errors << "件名は#{SUBJECT_MAX_LENGTH}文字以内で入力してください。"
      end

      if payload[:message].blank?
        errors << "本文を入力してください。"
      elsif payload[:message].length > MESSAGE_MAX_LENGTH
        errors << "本文は#{MESSAGE_MAX_LENGTH}文字以内で入力してください。"
      end

      errors
    end
  end
end
