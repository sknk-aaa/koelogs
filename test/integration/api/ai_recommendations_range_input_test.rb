# frozen_string_literal: true

require "test_helper"

module Api
  class AiRecommendationsRangeInputTest < ActionDispatch::IntegrationTest
    test "uses 14-day detailed logs and monthly trends for 30/90 day modes" do
      target_date = Date.current
      captures = []

      generator = Object.new
      generator.define_singleton_method(:generate!) do |logs:, collective_effects:, monthly_logs:, measurement_evidence:, selected_range_days:, detail_window_days:|
        captures << {
          selected_range_days: selected_range_days,
          detail_window_days: detail_window_days,
          detailed_log_count: logs.size,
          monthly_log_count: monthly_logs.size,
          collective_rows_count: Array(collective_effects[:rows]).size,
          measurement_used: measurement_evidence.is_a?(Hash) && Array(measurement_evidence[:items]).any?
        }
        "test recommendation"
      end

      tracker = Object.new
      tracker.define_singleton_method(:record!) {}

      rewards = {
        xp_earned: 0,
        unlocked_badges: [],
        total_xp: 0,
        level: 1,
        streak_current_days: 0,
        streak_longest_days: 0
      }

      post "/api/auth/signup", params: {
        email: "range-input-test@example.com",
        password: "password123",
        password_confirmation: "password123"
      }
      assert_response :created
      user = User.find_by!(email: "range-input-test@example.com")

      menu = user.training_menus.create!(name: "リップロール")
      20.times do |i|
        day = target_date - i
        log = user.training_logs.create!(practiced_on: day, duration_min: 15 + i, notes: "note-#{i}")
        TrainingLogMenu.create!(user: user, training_log: log, training_menu: menu)
      end

      [ 0, 1, 2 ].each do |months_ago|
        month_start = (target_date.beginning_of_month << months_ago)
        user.monthly_logs.create!(month_start: month_start, notes: "monthly-note-#{months_ago}")
      end

      generator_original_new = Ai::RecommendationGenerator.method(:new)
      tracker_original_new = Ai::ContributionTracker.method(:new)
      awarder_original_call = Gamification::Awarder.method(:call)
      collective_cache_original_fetch = Ai::CollectiveEffectCache.method(:fetch)

      Ai::RecommendationGenerator.singleton_class.send(:define_method, :new) do |_args = nil, **_kwargs|
        generator
      end
      Ai::ContributionTracker.singleton_class.send(:define_method, :new) do |_args = nil, **_kwargs|
        tracker
      end
      Gamification::Awarder.singleton_class.send(:define_method, :call) do |_args = nil, **_kwargs|
        rewards
      end
      Ai::CollectiveEffectCache.singleton_class.send(:define_method, :fetch) do |window_days:, min_count:|
        raise "unexpected collective window_days=#{window_days}" unless window_days == 90
        raise "unexpected collective min_count=#{min_count}" unless min_count == 3

        { window_days: 90, min_count: 3, rows: [] }
      end

      begin
        post "/api/ai_recommendations", params: { date: target_date.iso8601, range_days: 30 }
        assert_response :created

        post "/api/ai_recommendations", params: { date: (target_date - 1).iso8601, range_days: 90 }
        assert_response :created

        assert_equal 2, captures.size
        assert_equal [ 30, 90 ], captures.map { |entry| entry[:selected_range_days] }
        assert_equal [ 14, 14 ], captures.map { |entry| entry[:detail_window_days] }
        assert_equal [ 14, 14 ], captures.map { |entry| entry[:detailed_log_count] }
        assert_equal [ 1, 3 ], captures.map { |entry| entry[:monthly_log_count] }
        assert_equal [ false, false ], captures.map { |entry| entry[:measurement_used] }
      ensure
        Ai::RecommendationGenerator.singleton_class.send(:define_method, :new, generator_original_new)
        Ai::ContributionTracker.singleton_class.send(:define_method, :new, tracker_original_new)
        Gamification::Awarder.singleton_class.send(:define_method, :call, awarder_original_call)
        Ai::CollectiveEffectCache.singleton_class.send(:define_method, :fetch, collective_cache_original_fetch)
      end
    end
  end
end
