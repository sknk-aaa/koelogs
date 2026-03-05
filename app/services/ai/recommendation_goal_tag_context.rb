# frozen_string_literal: true

module Ai
  class RecommendationGoalTagContext
    FACT_MATCH_ALIASES = {
      "high_note_ease" => [ "高音", "高い声" ],
      "range_breadth" => [ "音域", "レンジ" ],
      "pitch_accuracy" => [ "音程", "ピッチ" ],
      "passaggio_smoothness" => [ "換声点", "ミックス", "ミドル" ],
      "less_breathlessness" => [ "息切れ", "息が続か" ],
      "volume_stability" => [ "音量", "ボリューム" ],
      "less_throat_tension" => [ "喉が締ま", "喉が詰ま", "喉の力み", "力み" ],
      "resonance_clarity" => [ "響き", "抜け" ],
      "long_tone_sustain" => [ "ロングトーン", "持続" ]
    }.freeze

    class << self
      def build(user:, explicit_theme:)
        new(user: user, explicit_theme: explicit_theme).build
      end
    end

    def initialize(user:, explicit_theme:)
      @user = user
      @explicit_theme = explicit_theme.to_s
    end

    def build
      from_settings = normalize_tags(Array(user.ai_improvement_tags))
      from_goal = extract_tags(goal_text)
      from_theme = extract_tags(explicit_theme)
      keys = (from_settings + from_goal + from_theme).uniq

      {
        keys: keys,
        labels: keys.filter_map { |key| ImprovementTagCatalog::LABELS[key] }.uniq,
        sources: {
          ai_improvement_tags: from_settings,
          goal_text: from_goal,
          today_theme: from_theme
        },
        facts: {
          goal_text: goal_text.presence,
          today_theme: explicit_theme.presence
        }
      }
    end

    private

    attr_reader :user, :explicit_theme

    def goal_text
      user.goal_text.to_s.gsub(/\s+/, " ").strip
    end

    def normalize_tags(raw)
      Array(raw)
        .map(&:to_s)
        .map(&:strip)
        .reject(&:blank?)
        .uniq
        .select { |tag| ImprovementTagCatalog::TAGS.include?(tag) }
    end

    def extract_tags(text)
      normalized = text.to_s.gsub(/\s+/, " ").strip
      return [] if normalized.blank?

      ImprovementTagCatalog::TAGS.select do |tag|
        label = ImprovementTagCatalog::LABELS[tag].to_s
        aliases = FACT_MATCH_ALIASES[tag] || []
        normalized.include?(tag) ||
          (label.present? && normalized.include?(label)) ||
          aliases.any? { |phrase| normalized.include?(phrase) }
      end
    end
  end
end
