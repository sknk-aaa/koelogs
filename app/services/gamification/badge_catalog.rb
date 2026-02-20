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
        name: "First Record",
        description: "はじめて記録を保存",
        metric_key: :total_practice_days,
        required: 1
      ),
      Badge.new(
        key: "streak_3",
        name: "3-Day Streak",
        description: "3日連続で記録",
        metric_key: :longest_streak_days,
        required: 3
      ),
      Badge.new(
        key: "streak_7",
        name: "7-Day Streak",
        description: "7日連続で記録",
        metric_key: :longest_streak_days,
        required: 7
      ),
      Badge.new(
        key: "streak_30",
        name: "30-Day Streak",
        description: "30日連続で記録",
        metric_key: :longest_streak_days,
        required: 30
      ),
      Badge.new(
        key: "weekly_3",
        name: "Weekly Reflector",
        description: "週振り返りを3回保存",
        metric_key: :weekly_log_count,
        required: 3
      ),
      Badge.new(
        key: "xp_500",
        name: "XP 500",
        description: "累計XP 500到達",
        metric_key: :total_xp,
        required: 500
      )
    ].freeze

    XP_RULE_POINTS = {
      "training_log_saved" => 10,
      "training_log_feedback_added" => 5,
      "weekly_log_saved" => 20
    }.freeze
  end
end
