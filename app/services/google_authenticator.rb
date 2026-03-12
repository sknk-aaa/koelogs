class GoogleAuthenticator
  class AuthenticationError < StandardError; end

  DEFAULT_PASSWORD_LENGTH = 32

  def initialize(id_token:)
    @id_token = id_token.to_s
  end

  def authenticate!
    payload = GoogleIdTokenVerifier.new(id_token: @id_token).verify!
    email = payload["email"].to_s.strip.downcase
    google_sub = payload["sub"].to_s
    email_verified = payload["email_verified"] == true || payload["email_verified"].to_s == "true"

    raise AuthenticationError, "Googleアカウントのメールアドレスを取得できませんでした。" if email.blank?
    raise AuthenticationError, "Googleアカウントの確認済みメールアドレスが必要です。" unless email_verified
    raise AuthenticationError, "Googleアカウント識別子を取得できませんでした。" if google_sub.blank?

    User.transaction do
      user = User.find_by(google_sub: google_sub)
      return sync_google_user!(user, email:, google_sub:) if user

      email_user = User.find_by(email: email)
      return link_existing_user!(email_user, google_sub:) if email_user

      create_google_user!(email:, google_sub:)
    end
  rescue GoogleIdTokenVerifier::VerificationError => e
    raise AuthenticationError, e.message
  end

  private

  def sync_google_user!(user, email:, google_sub:)
    attrs = {}
    attrs[:google_sub] = google_sub if user.google_sub.blank?
    attrs[:email_verified_at] = Time.current unless user.email_verified?

    if user.email != email && User.where(email: email).where.not(id: user.id).none?
      attrs[:email] = email
    end

    user.update!(attrs) if attrs.any?
    user
  end

  def link_existing_user!(user, google_sub:)
    if user.google_sub.present? && user.google_sub != google_sub
      raise AuthenticationError, "このメールアドレスには別のGoogleアカウントが紐づいています。"
    end

    attrs = { google_sub: google_sub }
    attrs[:email_verified_at] = Time.current unless user.email_verified?
    user.update!(attrs)
    user
  end

  def create_google_user!(email:, google_sub:)
    password = SecureRandom.urlsafe_base64(DEFAULT_PASSWORD_LENGTH)
    User.create!(
      email: email,
      password: password,
      password_confirmation: password,
      google_sub: google_sub,
      email_verified_at: Time.current
    )
  end
end
