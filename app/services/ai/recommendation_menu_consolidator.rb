# frozen_string_literal: true

module Ai
  class RecommendationMenuConsolidator
    class << self
      def consolidate(ranked_matches)
        grouped = Hash.new { |h, k| h[k] = [] }

        Array(ranked_matches).each do |row|
          candidate = row[:candidate]
          next unless candidate.is_a?(Hash)

          canonical_key = candidate[:canonical_key].to_s
          next if canonical_key.blank?

          grouped[canonical_key] << row
        end

        grouped.map do |canonical_key, rows|
          first = rows.first
          candidate = first[:candidate]
          methods = rows.flat_map { |row| extract_method_variants(row.dig(:candidate, :comment).to_s) }
                        .uniq
                        .first(2)
          reasons = rows.map { |row| row[:reason].to_s }.reject(&:blank?).uniq.first(2)

          {
            canonical_key: canonical_key,
            menu_label: candidate[:menu_label].to_s,
            matched_count: rows.size,
            max_score: rows.map { |row| row[:score].to_f }.max.to_f,
            methods: methods,
            reasons: reasons,
            comment_samples: rows.map { |row| row.dig(:candidate, :comment).to_s.gsub(/\s+/, " ").strip }
                                 .reject(&:blank?)
                                 .uniq
                                 .first(2),
            source_post_ids: rows.map { |row| row[:id] }
          }
        end.sort_by { |row| [ -row[:max_score], -row[:matched_count] ] }
      end

      private

      def extract_method_variants(comment)
        text = comment.to_s.gsub(/\r\n?/, "\n").strip
        return [] if text.blank?

        methods = []
        text.lines.map(&:strip).reject(&:blank?).each do |line|
          if (m = line.match(/\A(?:意識した点|意識したポイント|やり方|方法|手順)\s*[:：]\s*(.+)\z/))
            methods << m[1].strip
            next
          end
          if (m = line.match(/\A(?:どこが良くなった|改善された点|効果|狙い|目的)\s*[:：]\s*(.+)\z/))
            methods << m[1].strip
            next
          end
          methods << line
        end

        methods.map { |v| v.gsub(/\s+/, " ").strip }
               .reject(&:blank?)
               .uniq
               .first(3)
      end
    end
  end
end
