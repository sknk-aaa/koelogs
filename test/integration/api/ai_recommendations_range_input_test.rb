# frozen_string_literal: true

require "test_helper"

module Api
  class AiRecommendationsRangeInputTest < ActionDispatch::IntegrationTest
    test "uses 14-day detailed logs and skips monthly logs for 30/90 day modes" do
      target_date = Date.current
      captures = []

      generator = Object.new
      generator.define_singleton_method(:generate!) do |logs:, collective_effects:, monthly_logs:, measurement_evidence:, selected_range_days:, detail_window_days:, explicit_theme:, community_enabled:, community_tag_keys:|
        captures << {
          selected_range_days: selected_range_days,
          detail_window_days: detail_window_days,
          detailed_log_count: logs.size,
          monthly_log_count: monthly_logs.size,
          collective_rows_count: Array(collective_effects[:rows]).size,
          measurement_used: measurement_evidence.is_a?(Hash) && Array(measurement_evidence[:items]).any?,
          explicit_theme: explicit_theme,
          community_enabled: community_enabled,
          community_tag_keys: community_tag_keys
        }
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
      Ai::CollectiveEffectCache.singleton_class.send(:define_method, :fetch) do |window_days:, min_count:, target_tags: nil|
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
        assert_equal [ 0, 0 ], captures.map { |entry| entry[:monthly_log_count] }
        assert_equal [ false, false ], captures.map { |entry| entry[:measurement_used] }
        assert_equal [ nil, nil ], captures.map { |entry| entry[:explicit_theme] }
        assert_equal [ false, false ], captures.map { |entry| entry[:community_enabled] }
      ensure
        Ai::RecommendationGenerator.singleton_class.send(:define_method, :new, generator_original_new)
        Ai::ContributionTracker.singleton_class.send(:define_method, :new, tracker_original_new)
        Gamification::Awarder.singleton_class.send(:define_method, :call, awarder_original_call)
        Ai::CollectiveEffectCache.singleton_class.send(:define_method, :fetch, collective_cache_original_fetch)
      end
    end

    test "passes explicit theme and stores it in generation_context when today_theme is provided" do
      target_date = Date.current
      explicit_theme_capture = nil
      community_enabled_capture = nil
      community_tag_keys_capture = []
      input_theme = "ミドルボイス（D4~G4あたり）の地声感を強くする。"

      generator = Object.new
      generator.define_singleton_method(:generate!) do |logs:, collective_effects:, monthly_logs:, measurement_evidence:, selected_range_days:, detail_window_days:, explicit_theme:, community_enabled:, community_tag_keys:|
        explicit_theme_capture = explicit_theme
        community_enabled_capture = community_enabled
        community_tag_keys_capture = community_tag_keys
        "1) 今週の方針\n#{explicit_theme}\n2) 今の状態\n・テスト\n3) 今週のおすすめメニュー\nリップロール｜10分\n狙い: テスト"
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

      post "/api/auth/signup", params: {
        email: "explicit-theme-test@example.com",
        password: "password123",
        password_confirmation: "password123"
      }
      assert_response :created
      user = User.find_by!(email: "explicit-theme-test@example.com")

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
      Ai::CollectiveEffectCache.singleton_class.send(:define_method, :fetch) do |window_days:, min_count:, target_tags: nil|
        raise "unexpected collective window_days=#{window_days}" unless window_days == 90
        raise "unexpected collective min_count=#{min_count}" unless min_count == 3

        { window_days: 90, min_count: 3, rows: [] }
      end

      begin
        post "/api/ai_recommendations", params: { date: target_date.iso8601, range_days: 14, today_theme: input_theme }
        assert_response :created

        assert_equal input_theme, explicit_theme_capture
        rec = user.ai_recommendations.order(created_at: :desc).first
        assert_equal input_theme, rec.generation_context["explicit_theme"]
        assert_equal false, community_enabled_capture
        assert_equal [], Array(community_tag_keys_capture)
      ensure
        Ai::RecommendationGenerator.singleton_class.send(:define_method, :new, generator_original_new)
        Ai::ContributionTracker.singleton_class.send(:define_method, :new, tracker_original_new)
        Gamification::Awarder.singleton_class.send(:define_method, :call, awarder_original_call)
        Ai::CollectiveEffectCache.singleton_class.send(:define_method, :fetch, collective_cache_original_fetch)
      end
    end

    test "returns existing recommendation when duplicate is created during generation" do
      target_date = Date.current
      existing_text = "先に保存されたおすすめ"

      post "/api/auth/signup", params: {
        email: "reco-race-test@example.com",
        password: "password123",
        password_confirmation: "password123"
      }
      assert_response :created
      user = User.find_by!(email: "reco-race-test@example.com")

      created_once = false
      generator = Object.new
      generator.define_singleton_method(:generate!) do |**_kwargs|
        unless created_once
          created_once = true
          user.ai_recommendations.create!(
            generated_for_date: target_date,
            week_start_date: target_date.beginning_of_week(:monday),
            range_days: 14,
            recommendation_text: existing_text,
            collective_summary: { used: false, items: [] },
            generation_context: {},
            generator_model_name: "gemini-2.5-flash",
            generator_prompt_version: "recommendation-v1"
          )
        end
        "後から生成されたテキスト"
      end
      generator.define_singleton_method(:model_name) { "gemini-2.5-flash" }
      generator.define_singleton_method(:prompt_version) { "recommendation-v1" }

      generator_original_new = Ai::RecommendationGenerator.method(:new)
      collective_cache_original_fetch = Ai::CollectiveEffectCache.method(:fetch)
      begin
        Ai::RecommendationGenerator.singleton_class.send(:define_method, :new) do |_args = nil, **_kwargs|
          generator
        end
        Ai::CollectiveEffectCache.singleton_class.send(:define_method, :fetch) do |window_days:, min_count:, target_tags: nil|
          raise "unexpected collective window_days=#{window_days}" unless window_days == 90
          raise "unexpected collective min_count=#{min_count}" unless min_count == 3

          { window_days: 90, min_count: 3, rows: [] }
        end

        post "/api/ai_recommendations", params: { date: target_date.iso8601, range_days: 14 }
        assert_response :ok

        body = JSON.parse(@response.body)
        assert_equal existing_text, body.dig("data", "recommendation_text")
        assert_equal 1, user.ai_recommendations.where(generated_for_date: target_date, range_days: 14).count
      ensure
        Ai::RecommendationGenerator.singleton_class.send(:define_method, :new, generator_original_new)
        Ai::CollectiveEffectCache.singleton_class.send(:define_method, :fetch, collective_cache_original_fetch)
      end
    end

    test "enables community only when today_theme contains configured keyword" do
      target_date = Date.current
      input_theme = "音程を安定させる"
      community_enabled_capture = nil
      community_tag_keys_capture = []
      cache_target_tags_capture = nil

      generator = Object.new
      generator.define_singleton_method(:generate!) do |logs:, collective_effects:, monthly_logs:, measurement_evidence:, selected_range_days:, detail_window_days:, explicit_theme:, community_enabled:, community_tag_keys:|
        community_enabled_capture = community_enabled
        community_tag_keys_capture = community_tag_keys
        "1) 今週の方針\n#{explicit_theme}\n2) 今の状態\n・テスト\n3) 今週のおすすめメニュー\nハミング｜10分\n狙い: テスト\n根拠: コミュニティ"
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

      post "/api/auth/signup", params: {
        email: "theme-keyword-on@example.com",
        password: "password123",
        password_confirmation: "password123"
      }
      assert_response :created

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
      Ai::CollectiveEffectCache.singleton_class.send(:define_method, :fetch) do |window_days:, min_count:, target_tags: nil|
        cache_target_tags_capture = Array(target_tags)
        { window_days: 90, min_count: 3, rows: [] }
      end

      begin
        post "/api/ai_recommendations", params: { date: target_date.iso8601, range_days: 14, today_theme: input_theme }
        assert_response :created

        assert_equal true, community_enabled_capture
        assert_includes Array(community_tag_keys_capture), "pitch_accuracy"
        assert_includes Array(cache_target_tags_capture), "pitch_accuracy"
      ensure
        Ai::RecommendationGenerator.singleton_class.send(:define_method, :new, generator_original_new)
        Ai::ContributionTracker.singleton_class.send(:define_method, :new, tracker_original_new)
        Gamification::Awarder.singleton_class.send(:define_method, :call, awarder_original_call)
        Ai::CollectiveEffectCache.singleton_class.send(:define_method, :fetch, collective_cache_original_fetch)
      end
    end
  end
end
