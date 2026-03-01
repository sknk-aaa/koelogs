# frozen_string_literal: true

require "test_helper"

module Api
  class MonthlyLogsComparisonTest < ActionDispatch::IntegrationTest
    include ActiveSupport::Testing::TimeHelpers

    test "returns daily practice time comparison and average-based measurement changes" do
      travel_to Time.zone.local(2026, 3, 20, 12, 0, 0) do
        post "/api/auth/signup", params: {
          email: "monthly-comparison-daily@example.com",
          password: "password123",
          password_confirmation: "password123"
        }
        assert_response :created

        user = User.find_by!(email: "monthly-comparison-daily@example.com")

        # Current month (3月): 2日で合計60分 => 30.0分/日
        user.training_logs.create!(practiced_on: Date.new(2026, 3, 1), duration_min: 40)
        user.training_logs.create!(practiced_on: Date.new(2026, 3, 5), duration_min: 20)

        # Previous month (2月): 2日で合計20分 => 10.0分/日
        user.training_logs.create!(practiced_on: Date.new(2026, 2, 2), duration_min: 12)
        user.training_logs.create!(practiced_on: Date.new(2026, 2, 6), duration_min: 8)

        # 測定: 裏声最高音(平均) 先月F4(65) -> 今月G4(67) で +2半音
        run = user.measurement_runs.create!(measurement_type: "range", include_in_insights: true, recorded_at: Time.zone.local(2026, 3, 6, 8, 0, 0))
        run.create_range_result!(lowest_note: "C3", highest_note: "A4", chest_top_note: "E4", falsetto_top_note: "G4", range_semitones: 21, range_octaves: 1.75)
        run = user.measurement_runs.create!(measurement_type: "range", include_in_insights: true, recorded_at: Time.zone.local(2026, 2, 6, 8, 0, 0))
        run.create_range_result!(lowest_note: "C3", highest_note: "G4", chest_top_note: "D4", falsetto_top_note: "F4", range_semitones: 19, range_octaves: 1.58)

        get "/api/monthly_logs/comparison", params: { month: "2026-03" }
        assert_response :ok
        data = JSON.parse(@response.body).fetch("data")

        assert_equal 30.0, data.dig("practice_time", "current")
        assert_equal 10.0, data.dig("practice_time", "previous")
        assert_equal 20.0, data.dig("practice_time", "diff")
        assert_equal 200.0, data.dig("practice_time", "pct")
        assert_equal "練習時間合計 ÷ 練習した日数", data.dig("meta", "basis_label")

        change = data.fetch("measurement_changes").find { |item| item["key"] == "falsetto_top_note" }
        assert_not_nil change
        assert_equal "G4", change.dig("current", "display")
        assert_equal "F4", change.dig("previous", "display")
        assert_equal "+2半音", change["diff_display"]
      end
    end

    test "returns nil pct when previous month has no practice days" do
      travel_to Time.zone.local(2026, 3, 20, 9, 0, 0) do
        post "/api/auth/signup", params: {
          email: "monthly-comparison-empty-prev@example.com",
          password: "password123",
          password_confirmation: "password123"
        }
        assert_response :created

        user = User.find_by!(email: "monthly-comparison-empty-prev@example.com")
        user.training_logs.create!(practiced_on: Date.new(2026, 3, 3), duration_min: 24)

        get "/api/monthly_logs/comparison", params: { month: "2026-03" }
        assert_response :ok
        data = JSON.parse(@response.body).fetch("data")

        assert_equal 24.0, data.dig("practice_time", "current")
        assert_nil data.dig("practice_time", "previous")
        assert_nil data.dig("practice_time", "diff")
        assert_nil data.dig("practice_time", "pct")
      end
    end

    test "status treats any improvement as improved and only negative-side micro change as stable" do
      travel_to Time.zone.local(2026, 3, 20, 10, 0, 0) do
        post "/api/auth/signup", params: {
          email: "monthly-comparison-status-threshold@example.com",
          password: "password123",
          password_confirmation: "password123"
        }
        assert_response :created

        user = User.find_by!(email: "monthly-comparison-status-threshold@example.com")
        user.training_logs.create!(practiced_on: Date.new(2026, 3, 3), duration_min: 20)
        user.training_logs.create!(practiced_on: Date.new(2026, 2, 3), duration_min: 20)

        # higher-is-better: +0.5半音（epsilon=1.0未満）でも改善扱い
        run = user.measurement_runs.create!(measurement_type: "range", include_in_insights: true, recorded_at: Time.zone.local(2026, 2, 4, 8, 0, 0))
        run.create_range_result!(lowest_note: "C3", highest_note: "G4", chest_top_note: "D4", falsetto_top_note: "F4", range_semitones: 19, range_octaves: 1.58)
        run = user.measurement_runs.create!(measurement_type: "range", include_in_insights: true, recorded_at: Time.zone.local(2026, 3, 4, 8, 0, 0))
        run.create_range_result!(lowest_note: "C3", highest_note: "G4", chest_top_note: "D4", falsetto_top_note: "F4", range_semitones: 19, range_octaves: 1.58)
        run = user.measurement_runs.create!(measurement_type: "range", include_in_insights: true, recorded_at: Time.zone.local(2026, 3, 5, 8, 0, 0))
        run.create_range_result!(lowest_note: "C3", highest_note: "G#4", chest_top_note: "D4", falsetto_top_note: "F#4", range_semitones: 20, range_octaves: 1.67)

        # lower-is-better: +0.05半音悪化（epsilon=0.1未満）は変化小扱い
        run = user.measurement_runs.create!(measurement_type: "pitch_accuracy", include_in_insights: true, recorded_at: Time.zone.local(2026, 2, 5, 8, 0, 0))
        run.create_pitch_accuracy_result!(avg_cents_error: 15, accuracy_score: 90.0, note_count: 50) # 0.15半音
        run = user.measurement_runs.create!(measurement_type: "pitch_accuracy", include_in_insights: true, recorded_at: Time.zone.local(2026, 3, 5, 8, 0, 0))
        run.create_pitch_accuracy_result!(avg_cents_error: 20, accuracy_score: 89.0, note_count: 50) # 0.20半音

        get "/api/monthly_logs/comparison", params: { month: "2026-03" }
        assert_response :ok
        data = JSON.parse(@response.body).fetch("data")

        falsetto = data.fetch("measurement_changes").find { |item| item["key"] == "falsetto_top_note" }
        assert_equal "improved", falsetto["status"]

        pitch = data.fetch("measurement_changes").find { |item| item["key"] == "pitch_error_semitones" }
        assert_equal "stable", pitch["status"]
        assert_equal "+0.05半音", pitch["diff_display"]
      end
    end
  end
end
