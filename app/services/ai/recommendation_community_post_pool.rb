# frozen_string_literal: true

module Ai
  class RecommendationCommunityPostPool
    class << self
      def fetch(goal_tag_keys:, window_days: 90, limit: 120)
        keys = normalize_tags(goal_tag_keys)
        return [] if keys.empty?

        from = window_days.days.ago
        scope = CommunityPost.where(published: true)
                             .where("community_posts.created_at >= ?", from)
                             .where.not(canonical_key: [ nil, "" ])
                             .where(
                               "EXISTS (SELECT 1 FROM jsonb_array_elements_text(community_posts.improvement_tags) AS tag(value) WHERE tag.value IN (?))",
                               keys
                             )
                             .order(created_at: :desc)
                             .limit(limit)

        scope.map do |post|
          canonical_key = post.canonical_key.to_s
          next if canonical_key.blank? || canonical_key.start_with?("unknown")

          {
            id: post.id,
            canonical_key: canonical_key,
            menu_label: MenuCanonicalization::RuleEngine.label_for_key(canonical_key),
            comment: normalize_text(post.comment),
            improvement_tags: normalize_tags(post.improvement_tags),
            used_scale_type: post.used_scale_type.to_s,
            practiced_on: post.practiced_on&.iso8601,
            created_at: post.created_at&.iso8601
          }
        end.compact
      rescue => e
        Rails.logger.warn("[AI][RecommendationCommunityPostPool] #{e.class}: #{e.message}")
        []
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

      def normalize_text(text)
        v = text.to_s.gsub(/\s+/, " ").strip
        v.presence
      end
    end
  end
end
