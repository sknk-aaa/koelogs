module Gamification
  module BadgeCatalog
    Badge = Struct.new(:key, :name, :description, :metric_key, :required, keyword_init: true) do
      def icon_path
        "/badges/#{key}.svg"
      end
    end

    BADGES = [
      Badge.new(
        key: "first_log",
        name: "First Log",
        description: "はじめて日ログを保存",
        metric_key: :total_practice_days,
        required: 1
      ),
      Badge.new(
        key: "streak_3",
        name: "3-Day Streak",
        description: "3日連続で記録を継続",
        metric_key: :longest_streak_days,
        required: 3
      ),
      Badge.new(
        key: "streak_7",
        name: "7-Day Streak",
        description: "7日連続で記録を継続",
        metric_key: :longest_streak_days,
        required: 7
      ),
      Badge.new(
        key: "streak_30",
        name: "30-Day Streak",
        description: "30日連続で記録を継続",
        metric_key: :longest_streak_days,
        required: 30
      ),
      Badge.new(
        key: "xp_500",
        name: "XP 500",
        description: "累計XP 500到達",
        metric_key: :total_xp,
        required: 500
      ),
      Badge.new(
        key: "xp_1000",
        name: "XP 1000",
        description: "累計XP 1000到達",
        metric_key: :total_xp,
        required: 1000
      ),
      Badge.new(
        key: "xp_2000",
        name: "XP 2000",
        description: "累計XP 2000到達",
        metric_key: :total_xp,
        required: 2000
      ),
      Badge.new(
        key: "measurement_master",
        name: "Measurement Completer",
        description: "4種類すべての測定を達成",
        metric_key: :measurement_types_completed_count,
        required: 4
      ),
      Badge.new(
        key: "ai_user_5",
        name: "First AI",
        description: "AI提案を5回生成",
        metric_key: :ai_recommendations_count,
        required: 5
      ),
      Badge.new(
        key: "ai_user_30",
        name: "AI User",
        description: "AI提案を30回生成",
        metric_key: :ai_recommendations_count,
        required: 30
      ),
      Badge.new(
        key: "ai_user_50",
        name: "AI Partner",
        description: "AI提案を50回生成",
        metric_key: :ai_recommendations_count,
        required: 50
      ),
      Badge.new(
        key: "ai_user_100",
        name: "AI Master",
        description: "AI提案を100回生成",
        metric_key: :ai_recommendations_count,
        required: 100
      ),
      Badge.new(
        key: "community_post_1",
        name: "First Voice",
        description: "公開投稿を1回作成",
        metric_key: :community_published_posts_count,
        required: 1
      ),
      Badge.new(
        key: "community_post_5",
        name: "Active Contributor",
        description: "公開投稿を5回作成",
        metric_key: :community_published_posts_count,
        required: 5
      ),
      Badge.new(
        key: "community_post_20",
        name: "Community Master",
        description: "公開投稿を20回作成",
        metric_key: :community_published_posts_count,
        required: 20
      ),
      Badge.new(
        key: "monthly_memo_streak_1",
        name: "First Month Log",
        description: "月振り返りメモを1か月連続で保存",
        metric_key: :longest_monthly_log_streak_months,
        required: 1
      ),
      Badge.new(
        key: "monthly_memo_streak_3",
        name: "3-Month Streak",
        description: "月振り返りメモを3か月連続で保存",
        metric_key: :longest_monthly_log_streak_months,
        required: 3
      ),
      Badge.new(
        key: "monthly_memo_streak_6",
        name: "6-Month Streak",
        description: "月振り返りメモを6か月連続で保存",
        metric_key: :longest_monthly_log_streak_months,
        required: 6
      ),
      Badge.new(
        key: "monthly_memo_streak_12",
        name: "12-Month Streak",
        description: "月振り返りメモを12か月連続で保存",
        metric_key: :longest_monthly_log_streak_months,
        required: 12
      ),
      Badge.new(
        key: "ai_contribution_1",
        name: "First AI Contribution",
        description: "投稿がAI根拠に1回採用",
        metric_key: :ai_contribution_count,
        required: 1
      ),
      Badge.new(
        key: "ai_contribution_5",
        name: "AI Supporter",
        description: "投稿がAI根拠に5回採用",
        metric_key: :ai_contribution_count,
        required: 5
      ),
      Badge.new(
        key: "ai_contribution_20",
        name: "AI Contributor",
        description: "投稿がAI根拠に20回採用",
        metric_key: :ai_contribution_count,
        required: 20
      ),
      Badge.new(
        key: "ai_contribution_50",
        name: "AI Contributor+",
        description: "投稿がAI根拠に50回採用",
        metric_key: :ai_contribution_count,
        required: 50
      ),
      Badge.new(
        key: "ai_contribution_100",
        name: "AI Influencer",
        description: "投稿がAI根拠に100回採用",
        metric_key: :ai_contribution_count,
        required: 100
      )
    ].freeze

    XP_RULE_POINTS = {
      "training_log_saved" => 10,
      "monthly_log_saved" => 20,
      "measurement_saved" => 10,
      "ai_recommendation_generated" => 15,
      "community_post_published" => 20
    }.freeze
  end
end
