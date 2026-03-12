module Api
  class AuthController < ApplicationController
    def signup
      user = User.new(email: params[:email], password: params[:password], password_confirmation: params[:password_confirmation])
      token = nil

      User.transaction do
        user.save!
        token = user.generate_email_verification_token!
      end

      EmailVerificationMailer.with(user: user, token: token).verification_email.deliver_now

      render json: {
        ok: true,
        email_verification_required: true,
        message: "確認メールを送信しました。メール内のリンクを開いて登録を完了してください。"
      }, status: :created
    rescue ActiveRecord::RecordInvalid => e
      render json: { error: e.record.errors.full_messages }, status: :unprocessable_entity
    rescue => e
      user.destroy! if defined?(user) && user&.persisted? && !user.email_verified?
      Rails.logger.error("[Auth][Signup] #{e.class}: #{e.message}")
      render json: { error: "確認メールの送信に失敗しました。時間をおいて再度お試しください。" }, status: :internal_server_error
    end

    def login
      email = params[:email].to_s.strip.downcase
      user = User.find_by(email: email)
      if user&.authenticate(params[:password])
        unless user.email_verified?
          return render json: {
            error: "メールアドレスの確認が完了していません。確認メール内のリンクを開いてからログインしてください。",
            code: "email_not_verified"
          }, status: :forbidden
        end

        session[:user_id] = user.id
        render json: { ok: true }, status: :ok
      else
        render json: { error: "invalid email or password" }, status: :unauthorized
      end
    end

    def logout
      session.delete(:user_id)
      render json: { ok: true }, status: :ok
    end

    def google_login
      user = GoogleAuthenticator.new(id_token: params[:credential]).authenticate!
      session[:user_id] = user.id
      render json: { ok: true }, status: :ok
    rescue GoogleAuthenticator::AuthenticationError => e
      render json: { error: e.message }, status: :unauthorized
    rescue => e
      Rails.logger.error("[Auth][GoogleLogin] #{e.class}: #{e.message}")
      render json: { error: "Googleログインに失敗しました。時間をおいて再度お試しください。" }, status: :internal_server_error
    end

    # POST /api/auth/password_reset_requests
    # body: { email: "user@example.com" }
    def password_reset_request
      email = params[:email].to_s.strip.downcase

      if email.present?
        user = User.find_by(email: email)
        if user&.can_send_password_reset_email?
          token = user.generate_password_reset_token!
          PasswordResetMailer.with(user: user, token: token).reset_email.deliver_now
        end
      end

      render_password_reset_request_response
    rescue => e
      Rails.logger.error("[Auth][PasswordResetRequest] #{e.class}: #{e.message}")
      render_password_reset_request_response
    end

    # POST /api/auth/password_resets
    # body: { token: "...", password: "...", password_confirmation: "..." }
    def password_reset
      token = params[:token].to_s
      password = params[:password].to_s
      password_confirmation = params[:password_confirmation].to_s

      if token.blank?
        return render json: { error: "token is required" }, status: :unprocessable_entity
      end

      digest = Digest::SHA256.hexdigest(token)
      user = User.find_by(password_reset_token_digest: digest)
      if user.nil? || !user.password_reset_token_valid?(token)
        return render json: { error: "token is invalid or expired" }, status: :unprocessable_entity
      end

      user.assign_attributes(
        password: password,
        password_confirmation: password_confirmation,
        password_reset_token_digest: nil,
        password_reset_sent_at: nil
      )

      if user.save
        render json: { ok: true }, status: :ok
      else
        render json: { error: user.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def email_verification_request
      email = params[:email].to_s.strip.downcase

      if email.present?
        user = User.find_by(email: email)
        if user && !user.email_verified? && user.can_send_email_verification_email?
          token = user.generate_email_verification_token!
          EmailVerificationMailer.with(user: user, token: token).verification_email.deliver_now
        end
      end

      render json: {
        ok: true,
        message: "対象のアカウントがある場合は、確認メールを送信しました。"
      }, status: :ok
    rescue => e
      Rails.logger.error("[Auth][EmailVerificationRequest] #{e.class}: #{e.message}")
      render json: {
        ok: true,
        message: "対象のアカウントがある場合は、確認メールを送信しました。"
      }, status: :ok
    end

    def email_verification
      token = params[:token].to_s
      if token.blank?
        return render json: { error: "token is required" }, status: :unprocessable_entity
      end

      digest = Digest::SHA256.hexdigest(token)
      user = User.find_by(email_verification_token_digest: digest)
      if user.nil? || !user.email_verification_token_valid?(token)
        return render json: { error: "token is invalid or expired" }, status: :unprocessable_entity
      end

      user.verify_email!
      render json: { ok: true, message: "メールアドレス確認が完了しました。ログインしてください。" }, status: :ok
    end

    private

    def render_password_reset_request_response
      render json: {
        ok: true,
        message: "If an account exists for this email, a password reset email has been sent."
      }, status: :ok
    end
  end
end
