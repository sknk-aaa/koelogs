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
          to: "/log/new?date=#{today.iso8601}",
          done: current_user.training_logs.exists?
        },
        {
          key: "beginner_menu",
          title: "メニュー登録をしてみよう",
          description: "練習メニューを登録して、記録を整理しやすくしましょう。",
          to: "/log/new?date=#{today.iso8601}",
          done: training_menu_registered?
        },
        {
          key: "beginner_ai",
          title: "AIおすすめを使ってみよう",
          description: "日ログ画面でAI提案を1回生成してみましょう。",
          to: "/log?mode=day&date=#{today.iso8601}",
          done: current_user.ai_recommendations.exists?
        },
        {
          key: "beginner_measurement",
          title: "測定を1回やってみよう",
          description: "トレーニング画面でどれか1つの測定を実行しましょう。",
          to: "/training",
          done: current_user.measurement_runs.exists?
        },
        {
          key: "beginner_display_name",
          title: "名前を登録しよう",
          description: "表示名を登録して、プロフィールを整えましょう。",
          to: "/profile",
          done: current_user.display_name.present?
        },
        {
          key: "beginner_community_post",
          title: "コミュニティで投稿してみよう",
          description: "練習メニューの効果を投稿して、集合知に参加しましょう。",
          to: "/community",
          done: current_user.community_posts.exists?
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

    def training_menu_registered?
      scope = current_user.training_menus
      return true if scope.where(archived: false).exists?

      scope.exists?
    end
  end
end
