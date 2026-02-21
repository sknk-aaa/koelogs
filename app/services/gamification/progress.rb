module Gamification
  class Progress
    LEVEL_XP_FACTOR = 25

    class << self
      def summary_for(user)
        metrics = metrics_for(user)
        badges = badge_progress_for(user, metrics: metrics)

        total_xp = metrics[:total_xp]
        level = level_for_xp(total_xp)
        current_level_total_xp = total_xp_for_level(level)
        next_level_total_xp = total_xp_for_level(level + 1)
        xp_to_next_level = [ next_level_total_xp - total_xp, 0 ].max

        {
          total_xp: total_xp,
          level: level,
          current_level_total_xp: current_level_total_xp,
          next_level_total_xp: next_level_total_xp,
          xp_to_next_level: xp_to_next_level,
          streak_current_days: metrics[:current_streak_days],
          streak_longest_days: metrics[:longest_streak_days],
          analysis_sessions_count: metrics[:analysis_sessions_count],
          ai_recommendations_count: metrics[:ai_recommendations_count],
          badge_unlocked_count: badges.count { |b| b[:unlocked] },
          badge_total_count: badges.size,
          next_badge: badges.find { |b| !b[:unlocked] },
          badges: badges
        }
      end

      def metrics_for(user)
        practice_dates = user.training_logs.pluck(:practiced_on).compact.uniq
        streaks = streak_metrics(practice_dates)

        {
          total_practice_days: practice_dates.size,
          current_streak_days: streaks[:current_days],
          longest_streak_days: streaks[:longest_days],
          total_xp: user.xp_events.sum(:points).to_i,
          analysis_sessions_count: user.analysis_sessions.count,
          ai_recommendations_count: user.ai_recommendations.count
        }
      end

      def level_for_xp(total_xp)
        return 1 if total_xp.to_i <= 0

        Math.sqrt(total_xp.to_f / LEVEL_XP_FACTOR).floor + 1
      end

      def total_xp_for_level(level)
        lv = [ level.to_i, 1 ].max
        ((lv - 1)**2) * LEVEL_XP_FACTOR
      end

      def streak_metrics(dates)
        uniq_sorted = Array(dates).map(&:to_date).uniq.sort
        return { current_days: 0, longest_days: 0 } if uniq_sorted.empty?

        longest = 1
        run = 1
        (1...uniq_sorted.length).each do |i|
          if uniq_sorted[i] == uniq_sorted[i - 1] + 1
            run += 1
          else
            longest = [ longest, run ].max
            run = 1
          end
        end
        longest = [ longest, run ].max

        date_set = uniq_sorted.each_with_object({}) { |dt, h| h[dt] = true }
        current = 0
        d = Date.current
        while date_set[d]
          current += 1
          d -= 1
        end

        { current_days: current, longest_days: longest }
      end

      def badge_progress_for(user, metrics: nil)
        active_metrics = metrics || metrics_for(user)
        unlocked_map = user.user_badges.index_by(&:badge_key)

        BadgeCatalog::BADGES.map do |badge|
          raw_current = metric_value(active_metrics, badge.metric_key)
          current = [ raw_current, badge.required ].min
          unlocked = unlocked_map[badge.key]

          {
            key: badge.key,
            name: badge.name,
            description: badge.description,
            icon_path: badge.icon_path,
            unlocked: unlocked.present?,
            unlocked_at: unlocked&.unlocked_at&.iso8601,
            progress_current: current,
            progress_required: badge.required
          }
        end
      end

      private

      def metric_value(metrics, key)
        case key
        when :total_practice_days then metrics[:total_practice_days].to_i
        when :longest_streak_days then metrics[:longest_streak_days].to_i
        when :total_xp then metrics[:total_xp].to_i
        else 0
        end
      end
    end
  end
end
