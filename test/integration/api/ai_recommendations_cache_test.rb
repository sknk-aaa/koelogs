# frozen_string_literal: true

require "test_helper"

module Api
  class AiRecommendationsCacheTest < ActionDispatch::IntegrationTest
    test "collective effect summary build is cached across create calls" do
      cache_store = ActiveSupport::Cache::MemoryStore.new
      build_calls = 0

      summary = {
        window_days: 90,
        min_count: 3,
        rows: []
      }
      summary_builder = Object.new
      summary_builder.define_singleton_method(:build) do
        build_calls += 1
        summary
      end

      generator = Object.new
      generator.define_singleton_method(:generate!) do |logs:, collective_effects:, monthly_logs:, measurement_evidence:, selected_range_days:, detail_window_days:, explicit_theme:, community_enabled:, community_tag_keys:|
        raise "unexpected selected_range_days=#{selected_range_days}" unless [ 14, 30, 90 ].include?(selected_range_days)
        raise "unexpected detail_window_days=#{detail_window_days}" unless detail_window_days == 14
        raise "unexpected monthly_logs for 14day mode" unless monthly_logs.size == 0
        raise "unexpected measurement_evidence" unless measurement_evidence.is_a?(Hash)
        raise "expected explicit_theme present" if explicit_theme.blank?
        raise "expected community_enabled true when theme matches keyword" unless community_enabled == true
        raise "expected non-empty community_tag_keys" if Array(community_tag_keys).empty?

        "test recommendation"
      end
      generator.define_singleton_method(:model_name) { "gemini-2.5-flash" }
      generator.define_singleton_method(:prompt_version) { "recommendation-v1" }

      tracker = Object.new
      tracker.define_singleton_method(:record!) { }

      rewards = {
        xp_earned: 0,
        unlocked_badges: [],
        total_xp: 0,
        level: 1,
        streak_current_days: 0,
        streak_longest_days: 0
      }

      original_cache = Rails.cache
      summary_original_new = Ai::CollectiveEffectSummary.method(:new)
      generator_original_new = Ai::RecommendationGenerator.method(:new)
      tracker_original_new = Ai::ContributionTracker.method(:new)
      awarder_original_call = Gamification::Awarder.method(:call)

      Ai::CollectiveEffectSummary.singleton_class.send(:define_method, :new) do |window_days:, min_count:, target_tags: nil|
        raise "unexpected window_days=#{window_days}" unless window_days == 90
        raise "unexpected min_count=#{min_count}" unless min_count == 3

        summary_builder
      end
      Ai::RecommendationGenerator.singleton_class.send(:define_method, :new) do |_args = nil, **_kwargs|
        generator
      end
      Ai::ContributionTracker.singleton_class.send(:define_method, :new) do |_args = nil, **_kwargs|
        tracker
      end
      Gamification::Awarder.singleton_class.send(:define_method, :call) do |_args = nil, **_kwargs|
        rewards
      end

      Rails.cache = cache_store
      begin
        post "/api/auth/signup", params: {
          email: "cache-test@example.com",
          password: "password123",
          password_confirmation: "password123"
        }
        assert_response :created

        post "/api/ai_recommendations", params: { date: "2026-02-27", range_days: 7, today_theme: "音程を安定させる" }
        assert_response :created

        post "/api/ai_recommendations", params: { date: "2026-02-28", range_days: 7, today_theme: "音程を安定させる" }
        assert_response :created

        assert_equal 1, build_calls
      ensure
        Rails.cache = original_cache
        Ai::CollectiveEffectSummary.singleton_class.send(:define_method, :new, summary_original_new)
        Ai::RecommendationGenerator.singleton_class.send(:define_method, :new, generator_original_new)
        Ai::ContributionTracker.singleton_class.send(:define_method, :new, tracker_original_new)
        Gamification::Awarder.singleton_class.send(:define_method, :call, awarder_original_call)
      end
    end
  end
end
