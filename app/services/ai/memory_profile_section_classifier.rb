# frozen_string_literal: true

require "json"

module Ai
  class MemoryProfileSectionClassifier
    SECTIONS = %w[strengths challenges growth_journey avoid_notes profile].freeze

    class << self
      def classify(text:, destination:, user:, client: nil)
        normalized_text = text.to_s.gsub(/\s+/, " ").strip
        return :challenges if normalized_text.blank?

        normalized_destination = destination.to_s.strip
        return :profile if normalized_destination == "profile"

        llm_client = client || Gemini::Client.new
        raw = llm_client.generate_text!(
          system_text: system_text,
          user_text: user_text(normalized_text),
          max_output_tokens: 120,
          temperature: 0.0,
          user: user,
          feature: "chat"
        )

        section = parse_section(raw)
        return section if section

        fallback_section(normalized_text)
      rescue => e
        Rails.logger.warn("[AI][MemoryProfileSectionClassifier] #{e.class}: #{e.message}")
        fallback_section(normalized_text)
      end

      private

      def system_text
        <<~SYS
          あなたは保存メモの分類アシスタントです。
          入力文を次の5分類のどれか1つに分類してください。

          strengths / challenges / growth_journey / avoid_notes / profile

          出力はJSONのみ:
          {"section":"strengths|challenges|growth_journey|avoid_notes|profile"}

          分類ルール:
          - 「避けたい/控えたい/やめたい/注意したい」なら avoid_notes
          - 「できた/安定してきた/得意」なら strengths
          - 「伸びた/改善した/前より」なら growth_journey
          - 上記以外の悩み・停滞・不安は challenges
          - 個人プロフィール情報なら profile
        SYS
      end

      def user_text(text)
        "分類対象: #{text}"
      end

      def parse_section(raw)
        text = raw.to_s.strip
        text = text.gsub(/\A```(?:json)?\s*/i, "").gsub(/\s*```\z/, "")
        json_part = text[/\{.*\}/m] || text
        parsed = JSON.parse(json_part)
        section = parsed["section"].to_s.strip
        return nil unless SECTIONS.include?(section)

        section.to_sym
      rescue JSON::ParserError
        plain = raw.to_s.strip
        return nil if plain.blank?

        token = plain.gsub(/[^\w]/, "")
        return token.to_sym if SECTIONS.include?(token)

        nil
      end

      def fallback_section(text)
        return :avoid_notes if text.match?(/避け|注意|やめ|NG|控えたい|したくない|やりたくない/)
        return :strengths if text.match?(/強み|できる|安定してきた|得意|できた/)
        return :growth_journey if text.match?(/成長|伸び|改善してきた|前より|向上/)

        :challenges
      end
    end
  end
end
