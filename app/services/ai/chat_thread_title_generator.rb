# frozen_string_literal: true

module Ai
  class ChatThreadTitleGenerator
    MAX_TITLE_CHARS = 15

    class << self
      def generate!(message_text:, user:, client: Gemini::Client.new)
        new(message_text: message_text, user: user, client: client).generate!
      end
    end

    def initialize(message_text:, user:, client:)
      @message_text = message_text.to_s.strip
      @user = user
      @client = client
    end

    def generate!
      return fallback_title if @message_text.blank?

      raw = @client.generate_text!(
        system_text: system_text,
        user_text: user_text,
        max_output_tokens: 80,
        temperature: 0.2,
        user: @user,
        feature: "chat_title"
      )
      normalize_title(raw)
    rescue => e
      Rails.logger.warn("[AI][ChatThreadTitle] fallback #{e.class}: #{e.message}")
      fallback_title
    end

    private

    def system_text
      <<~SYS
        あなたは会話タイトル要約アシスタントです。
        ユーザーの最初の質問から、日本語の短い会話タイトルを1つだけ返してください。

        要件:
        - 出力はタイトル文字列のみ
        - Markdown・説明文・かぎ括弧禁止
        - 最大15文字
        - 内容が一目で分かる自然な名詞句にする
        - 「相談」「質問」など曖昧な語でごまかさない
      SYS
    end

    def user_text
      @message_text
    end

    def normalize_title(raw)
      title = raw.to_s.strip
      title = title.gsub(/\A[「『"']+|[」』"']+\z/, "")
      title = title.gsub(/\s+/, " ").strip
      title = title.lines.first.to_s.strip
      title = fallback_title if title.blank?
      title.slice(0, MAX_TITLE_CHARS)
    end

    def fallback_title
      normalized = @message_text.tr("\n", " ").gsub(/\s+/, " ").strip
      return "新しい会話" if normalized.blank?

      normalized.slice(0, MAX_TITLE_CHARS)
    end
  end
end
