class ContactMailer < ApplicationMailer
  def inquiry_email
    @category_label = params[:category_label].to_s
    @from_email = params[:email].to_s
    @subject_text = params[:subject].to_s
    @message = params[:message].to_s
    @user = params[:user]
    @user_agent = params[:user_agent].to_s
    @ip_address = params[:ip_address].to_s

    to_address = ENV["CONTACT_MAIL_TO"].presence || ENV.fetch("MAIL_FROM", "no-reply@voice-app.local")
    mail(
      to: to_address,
      reply_to: @from_email,
      subject: "【voice-app お問い合わせ】#{@category_label}: #{@subject_text}"
    )
  end
end
