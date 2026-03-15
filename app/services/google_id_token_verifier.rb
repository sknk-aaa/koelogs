require "googleauth/id_tokens"

class GoogleIdTokenVerifier
  class VerificationError < StandardError; end

  ISSUERS = [
    "accounts.google.com",
    "https://accounts.google.com"
  ].freeze

  def initialize(id_token:, client_id: ENV["GOOGLE_CLIENT_ID"])
    @id_token = id_token.to_s
    @client_id = client_id.to_s
  end

  def verify!
    raise VerificationError, "Googleログインの設定が未完了です。" if @client_id.blank?
    raise VerificationError, "Google認証情報がありません。" if @id_token.blank?

    payload = Google::Auth::IDTokens.verify_oidc(@id_token, aud: @client_id)
    raise VerificationError, "Google認証の検証に失敗しました。" unless payload.is_a?(Hash)
    raise VerificationError, "Google認証の発行元が不正です。" unless ISSUERS.include?(payload["iss"].to_s)

    payload
  rescue Google::Auth::IDTokens::VerificationError => e
    raise VerificationError, e.message
  end
end
