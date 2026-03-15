# frozen_string_literal: true

module Security
  class RateLimiter
    class << self
      attr_writer :cache_store

      def cache_store
        @cache_store ||= Rails.cache
      end

      def reset_cache_store!
        @cache_store = Rails.cache
      end

      def throttle!(key:, identifier:, limit:, window:)
        cache_key = build_cache_key(key:, identifier:)
        count = cache_store.read(cache_key).to_i
        return true if count >= limit

        cache_store.write(cache_key, count + 1, expires_in: window)
        false
      end

      private

      def build_cache_key(key:, identifier:)
        "security:rate_limit:#{key}:#{identifier}"
      end
    end
  end
end
