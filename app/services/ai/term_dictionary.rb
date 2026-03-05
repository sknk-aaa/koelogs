# frozen_string_literal: true

require "yaml"

module Ai
  class TermDictionary
    FILE_PATH = Rails.root.join("config/ai_terms.yml")

    class << self
      def lookup(text)
        query = text.to_s
        return nil if query.blank?

        entries.find do |entry|
          aliases = Array(entry[:aliases]).map { |v| normalize(v) }.reject(&:blank?)
          aliases.any? { |alias_text| normalize(query).include?(alias_text) }
        end
      end

      def entries
        @entries ||= load_entries
      end

      def reset_cache!
        @entries = nil
      end

      private

      def load_entries
        return [] unless File.exist?(FILE_PATH)

        raw = YAML.safe_load(File.read(FILE_PATH), aliases: true) || {}
        return [] unless raw.is_a?(Hash)

        raw.map do |key, row|
          next nil unless row.is_a?(Hash)

          {
            key: key.to_s,
            aliases: Array(row["aliases"]).map(&:to_s),
            definition: row["definition"].to_s,
            how_to: Array(row["how_to"]).map(&:to_s),
            effects: Array(row["effects"]).map(&:to_s),
            cautions: Array(row["cautions"]).map(&:to_s),
            source_type: row["source_type"].to_s.presence || "internal"
          }
        end.compact
      rescue => e
        Rails.logger.warn("[AI][TermDictionary] load_error #{e.class}: #{e.message}")
        []
      end

      def normalize(text)
        text.to_s.downcase.gsub(/\s+/, "")
      end
    end
  end
end
