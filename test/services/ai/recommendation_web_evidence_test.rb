# frozen_string_literal: true

require "test_helper"

module Ai
  class RecommendationWebEvidenceTest < ActiveSupport::TestCase
    class FakeClient
      attr_reader :last_web_search
      attr_reader :last_user_text

      def generate_text_with_usage!(system_text:, user_text:, max_output_tokens:, temperature:, user:, feature:, web_search:)
        @last_web_search = web_search
        @last_user_text = user_text
        {
          text: {
            insights: [ "SOVTで喉周辺の脱力を作りやすい", "短時間反復が安定化に有効" ],
            menu_hints: [
              { name: "リップロール", reason: "息と声帯のバランスを整える" },
              { name: "ハミング", reason: "共鳴を前に保ちやすい" },
              { name: "5トーン", reason: "換声点接続の確認に使える" }
            ]
          }.to_json,
          input_tokens: 100,
          output_tokens: 150,
          total_tokens: 250,
          sources: [
            { title: "A", url: "https://example.com/a" },
            { title: "B", url: "https://example.com/b" },
            { title: "C", url: "https://example.com/c" },
            { title: "D", url: "https://example.com/d" }
          ]
        }
      end
    end

    test "always requests web search and keeps light intensity limits" do
      user = User.create!(email: "web-evidence-light@example.com", password: "password123", password_confirmation: "password123")
      client = FakeClient.new

      evidence = RecommendationWebEvidence.fetch(
        user: user,
        goal_text: "ミドルを安定させたい",
        explicit_theme: "喉の力み軽減",
        goal_tag_labels: [ "喉の力み軽減" ],
        recent_logs: [],
        intensity: :light,
        client: client
      )

      assert_equal true, client.last_web_search
      assert_includes client.last_user_text, "検索クエリ"
      assert_equal :light, evidence[:intensity]
      assert_equal 2, evidence[:sources].size
      assert_equal 2, evidence[:menu_hints].size
      assert_equal true, evidence[:used]
    end

    test "high intensity allows more sources and menu hints" do
      user = User.create!(email: "web-evidence-high@example.com", password: "password123", password_confirmation: "password123")
      client = FakeClient.new

      evidence = RecommendationWebEvidence.fetch(
        user: user,
        goal_text: "高音の出しやすさ",
        explicit_theme: "",
        goal_tag_labels: [ "高音の出しやすさ" ],
        recent_logs: [],
        intensity: :high,
        client: client
      )

      assert_equal :high, evidence[:intensity]
      assert_equal 3, evidence[:sources].size
      assert_equal 3, evidence[:menu_hints].size
    end
  end
end
