require "cgi"

class EmailVerificationMailer < ApplicationMailer
  def verification_email
    @user = params[:user]
    token = params[:token].to_s
    @verification_url = build_verification_url(token)

    mail(to: @user.email, subject: "【Koelogs】メールアドレス確認のお願い")
  end

  private

  def build_verification_url(token)
    origin = ENV["FRONTEND_ORIGIN"].presence || "http://localhost:5173"
    "#{origin}/login?verify_token=#{CGI.escape(token)}"
  end
end
