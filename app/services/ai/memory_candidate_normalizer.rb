# frozen_string_literal: true

require "json"

module Ai
  class MemoryCandidateNormalizer
    MAX_OUTPUT_CHARS = 80
    MIN_SIMILARITY_SCORE = 0.12
    MAX_LLM_ATTEMPTS = 2

    class << self
      def normalize(text:, user:, client: nil)
        source = compact_text(text)
        return nil if source.blank?

        llm_client = client || Gemini::Client.new
        llm_candidate = normalize_with_llm(source: source, user: user, llm_client: llm_client)
        return llm_candidate if llm_candidate.present?

        fallback = rule_fallback(source)
        return source if invalid_candidate?(fallback, source)

        fallback
      rescue => e
        Rails.logger.warn("[AI][MemoryCandidateNormalizer] #{e.class}: #{e.message}")
        fallback = rule_fallback(source)
        return source if invalid_candidate?(fallback, source)

        fallback
      end

      private

      def normalize_with_llm(source:, user:, llm_client:)
        MAX_LLM_ATTEMPTS.times do |attempt|
          raw = llm_client.generate_text!(
            system_text: system_text,
            user_text: user_text(source),
            max_output_tokens: 120,
            temperature: 0.05,
            user: user,
            feature: "chat"
          )

          candidate = parse_candidate(raw)
          return candidate if candidate.present? && !invalid_candidate?(candidate, source)

          Rails.logger.info("[AI][MemoryCandidateNormalizer] invalid_candidate attempt=#{attempt + 1}")
        rescue => e
          Rails.logger.warn("[AI][MemoryCandidateNormalizer] llm_attempt_failed attempt=#{attempt + 1} #{e.class}: #{e.message}")
        end

        nil
      end

      def system_text
        <<~SYS
          あなたは保存メモ正規化アシスタントです。
          ユーザー文を「意味を変えずに短く」1文へ整形してください。

          絶対ルール:
          - 出力はJSONのみ（説明文・Markdown・コードフェンス禁止）
          - 形式は {"normalized_text":"..."} のみ
          - 事実の追加・推測の追加・主語の置換をしない
          - 口語・前置き（〜なんだよね、〜かな、など）を削る
          - 1文で簡潔にする
          - 80文字以内

          例:
          入力: 今の課題はミドルが安定しないことなんだよね。
          出力: {"normalized_text":"ミドルの安定性が課題"}
        SYS
      end

      def user_text(source)
        <<~TXT
          次の文を正規化してください。
          入力: #{source}
        TXT
      end

      def parse_candidate(raw)
        text = sanitize_llm_output(raw)
        return nil if text.blank?

        json_candidate = parse_json_candidate(text)
        candidate = compact_text(json_candidate.presence || parse_plain_text_candidate(text))
        candidate.presence
      end

      def sanitize_llm_output(raw)
        text = raw.to_s.strip
        text.gsub(/\A```(?:json|text)?\s*/i, "").gsub(/\s*```\z/, "").strip
      end

      def parse_json_candidate(text)
        parsed = parse_json_hash(text)
        return nil unless parsed.is_a?(Hash)

        compact_text(parsed["normalized_text"]).presence
      end

      def parse_json_hash(text)
        json_part = text[/\{.*\}/m] || text
        JSON.parse(json_part)
      rescue JSON::ParserError
        nil
      end

      def parse_plain_text_candidate(text)
        line = text.lines.map(&:strip).find(&:present?).to_s
        line = line.sub(/\A(?:normalized_text|要約|出力)\s*[:：]\s*/i, "")
        line = line.gsub(/\A["'`]+|["'`]+\z/, "")
        line = line.sub(/\A\{/, "").sub(/\}\z/, "")
        line
      end

      def compact_text(value)
        value.to_s.gsub(/\s+/, " ").strip
      end

      def rule_fallback(source)
        text = compact_text(source)
        return text if text.blank?

        stripped = text.dup
        stripped.gsub!(/\A(?:いま|今|現在)(?:の)?課題(?:は|って)?\s*/, "")
        stripped.gsub!(/\A(?:私|わたし)の課題(?:は|って)?\s*/, "")
        stripped.gsub!(/\A課題(?:は|って)?\s*/, "")
        stripped.gsub!(/\A[:：\-ー、\s]+/, "")
        stripped.gsub!(/(?:なんだよね|なんですよね|なんだよな|なんだ|だよね|ですよね|かな|かも)(?:[。.!！?？]*)\z/, "")
        stripped.gsub!(/[。.!！?？]+\z/, "")
        stripped = compact_text(stripped)
        stripped = compact_text(source) if stripped.blank?

        stripped.slice(0, MAX_OUTPUT_CHARS)
      end

      def invalid_candidate?(candidate, source)
        return true if candidate.blank?
        return true if candidate.length > MAX_OUTPUT_CHARS
        return true if candidate.include?("\n")
        return true if sentence_count(candidate) != 1
        return true unless semantically_related?(source, candidate)

        false
      end

      def sentence_count(text)
        normalized = text.to_s.gsub(/\s+/, " ").strip
        chunks = normalized.split(/[。.!！?？]+/).map(&:strip).reject(&:blank?)
        chunks = [ normalized ] if chunks.empty? && normalized.present?
        chunks.length
      end

      def semantically_related?(source, candidate)
        source_norm = similarity_normalize(source)
        candidate_norm = similarity_normalize(candidate)
        return false if source_norm.blank? || candidate_norm.blank?
        return true if source_norm == candidate_norm
        return true if source_norm.include?(candidate_norm) || candidate_norm.include?(source_norm)
        return true if (bigrams(source_norm) & bigrams(candidate_norm)).length >= 2

        similarity_score(source_norm, candidate_norm) >= MIN_SIMILARITY_SCORE
      end

      def similarity_normalize(value)
        value.to_s
             .unicode_normalize(:nfkc)
             .downcase
             .gsub(/[[:space:]]+/, "")
             .gsub(/[。．.!！?？、,，・「」『』（）()\[\]【】]/, "")
      end

      def similarity_score(a, b)
        grams_a = bigrams(a)
        grams_b = bigrams(b)
        return 0.0 if grams_a.empty? || grams_b.empty?

        intersection = (grams_a & grams_b).length.to_f
        union = (grams_a | grams_b).length.to_f
        return 0.0 if union <= 0.0

        intersection / union
      end

      def bigrams(text)
        str = text.to_s
        return [ str ] if str.length == 1
        return [] if str.length <= 0

        (0...(str.length - 1)).map { |idx| str[idx, 2] }.uniq
      end
    end
  end
end
