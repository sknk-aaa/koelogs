module Api
  class MissionsController < ApplicationController
    before_action :require_login!

    def show
      today = Date.current
      progress = Gamification::Progress.summary_for(current_user)

      beginner = [
        {
          key: "beginner_ai_customization",
          title: "AIカスタム指示を設定しよう",
          description: "AIカスタム指示か改善したい項目を設定して、提案を自分向けにしましょう。",
          to: "/settings/ai",
          done: ai_customization_configured?
        },
        {
          key: "beginner_community",
          title: "参考になった投稿を保存してみよう",
          description: "コミュニティで気になった投稿に「参考になった」をつけてみましょう。",
          to: "/community",
          done: community_started?
        },
        {
          key: "beginner_measurement",
          title: "測定を1回やってみよう",
          description: "ログページのトレーニング欄から、どれか1つの測定を実行しましょう。",
          to: "/log?mode=day&date=#{today.iso8601}#training",
          done: current_user.measurement_runs.exists?
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
        Ai::ResponseStylePreferences.customized?(current_user.ai_response_style_prefs) ||
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

    def community_started?
      current_user.community_post_favorites.exists?
    end
  end
end
