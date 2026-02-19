module Api
  class CommunityRankingsController < ApplicationController
    # GET /api/community/rankings
    # public page (login optional)
    def show
      users = User.where(ranking_participation_enabled: true).select(:id, :display_name, :avatar_icon, :avatar_image_url)
      user_ids = users.map(&:id)
      user_by_id = users.index_by(&:id)
      from = Date.current - 6
      to = Date.current

      ai_contrib_count_by_user = distinct_ai_contribution_count_by_user(user_ids)
      weekly_duration_by_user = TrainingLog.where(user_id: user_ids, practiced_on: from..to).group(:user_id).sum(:duration_min)

      level_by_user = {}
      streak_by_user = {}
      users.each do |user|
        progress = Gamification::Progress.summary_for(user)
        level_by_user[user.id] = progress[:level].to_i
        streak_by_user[user.id] = progress[:streak_current_days].to_i
      end

      render json: {
        data: {
          ai_contributions: top_entries(users, user_by_id, level_by_user, ai_contrib_count_by_user),
          streak_days: top_entries(users, user_by_id, level_by_user, streak_by_user),
          weekly_duration_min: top_entries(users, user_by_id, level_by_user, weekly_duration_by_user)
        }
      }, status: :ok
    end

    private

    def distinct_ai_contribution_count_by_user(user_ids)
      return {} if user_ids.empty?

      pairs = AiContributionEvent.where(user_id: user_ids).pluck(:user_id, :ai_recommendation_id).uniq
      pairs.each_with_object(Hash.new(0)) do |(user_id, _recommendation_id), memo|
        memo[user_id] += 1
      end
    end

    def top_entries(users, user_by_id, level_by_user, value_by_user)
      users
        .map do |user|
          v = value_by_user[user.id].to_i
          next if v <= 0

          u = user_by_id[user.id]
          {
            user_id: u.id,
            display_name: u.display_name.presence || "User #{u.id}",
            avatar_icon: u.avatar_icon,
            avatar_image_url: u.avatar_image_url,
            level: level_by_user[u.id].to_i,
            value: v
          }
        end
        .compact
        .sort_by { |e| [ -e[:value], e[:user_id] ] }
    end
  end
end
