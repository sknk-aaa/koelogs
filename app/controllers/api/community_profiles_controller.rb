module Api
  class CommunityProfilesController < ApplicationController
    # GET /api/community/profiles/:id
    # public page (login optional)
    def show
      user = User.find_by(id: params[:id])
      return render json: { error: "not_found" }, status: :not_found if user.nil? || !user.public_profile_enabled

      progress = Gamification::Progress.summary_for(user)
      render json: {
        data: {
          user_id: user.id,
          display_name: user.display_name.presence || "User #{user.id}",
          avatar_icon: user.avatar_icon,
          avatar_image_url: user.avatar_image_url,
          level: progress[:level],
          streak_current_days: progress[:streak_current_days],
          total_xp: progress[:total_xp],
          ai_contribution_count: user.ai_contribution_events.distinct.count(:ai_recommendation_id),
          badges: progress[:badges].select { |b| b[:unlocked] }.map { |b| b.slice(:key, :name, :icon_path) },
          goal_text: user.public_goal_enabled ? user.goal_text : nil
        }
      }, status: :ok
    end
  end
end
