# frozen_string_literal: true

module Ai
  class RecommendationThemeKeywordMatcher
    KEYWORD_TAGS = {
      "音域" => %w[range_breadth high_note_ease],
      "音程" => %w[pitch_accuracy],
      "換声点" => %w[passaggio_smoothness],
      "息切れ" => %w[less_breathlessness],
      "音量" => %w[volume_stability],
      "力み" => %w[less_throat_tension],
      "声の抜け" => %w[resonance_clarity],
      "ロングトーン" => %w[long_tone_sustain]
    }.freeze

    class << self
      def match(theme_text)
        text = normalize_text(theme_text)
        return { theme_present: false, matched_keywords: [], matched_tags: [], community_enabled: false } if text.blank?

        matched_keywords = KEYWORD_TAGS.keys.select { |keyword| text.include?(keyword) }
        matched_tags = matched_keywords.flat_map { |keyword| KEYWORD_TAGS[keyword] }.uniq
        {
          theme_present: true,
          matched_keywords: matched_keywords,
          matched_tags: matched_tags,
          community_enabled: matched_tags.any?
        }
      end

      private

      def normalize_text(value)
        value.to_s.gsub(/\s+/, " ").strip
      end
    end
  end
end
