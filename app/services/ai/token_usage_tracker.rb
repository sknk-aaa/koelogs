# frozen_string_literal: true

module Ai
  class TokenUsageTracker
    MONTHLY_LIMIT_TOKENS = 3_000_000

    class LimitExceededError < StandardError; end

    class << self
      def ensure_within_limit!(user:)
        used = monthly_total(user: user)
        return if used < MONTHLY_LIMIT_TOKENS

        raise LimitExceededError, "今月のAI利用上限（#{MONTHLY_LIMIT_TOKENS} tokens）に達しました"
      end

      def record!(user:, feature:, usage:, llm_model_name: nil, used_at: Time.current)
        usage_hash = normalize_usage(usage)
        now = used_at || Time.current
        AiTokenUsage.create!(
          user: user,
          feature: feature.to_s,
          input_tokens: usage_hash[:input_tokens],
          output_tokens: usage_hash[:output_tokens],
          total_tokens: usage_hash[:total_tokens],
          year_month: Date.new(now.year, now.month, 1),
          used_at: now,
          llm_model_name: llm_model_name
        )
      end

      def monthly_total(user:, at: Time.current)
        month = Date.new(at.year, at.month, 1)
        AiTokenUsage.where(user_id: user.id, year_month: month).sum(:total_tokens)
      end

      private

      def normalize_usage(usage)
        input = usage[:input_tokens].to_i
        output = usage[:output_tokens].to_i
        total = usage[:total_tokens].to_i
        if total <= 0
          total = input + output
        end
        {
          input_tokens: input.negative? ? 0 : input,
          output_tokens: output.negative? ? 0 : output,
          total_tokens: total.negative? ? 0 : total
        }
      end
    end
  end
end
