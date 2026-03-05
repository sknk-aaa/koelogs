# frozen_string_literal: true

module Ai
  class CollectiveEffectCache
    CACHE_VERSION = "v1"
    EXPIRES_IN = 6.hours

    class << self
      def fetch(window_days:, min_count:)
        key = cache_key(window_days: window_days, min_count: min_count)
        cached = read_cache(key)
        return cached unless cached.nil?

        value = build_summary(window_days: window_days, min_count: min_count)
        write_cache(key, value)
        value
      rescue => e
        Rails.logger.warn("[AI][CollectiveEffectCache] cache_error key=#{key} error=#{e.class}: #{e.message} fallback=build")
        build_summary(window_days: window_days, min_count: min_count)
      end

      private

      def cache_key(window_days:, min_count:)
        "collective_effects:#{CACHE_VERSION}:window=#{window_days}:min=#{min_count}"
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

      def build_summary(window_days:, min_count:)
        Ai::CollectiveEffectSummary.new(window_days: window_days, min_count: min_count).build
      end
    end
  end
end
