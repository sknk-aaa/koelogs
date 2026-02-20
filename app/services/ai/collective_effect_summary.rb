# frozen_string_literal: true

module Ai
  class CollectiveEffectSummary
    def initialize(window_days: 90, min_count: 3)
      @window_days = window_days
      @min_count = min_count
    end

    # return:
    # {
    #   window_days: 90,
    #   min_count: 3,
    #   rows: [ { tag_key:, tag_label:, top_menus: [ { canonical_key:, display_label:, count: } ] } ]
    # }
    def build
      from = @window_days.days.ago
      posts = CommunityPost.where(published: true).where("community_posts.created_at >= ?", from)
      counts = Hash.new { |h, k| h[k] = Hash.new(0) }
      contributors = Hash.new { |h, k| h[k] = {} }

      posts.find_each do |post|
        canonical_key = post.canonical_key.to_s.presence || "unknown|unspecified"
        next if canonical_key.start_with?("unknown")

        normalized_tags(post.improvement_tags).each do |tag|
          counts[tag][canonical_key] += 1
          contributors[[ tag, canonical_key ]][post.user_id] = true
        end
      end

      rows = counts.map do |tag, menu_count|
        sorted = menu_count
                 .select { |_canonical_key, count| count >= @min_count }
                 .sort_by { |(_canonical_key, count)| -count }
                 .first(3)
                 .map do |canonical_key, count|
          {
            canonical_key: canonical_key,
            display_label: MenuCanonicalization::RuleEngine.label_for_key(canonical_key),
            count: count,
            contributor_user_ids: contributors[[ tag, canonical_key ]].keys
          }
        end
        next if sorted.empty?

        {
          tag_key: tag,
          tag_label: TrainingLogFeedback::TAG_LABELS[tag] || tag,
          top_menus: sorted
        }
      end.compact

      {
        window_days: @window_days,
        min_count: @min_count,
        rows: rows.sort_by { |r| -r[:top_menus].sum { |m| m[:count] } }
      }
    end

    private

    def normalized_tags(raw_tags)
      Array(raw_tags)
        .map(&:to_s)
        .map(&:strip)
        .reject(&:blank?)
        .uniq
        .select { |tag| TrainingLogFeedback::IMPROVEMENT_TAGS.include?(tag) }
    end
  end
end
