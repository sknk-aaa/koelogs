# frozen_string_literal: true

require "test_helper"

module Ai
  class RecommendationCommunityMatcherTest < ActiveSupport::TestCase
    class CapturingClient
      attr_reader :last_user_text

      def generate_text_with_usage!(system_text:, user_text:, max_output_tokens:, temperature:, user:, feature:, web_search:)
        @last_user_text = user_text
        { text: '{"matched":[]}', sources: [] }
      end
    end

    test "passes all candidates when size is at most 20 and truncates to 20 when over" do
      user = User.create!(
        email: "matcher-limit@example.com",
        password: "password123",
        password_confirmation: "password123"
      )
      client = CapturingClient.new

      small_candidates = build_candidates(10)
      RecommendationCommunityMatcher.match(
        user: user,
        explicit_theme: "F#4付近の換声点を滑らかにする",
        goal_text: "喉を閉めずにミドルを出す",
        diagnosis_context: "発生帯域: F#4付近",
        candidates: small_candidates,
        client: client
      )
      assert_equal 10, client.last_user_text.scan(/^- id=/).size

      large_candidates = build_candidates(25)
      RecommendationCommunityMatcher.match(
        user: user,
        explicit_theme: "F#4付近の換声点を滑らかにする",
        goal_text: "喉を閉めずにミドルを出す",
        diagnosis_context: "発生帯域: F#4付近",
        candidates: large_candidates,
        client: client
      )
      assert_equal 20, client.last_user_text.scan(/^- id=/).size
    end

    private

    def build_candidates(size)
      (1..size).map do |i|
        {
          id: i,
          menu_label: "menu#{i}",
          improvement_tags: [ "passaggio_smoothness" ],
          comment: "F#4付近で詰まりを減らす練習#{i}"
        }
      end
    end
  end
end
