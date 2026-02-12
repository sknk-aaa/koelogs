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
  end
end
