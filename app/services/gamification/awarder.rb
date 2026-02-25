require "set"

module Gamification
  class Awarder
    def self.call(user:, grants:, metric_hints: nil)
      new(user: user).call(grants: grants, metric_hints: metric_hints)
    end

    def initialize(user:)
      @user = user
    end

    def call(grants:, metric_hints: nil)
      xp_earned = apply_grants(grants)
      allowed_badge_keys = allowed_badge_keys_for(grants, metric_hints: metric_hints)
      newly_unlocked = unlock_eligible_badges!(allowed_badge_keys: allowed_badge_keys)
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

    def allowed_badge_keys_for(grants, metric_hints: nil)
      keys = Set.new

      Array(grants).each do |grant|
        rule_key = grant[:rule_key].to_s
        keys.merge(badge_keys_for_rule(rule_key))
      end

      Array(metric_hints).map(&:to_sym).each do |hint|
        keys.merge(badge_keys_for_metric_hint(hint))
      end

      keys.to_a
    end

    def badge_keys_for_rule(rule_key)
      case rule_key
      when "training_log_saved"
        [ "first_log", "streak_3", "streak_7", "streak_30", "xp_500", "xp_1000", "xp_2000" ]
      when "training_log_feedback_added"
        [ "xp_500", "xp_1000", "xp_2000" ]
      when "monthly_log_saved"
        [ "monthly_memo_streak_1", "monthly_memo_streak_3", "monthly_memo_streak_6", "monthly_memo_streak_12", "xp_500", "xp_1000", "xp_2000" ]
      when "measurement_saved"
        [ "measurement_master", "xp_500", "xp_1000", "xp_2000" ]
      when "ai_recommendation_generated"
        [ "ai_user_5", "ai_user_30", "ai_user_50", "ai_user_100", "xp_500", "xp_1000", "xp_2000" ]
      when "community_post_published"
        [ "community_post_1", "community_post_5", "community_post_20", "xp_500", "xp_1000", "xp_2000" ]
      else
        []
      end
    end

    def badge_keys_for_metric_hint(metric_hint)
      case metric_hint.to_sym
      when :ai_contribution_count
        [ "ai_contribution_1", "ai_contribution_5", "ai_contribution_20", "ai_contribution_50", "ai_contribution_100" ]
      else
        []
      end
    end

    def unlock_eligible_badges!(allowed_badge_keys:)
      allowed = Set.new(Array(allowed_badge_keys).map(&:to_s))
      return [] if allowed.empty?

      before_keys = @user.user_badges.pluck(:badge_key).to_set
      summary_before_unlock = Progress.summary_for(@user)
      unlockable_keys = summary_before_unlock[:badges]
        .select do |b|
          allowed.include?(b[:key].to_s) &&
            !b[:unlocked] &&
            b[:progress_current] >= b[:progress_required]
        end
        .map { |b| b[:key] }

      unlockable_keys.each do |key|
        @user.user_badges.create!(badge_key: key, unlocked_at: Time.current)
      rescue ActiveRecord::RecordNotUnique, ActiveRecord::RecordInvalid
        next
      end

      unlockable_keys
        .reject { |key| before_keys.include?(key) }
        .map do |key|
          badge = BadgeCatalog::BADGES.find { |b| b.key == key }
          next nil unless badge

          { key: badge.key, name: badge.name, icon_path: badge.icon_path }
        end
        .compact
    end
  end
end
