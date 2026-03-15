# frozen_string_literal: true

module Ai
  class RecommendationThemeKeywordMatcher
    KEYWORD_TAGS = {
      "地声" => %w[chest_voice_strength],
      "裏声" => %w[falsetto_strength],
      "ミドル" => %w[mixed_voice_stability],
      "ミックス" => %w[mixed_voice_stability],
      "換声点" => %w[mixed_voice_stability],
      "声帯閉鎖" => %w[vocal_cord_closure],
      "声の芯" => %w[vocal_cord_closure],
      "高音の出しやすさ" => %w[mixed_voice_stability],
      "高音" => %w[mixed_voice_stability],
      "音域" => %w[range_breadth],
      "音程" => %w[pitch_accuracy],
      "音量" => %w[volume_stability],
      "ロングトーン" => %w[long_tone_sustain],
      "力み" => %w[less_throat_tension],
      "喉" => %w[less_throat_tension less_throat_fatigue],
      "疲れ" => %w[less_throat_fatigue],
      "ブレス" => %w[breath_control],
      "息切れ" => %w[breath_sustain],
      "息の持続" => %w[breath_sustain],
      "息" => %w[breath_sustain]
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
