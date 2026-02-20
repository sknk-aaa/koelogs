require "cgi"

class PasswordResetMailer < ApplicationMailer
  def reset_email
    @user = params[:user]
    token = params[:token].to_s
    @reset_url = build_reset_url(token)

    mail(to: @user.email, subject: "【voice-app】パスワード再設定のご案内")
  end

  private

  def build_reset_url(token)
    origin = ENV["FRONTEND_ORIGIN"].presence || "http://localhost:5173"
    "#{origin}/login?reset_token=#{CGI.escape(token)}"
  end
end
