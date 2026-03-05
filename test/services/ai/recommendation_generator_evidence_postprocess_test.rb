# frozen_string_literal: true

require "test_helper"

module Ai
  class RecommendationGeneratorEvidencePostprocessTest < ActiveSupport::TestCase
    class FakeClient
      def model_name
        "gemini-2.5-flash"
      end

      def generate_text!(user_text:, system_text:, max_output_tokens:, temperature:, user:, feature:)
        <<~TEXT
          1) 今週の方針
          ミドルの安定
          2) 今の状態
          ・テスト
          3) 今週のおすすめメニュー
          リップロール｜10分
          狙い: 喉の脱力
          根拠: コミュニティ（喉の力み軽減）
        TEXT
      end
    end

    test "adds site names when web evidence exists and menu evidence is community-only" do
      user = User.create!(
        email: "reco-postprocess@example.com",
        password: "password123",
        password_confirmation: "password123"
      )
      client = FakeClient.new
      generator = RecommendationGenerator.new(
        user: user,
        date: Date.current,
        range_days: 14,
        include_today: true,
        client: client
      )

      goal_tag_original = Ai::RecommendationGoalTagContext.method(:build)
      coverage_original = Ai::RecommendationCommunityCoverage.method(:menu_counts_for_tags)
      web_original = Ai::RecommendationWebEvidence.method(:fetch)

      begin
        Ai::RecommendationGoalTagContext.singleton_class.send(:define_method, :build) do |user:, explicit_theme:|
          { keys: [ "less_throat_tension" ], labels: [ "喉の力み軽減" ], sources: {} }
        end
        Ai::RecommendationCommunityCoverage.singleton_class.send(:define_method, :menu_counts_for_tags) do |goal_tag_keys:, limit:|
          [ { canonical_key: "lip_roll|unspecified", menu_label: "リップロール", count: 1, by_tag: { "less_throat_tension" => 1 } } ]
        end
        Ai::RecommendationWebEvidence.singleton_class.send(:define_method, :fetch) do |**_kwargs|
          {
            attempted: true,
            used: true,
            intensity: :high,
            insights: [ "SOVTが有効" ],
            menu_hints: [ { name: "リップロール", reason: "脱力" } ],
            sources: [
              { title: "Voice Science Hub", url: "https://example.com/a" },
              { title: "SOVT Guide", url: "https://example.com/b" }
            ]
          }
        end

        text = generator.generate!(
          logs: [],
          collective_effects: { window_days: 90, min_count: 3, rows: [] },
          monthly_logs: [],
          measurement_evidence: { used: false, items: [] },
          selected_range_days: 14,
          detail_window_days: 14,
          explicit_theme: nil
        )

        assert_includes text, "根拠: 両方"
        assert_includes text, "サイト: Voice Science Hub / SOVT Guide"
      ensure
        Ai::RecommendationGoalTagContext.singleton_class.send(:define_method, :build, goal_tag_original)
        Ai::RecommendationCommunityCoverage.singleton_class.send(:define_method, :menu_counts_for_tags, coverage_original)
        Ai::RecommendationWebEvidence.singleton_class.send(:define_method, :fetch, web_original)
      end
    end
  end
end
