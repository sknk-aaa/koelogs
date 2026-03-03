module Api
  class MissionsController < ApplicationController
    before_action :require_login!

    def show
      today = Date.current
      progress = Gamification::Progress.summary_for(current_user)

      beginner = [
        {
          key: "beginner_daily_log",
          title: "日ログを記録しよう",
          description: "まずは日ログを1件保存して、改善サイクルを開始しましょう。",
          to: "/log?mode=day&date=#{today.iso8601}&missionGuide=beginner_daily_log",
          done: current_user.training_logs.exists?
        },
        {
          key: "beginner_goal",
          title: "目標を設定しよう",
          description: "目標を設定すると、AIおすすめがあなた向けに最適化されます。",
          to: "/log?mode=day&date=#{today.iso8601}&missionGuide=beginner_goal",
          done: current_user.goal_text.present?
        },
        {
          key: "beginner_ai_customization",
          title: "AIカスタム指示を設定しよう",
          description: "AIカスタム指示か改善したい項目を設定して、提案を自分向けにしましょう。",
          to: "/settings/ai",
          done: ai_customization_configured?
        },
        {
          key: "beginner_measurement",
          title: "測定を1回やってみよう",
          description: "トレーニング画面でどれか1つの測定を実行しましょう。",
          to: "/training",
          done: current_user.measurement_runs.exists?
        },
        {
          key: "beginner_ai",
          title: "AIおすすめを使ってみよう",
          description: "日ログ画面でAI提案を1回生成してみましょう。",
          to: "/log?mode=day&date=#{today.iso8601}&missionGuide=beginner_ai",
          done: current_user.ai_recommendations.exists?
        }
      ]

      daily = [
        {
          key: "daily_training_log",
          title: "日ログを記録しよう",
          description: "今日の練習を1件保存しましょう。",
          to: "/log/new?date=#{today.iso8601}",
          done: current_user.training_logs.where(practiced_on: today).exists?
        },
        {
          key: "daily_measurement",
          title: "何かしらの測定をしよう",
          description: "今日の測定を1回以上実行しましょう。",
          to: "/training",
          done: current_user.measurement_runs.where(recorded_at: today.beginning_of_day..today.end_of_day).exists?
        },
        {
          key: "daily_ai_recommendation",
          title: "AI生成をしてみよう",
          description: "今日の日付でAIおすすめを1回生成しましょう。",
          to: "/log?mode=day&date=#{today.iso8601}",
          done: current_user.ai_recommendations.where(generated_for_date: today).exists?
        }
      ]

      render json: {
        data: {
          server_today: today.iso8601,
          beginner: beginner,
          daily: daily,
          continuous: progress[:badges]
        }
      }, status: :ok
    end

    private

    def ai_customization_configured?
      current_user.ai_custom_instructions.present? ||
        Array(current_user.ai_improvement_tags).any? ||
        long_term_profile_overrides_present?
    end

    def long_term_profile_overrides_present?
      profile = current_user.ai_user_profile
      return false unless profile&.user_overrides.is_a?(Hash)

      profile.user_overrides.values.any? do |value|
        case value
        when String
          value.strip.present?
        when Array
          value.any?(&:present?)
        when Hash
          value.present?
        else
          value.present?
        end
      end
    end
  end
end
