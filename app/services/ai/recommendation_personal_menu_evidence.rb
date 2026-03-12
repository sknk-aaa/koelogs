# frozen_string_literal: true

module Ai
  class RecommendationPersonalMenuEvidence
    POSITIVE_HINT_REGEX = /(効|改善|安定|楽|出しやす|つなが|伸び|上が|良く)/

    class << self
      def extract(logs:, explicit_theme:, goal_text:)
        theme_text = [ explicit_theme, goal_text ].map { |v| normalize_text(v) }.join(" ")
        return [] if theme_text.blank?

        aggregate = Hash.new { |h, k| h[k] = { count: 0, snippets: [] } }

        Array(logs).each do |log|
          note = normalize_text(log.respond_to?(:notes) ? log.notes.to_s : "")
          next if note.blank?
          next unless note.match?(POSITIVE_HINT_REGEX)
          next unless theme_related?(theme_text, note)

          menus = if log.respond_to?(:training_menus)
                    Array(log.training_menus)
          else
                    []
          end

          menus.each do |menu|
            name = menu.respond_to?(:name) ? menu.name.to_s : ""
            next if name.blank?

            canonical_key = classify_canonical_key(name)
            next if canonical_key.blank? || canonical_key.start_with?("unknown")

            aggregate[canonical_key][:count] += 1
            aggregate[canonical_key][:snippets] << note.slice(0, 80)
          end
        end

        aggregate.map do |canonical_key, data|
          {
            canonical_key: canonical_key,
            menu_label: MenuCanonicalization::RuleEngine.label_for_key(canonical_key),
            count: data[:count],
            snippets: data[:snippets].uniq.first(2)
          }
        end.sort_by { |row| -row[:count] }
      rescue => e
        Rails.logger.warn("[AI][RecommendationPersonalMenuEvidence] #{e.class}: #{e.message}")
        []
      end

      private

      def normalize_text(text)
        text.to_s.gsub(/\s+/, " ").strip
      end

      def theme_related?(theme_text, note)
        tokens = theme_text.scan(/[ぁ-んァ-ヶー一-龠A-Za-z0-9]{2,}/).uniq
        return false if tokens.empty?

        tokens.any? { |token| note.include?(token) }
      end

      def classify_canonical_key(name)
        result = MenuCanonicalization::RuleEngine.classify(name: name.to_s)
        result&.canonical_key.to_s
      rescue
        ""
      end
    end
  end
end
