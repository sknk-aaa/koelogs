# frozen_string_literal: true

module Ai
  class RecommendationCommunityCoverage
    class << self
      def count_matching_posts(goal_tag_keys:)
        keys = normalize_tags(goal_tag_keys)
        return 0 if keys.empty?

        CommunityPost
          .where(published: true)
          .where(
            "EXISTS (SELECT 1 FROM jsonb_array_elements_text(community_posts.improvement_tags) AS tag(value) WHERE tag.value IN (?))",
            keys
          )
          .count
      rescue => e
        Rails.logger.warn("[AI][RecommendationCommunityCoverage] #{e.class}: #{e.message}")
        0
      end

      # return:
      # [
      #   {
      #     canonical_key: "lip_roll|unspecified",
      #     menu_label: "リップロール",
      #     count: 5,
      #     by_tag: { "less_throat_tension" => 3, ... }
      #   }
      # ]
      def menu_counts_for_tags(goal_tag_keys:, limit: 8)
        keys = normalize_tags(goal_tag_keys)
        return [] if keys.empty?

        aggregate = Hash.new { |h, k| h[k] = { count: 0, by_tag: Hash.new(0) } }
        scope = CommunityPost.where(published: true).where.not(canonical_key: [ nil, "" ])
        scope.find_each do |post|
          canonical_key = post.canonical_key.to_s
          next if canonical_key.blank? || canonical_key.start_with?("unknown")

          matched_tags = normalize_tags(post.improvement_tags) & keys
          next if matched_tags.empty?

          aggregate[canonical_key][:count] += 1
          matched_tags.each { |tag| aggregate[canonical_key][:by_tag][tag] += 1 }
        end

        aggregate.map do |canonical_key, data|
          {
            canonical_key: canonical_key,
            menu_label: MenuCanonicalization::RuleEngine.label_for_key(canonical_key),
            count: data[:count].to_i,
            by_tag: data[:by_tag].to_h
          }
        end.sort_by { |row| -row[:count] }.first(limit)
      rescue => e
        Rails.logger.warn("[AI][RecommendationCommunityCoverage] menu_counts_error #{e.class}: #{e.message}")
        []
      end

      def menu_count_for(goal_tag_keys:, canonical_key:)
        key = canonical_key.to_s
        return 0 if key.blank?

        menu_counts_for_tags(goal_tag_keys: goal_tag_keys, limit: 200).find { |row| row[:canonical_key] == key }.to_h[:count].to_i
      end

      private

      def normalize_tags(raw)
        Array(raw)
          .map(&:to_s)
          .map(&:strip)
          .reject(&:blank?)
          .uniq
          .select { |tag| ImprovementTagCatalog::TAGS.include?(tag) }
      end
    end
  end
end
