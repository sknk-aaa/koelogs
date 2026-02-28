# frozen_string_literal: true

require "json"

module Ai
  class UserLongTermProfileSummarizer
    PROMPT_VERSION = "long-profile-v1"
    MAX_OUTPUT_CHARS = 1000

    class << self
      def summarize!(input:, client: Gemini::Client.new)
        new(input: input, client: client).summarize!
      end
    end

    def initialize(input:, client:)
      @input = input
      @client = client
    end

    def summarize!
      text = @client.generate_text!(
        system_text: system_text,
        user_text: user_text,
        max_output_tokens: 1600,
        temperature: 0.25
      )
      normalize_profile(parse_json(text))
    end

    private

    attr_reader :input

    def system_text
      <<~SYS
        あなたはボイストレーニングの記録要約アシスタントです。
        入力データを根拠に、ユーザーの長期プロフィールをJSONで返してください。

        要件:
        - 出力はJSONのみ（説明文・Markdown・コードフェンス禁止）
        - 事実ベースで要約し、推測を混ぜない
        - 「願望/課題文」を強みに分類しない
        - 項目は次の4つだけ:
          strengths: 0..6件
          challenges: 0..6件
          growth_journey: 0..6件
          custom_items: 0..6件（{title, content}）
        - 各文は日本語で簡潔に（60文字目安）
        - 合計は1000文字以内
      SYS
    end

    def user_text
      JSON.pretty_generate(input)
    end

    def parse_json(text)
      raw = text.to_s.strip
      raw = raw.gsub(/\A```(?:json)?\s*/i, "").gsub(/\s*```\z/, "")
      JSON.parse(raw)
    rescue JSON::ParserError => e
      raise "invalid_json_from_llm: #{e.message}"
    end

    def normalize_profile(raw)
      raise "profile_not_hash" unless raw.is_a?(Hash)

      result = {
        "strengths" => normalize_lines(raw["strengths"]),
        "challenges" => normalize_lines(raw["challenges"]),
        "growth_journey" => normalize_lines(raw["growth_journey"]),
        "custom_items" => normalize_custom_items(raw["custom_items"])
      }

      serialized = JSON.generate(result)
      if serialized.length > MAX_OUTPUT_CHARS
        result["strengths"] = result["strengths"].first(4)
        result["challenges"] = result["challenges"].first(4)
        result["growth_journey"] = result["growth_journey"].first(4)
        result["custom_items"] = result["custom_items"].first(3)
      end
      result
    end

    def normalize_lines(value)
      Array(value).map(&:to_s).map { |v| v.gsub(/\s+/, " ").strip }.reject(&:blank?).uniq.first(6)
    end

    def normalize_custom_items(value)
      Array(value).filter_map do |item|
        next unless item.is_a?(Hash)
        title = item["title"].to_s.gsub(/\s+/, " ").strip
        content = item["content"].to_s.gsub(/\s+/, " ").strip
        next if title.blank? || content.blank?

        { "title" => title.slice(0, 40), "content" => content.slice(0, 220) }
      end.first(6)
    end
  end
end
