# frozen_string_literal: true

module Ai
  class CollectiveEffectCache
    CACHE_VERSION = "v1"
    EXPIRES_IN = 6.hours

    class << self
      def fetch(window_days:, min_count:, target_tags: nil)
        normalized_target_tags = normalize_tags(target_tags)
        key = cache_key(window_days: window_days, min_count: min_count, target_tags: normalized_target_tags)
        cached = read_cache(key)
        return cached unless cached.nil?

        value = build_summary(window_days: window_days, min_count: min_count, target_tags: normalized_target_tags)
        write_cache(key, value)
        value
      rescue => e
        Rails.logger.warn("[AI][CollectiveEffectCache] cache_error key=#{key} error=#{e.class}: #{e.message} fallback=build")
        build_summary(window_days: window_days, min_count: min_count, target_tags: normalized_target_tags)
      end

      private

      def cache_key(window_days:, min_count:, target_tags:)
        tag_part = target_tags.any? ? target_tags.join(",") : "all"
        "collective_effects:#{CACHE_VERSION}:window=#{window_days}:min=#{min_count}:tags=#{tag_part}"
      end

      def read_cache(key)
        cached = Rails.cache.read(key)
        if cached.nil?
          Rails.logger.debug("[AI][CollectiveEffectCache] cache_miss key=#{key}")
        else
          Rails.logger.debug("[AI][CollectiveEffectCache] cache_hit key=#{key}")
        end
        cached
      end

      def write_cache(key, value)
        Rails.cache.write(key, value, expires_in: EXPIRES_IN)
      rescue => e
        Rails.logger.warn("[AI][CollectiveEffectCache] cache_write_error key=#{key} error=#{e.class}: #{e.message}")
      end

      def build_summary(window_days:, min_count:, target_tags:)
        Ai::CollectiveEffectSummary.new(window_days: window_days, min_count: min_count, target_tags: target_tags).build
      end

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
