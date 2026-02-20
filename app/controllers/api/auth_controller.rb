module Api
  class AuthController < ApplicationController
    def signup
      user = User.new(email: params[:email], password: params[:password], password_confirmation: params[:password_confirmation])
      user.save!

      session[:user_id] = user.id
      render json: { ok: true }, status: :created
    rescue ActiveRecord::RecordInvalid => e
      render json: { error: e.record.errors.full_messages }, status: :unprocessable_entity
    end

    def login
      user = User.find_by(email: params[:email])
      if user&.authenticate(params[:password])
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

    private

    def render_password_reset_request_response
      render json: {
        ok: true,
        message: "If an account exists for this email, a password reset email has been sent."
      }, status: :ok
    end
  end
end
