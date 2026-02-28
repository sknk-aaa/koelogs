# frozen_string_literal: true

require "test_helper"
require "ostruct"

module Ai
  class RecommendationFollowupResponderWebSearchTest < ActiveSupport::TestCase
    class FakeClient
      attr_reader :last_web_search
      attr_reader :last_user_text

      def generate_text_with_usage!(system_text:, user_text:, max_output_tokens:, temperature:, user:, feature:, web_search:)
        @last_web_search = web_search
        @last_user_text = user_text
        {
          text: "🧭 まずはここ\n・Nayを短時間で行う",
          input_tokens: 10,
          output_tokens: 20,
          total_tokens: 30,
          sources: web_search ? [ { title: "Voice method", url: "https://example.com/voice" } ] : []
        }
      end
    end

    test "passes web_search true for followup on unknown method term" do
      user = User.create!(email: "followup-search@example.com", password: "password123", password_confirmation: "password123")
      recommendation = user.ai_recommendations.create!(
        generated_for_date: Date.current,
        recommendation_text: "3) おすすめメニュー\nNay | 20分\n狙い: ミドルの安定",
        range_days: 14
      )
      messages = [ OpenStruct.new(role: "user", content: "Nayのやり方と根拠を教えて") ]
      client = FakeClient.new

      text = RecommendationFollowupResponder.new(
        recommendation: recommendation,
        context_snapshot: {},
        messages: messages,
        client: client
      ).call

      assert_equal true, client.last_web_search
      assert_includes client.last_user_text, "最優先質問:"
      assert_includes client.last_user_text, "Nayのやり方と根拠を教えて"
      assert_includes text, "参考情報:"
      assert_includes text, "https://example.com/voice"
    end
  end
end
