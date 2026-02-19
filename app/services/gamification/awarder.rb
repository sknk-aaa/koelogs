require "set"

module Gamification
  class Awarder
    def self.call(user:, grants:)
      new(user: user).call(grants: grants)
    end

    def initialize(user:)
      @user = user
    end

    def call(grants:)
      xp_earned = apply_grants(grants)
      newly_unlocked = unlock_eligible_badges!
      summary = Progress.summary_for(@user)

      {
        xp_earned: xp_earned,
        unlocked_badges: newly_unlocked,
        total_xp: summary[:total_xp],
        level: summary[:level],
        streak_current_days: summary[:streak_current_days],
        streak_longest_days: summary[:streak_longest_days]
      }
    end

    private

    def apply_grants(grants)
      Array(grants).sum do |grant|
        rule_key = grant[:rule_key].to_s
        points = BadgeCatalog::XP_RULE_POINTS[rule_key]
        next 0 unless points

        grant_xp_once(
          rule_key: rule_key,
          source_type: grant[:source_type].to_s,
          source_id: grant[:source_id].to_i,
          points: points
        )
      end
    end

    def grant_xp_once(rule_key:, source_type:, source_id:, points:)
      @user.xp_events.create!(
        rule_key: rule_key,
        source_type: source_type,
        source_id: source_id,
        points: points
      )
      points
    rescue ActiveRecord::RecordNotUnique, ActiveRecord::RecordInvalid
      0
    end

    def unlock_eligible_badges!
      before_keys = @user.user_badges.pluck(:badge_key).to_set
      summary_before_unlock = Progress.summary_for(@user)
      unlockable_keys = summary_before_unlock[:badges]
        .select { |b| !b[:unlocked] && b[:progress_current] >= b[:progress_required] }
        .map { |b| b[:key] }

      unlockable_keys.each do |key|
        @user.user_badges.create!(badge_key: key, unlocked_at: Time.current)
      rescue ActiveRecord::RecordNotUnique, ActiveRecord::RecordInvalid
        next
      end

      summary_after_unlock = Progress.summary_for(@user)
      summary_after_unlock[:badges]
        .select { |b| b[:unlocked] && !before_keys.include?(b[:key]) }
        .map { |b| { key: b[:key], name: b[:name], icon_path: b[:icon_path] } }
    end
  end
end
