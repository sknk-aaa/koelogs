module Api
  class MeController < ApplicationController
    before_action :require_login!

    def show
      render json: serialize_me(current_user)
    end

    def update
      # 既存の display_name 更新仕様を壊さず、goal_text も受け取れるようにする
      permitted = params.fetch(:me, {}).permit(
        :display_name,
        :goal_text,
        :ai_custom_instructions,
        :public_profile_enabled,
        :public_goal_enabled,
        :ranking_participation_enabled,
        :current_password,
        :password,
        :password_confirmation,
        :avatar_image_url,
        :avatar_icon,
        ai_improvement_tags: []
      )

      current_password = permitted.delete(:current_password).to_s
      password = permitted[:password].to_s

      if password.present? && !current_user.authenticate(current_password)
        return render json: { error: [ "現在のパスワードが正しくありません" ] }, status: :unprocessable_entity
      end

      if password.blank?
        permitted.delete(:password)
        permitted.delete(:password_confirmation)
      end

      if current_user.update(permitted)
        render json: serialize_me(current_user)
      else
        render json: { error: current_user.errors.full_messages }, status: :unprocessable_entity
      end
    end

    private

    def serialize_me(user)
      {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar_icon: user.avatar_icon,
        avatar_image_url: user.avatar_image_url,
        goal_text: user.goal_text,
        ai_custom_instructions: user.ai_custom_instructions,
        ai_improvement_tags: Array(user.ai_improvement_tags),
        public_profile_enabled: user.public_profile_enabled,
        public_goal_enabled: user.public_goal_enabled,
        ranking_participation_enabled: user.ranking_participation_enabled,
        ai_contribution_count: user.ai_contribution_events.distinct.count(:ai_recommendation_id),
        created_at: user.created_at&.iso8601
      }
    end
  end
end
